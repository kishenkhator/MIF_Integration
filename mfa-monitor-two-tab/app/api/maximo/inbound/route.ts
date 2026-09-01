import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getConfig() {
  const baseUrl = process.env.MAXIMO_BASE_URL;
  const apiKey = process.env.MAXIMO_API_KEY;
  const defaultSite = process.env.MAXIMO_DEFAULT_SITE || 'AVIATION';
  const defaultOrg = process.env.MAXIMO_DEFAULT_ORG || 'EAGLE';

  if (!baseUrl || !apiKey) {
    throw new Error('MAXIMO_BASE_URL or MAXIMO_API_KEY is not configured in .env.local.');
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, defaultSite, defaultOrg };
}

async function maximoFetch(url: string, init: RequestInit, apiKey: string) {
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), apikey: apiKey },
    cache: 'no-store',
  });
}

function recordFromMaximo(record: Record<string, unknown>) {
  return {
    ...record,
    workrequired: record.workrequired ?? record.description,
    parentwo: record.parentwo ?? record.parent,
  };
}

export async function GET(request: Request) {
  try {
    const { baseUrl, apiKey, defaultSite } = getConfig();
    const { searchParams } = new URL(request.url);
    const wonum = searchParams.get('wonum');
    const siteid = searchParams.get('siteid') || defaultSite;

    if (!wonum) {
      return NextResponse.json({ ok: false, error: 'wonum is required.' }, { status: 400 });
    }

    const where = encodeURIComponent(`wonum="${wonum}" and siteid="${siteid}"`);
    const select = encodeURIComponent('*');
    const response = await maximoFetch(
      `${baseUrl}?lean=1&oslc.where=${where}&oslc.select=${select}`,
      { method: 'GET' },
      apiKey
    );
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, status: response.status, error: text || 'Maximo retrieve failed.' },
        { status: response.status }
      );
    }

    let json: { member?: unknown[] };
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, error: 'Maximo returned a non-JSON response.' }, { status: 502 });
    }

    const records = Array.isArray(json.member) ? json.member : [];
    if (!records[0] || typeof records[0] !== 'object') {
      return NextResponse.json(
        { ok: false, error: `No Work Order found for ${wonum} at ${siteid}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, status: response.status, record: recordFromMaximo(records[0] as Record<string, unknown>) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { baseUrl, apiKey, defaultSite, defaultOrg } = getConfig();
    const body = await request.json();
    const mode = body?.mode;

    if (mode === 'create') {
      const payload: Record<string, unknown> = {
        siteid: body.siteid || defaultSite,
        orgid: body.orgid || defaultOrg,
        description: body.workrequired || body.description || '',
        workrequired: body.workrequired || undefined,
        worktype: body.worktype || undefined,
        status: body.status || undefined,
        workperformed: body.workperformed || undefined,
        parent: body.parentwo || body.parent || undefined,
        statuscode: body.statuscode || undefined,
        failureclass: body.failureclass || undefined,
        customer: body.customer || undefined,
        reporteddate: body.reporteddate || undefined,
        reportedby: body.reportedby || undefined,
      };

      const response = await maximoFetch(
        `${baseUrl}?lean=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        apiKey
      );
      const text = await response.text();

      if (!response.ok) {
        return NextResponse.json(
          { ok: false, status: response.status, error: text || 'Maximo create failed.' },
          { status: response.status }
        );
      }

      let record: unknown = null;
      try { record = text ? JSON.parse(text) : null; } catch { /* Maximo may return an empty body. */ }

      return NextResponse.json({ ok: true, status: response.status, record });
    }

    if (mode === 'update') {
      const wonum = body.wonum;
      const siteid = body.siteid || defaultSite;

      if (!wonum) {
        return NextResponse.json({ ok: false, error: 'Work Order is required for update.' }, { status: 400 });
      }

      const where = encodeURIComponent(`wonum="${wonum}" and siteid="${siteid}"`);
      const lookup = await maximoFetch(
        `${baseUrl}?lean=1&oslc.where=${where}&oslc.select=wonum,href`,
        { method: 'GET' },
        apiKey
      );
      const lookupText = await lookup.text();

      if (!lookup.ok) {
        return NextResponse.json(
          { ok: false, status: lookup.status, error: lookupText || 'Maximo lookup before update failed.' },
          { status: lookup.status }
        );
      }

      let lookupJson: { member?: Array<{ href?: string }> };
      try { lookupJson = JSON.parse(lookupText); }
      catch { return NextResponse.json({ ok: false, error: 'Maximo returned a non-JSON lookup response.' }, { status: 502 }); }

      const href = lookupJson.member?.[0]?.href;
      if (!href) {
        return NextResponse.json(
          { ok: false, error: `No Work Order found for ${wonum} at ${siteid}.` },
          { status: 404 }
        );
      }

      const updatePayload: Record<string, unknown> = {};
      if (body.workrequired !== undefined) updatePayload.description = body.workrequired;
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.worktype !== undefined) updatePayload.worktype = body.worktype;
      if (body.workperformed !== undefined) updatePayload.workperformed = body.workperformed;
      if (body.parentwo !== undefined) updatePayload.parent = body.parentwo;
      if (body.statuscode !== undefined) updatePayload.statuscode = body.statuscode;
      if (body.failureclass !== undefined) updatePayload.failureclass = body.failureclass;
      if (body.customer !== undefined) updatePayload.customer = body.customer;
      if (body.reporteddate !== undefined) updatePayload.reporteddate = body.reporteddate;
      if (body.reportedby !== undefined) updatePayload.reportedby = body.reportedby;

      const response = await maximoFetch(
        `${href}?lean=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-method-override': 'PATCH' },
          body: JSON.stringify(updatePayload),
        },
        apiKey
      );
      const text = await response.text();

      if (!response.ok) {
        return NextResponse.json(
          { ok: false, status: response.status, error: text || 'Maximo update failed.' },
          { status: response.status }
        );
      }

      return NextResponse.json({ ok: true, status: response.status, wonum, href });
    }

    return NextResponse.json({ ok: false, error: 'mode must be "create" or "update".' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
