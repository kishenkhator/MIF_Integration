import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Configure these two in Vercel -> Settings -> Environment Variables.
// MAXIMO_BASE_URL example: https://ws1.manage.inst1.apps.ocp2.rnsmas2.lab/maximo/api/os/mif_workorder
// MAXIMO_API_KEY: the same value used as the 'apikey' header in your Postman collection.

function getConfig() {
  const baseUrl = process.env.MAXIMO_BASE_URL;
  const apiKey = process.env.MAXIMO_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('MAXIMO_BASE_URL or MAXIMO_API_KEY is not configured in Vercel environment variables.');
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

async function maximoFetch(url: string, init: RequestInit, apiKey: string) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      apikey: apiKey,
    },
    cache: 'no-store',
  });
  return res;
}

// GET /api/maximo/inbound?wonum=1090&siteid=AVIATION
export async function GET(request: Request) {
  try {
    const { baseUrl, apiKey } = getConfig();
    const { searchParams } = new URL(request.url);
    const wonum = searchParams.get('wonum');
    const siteid = searchParams.get('siteid') || 'AVIATION';

    if (!wonum) {
      return NextResponse.json({ ok: false, error: 'wonum query parameter is required' }, { status: 400 });
    }

    const where = encodeURIComponent(`wonum="${wonum}" and siteid="${siteid}"`);
    const select = encodeURIComponent('wonum,description,siteid,orgid,worktype,status,href');
    const url = `${baseUrl}?lean=1&oslc.where=${where}&oslc.select=${select}`;

    const res = await maximoFetch(url, { method: 'GET' }, apiKey);
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: text || 'Maximo GET failed' }, { status: res.status });
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, error: 'Maximo returned non-JSON response', raw: text }, { status: 502 });
    }

    const records = (json as { member?: unknown[] })?.member ?? [];
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ ok: false, error: `No Work Order found for wonum=${wonum} siteid=${siteid}` }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record: records[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/maximo/inbound
// body: { mode: "create", siteid, orgid, description, worktype, status }
// body: { mode: "update", wonum, siteid, description, worktype, status }  (only changed fields needed besides wonum/siteid)
export async function POST(request: Request) {
  try {
    const { baseUrl, apiKey } = getConfig();
    const body = await request.json();
    const mode = body?.mode;

    if (mode === 'create') {
      const payload = {
        siteid: body.siteid || 'AVIATION',
        orgid: body.orgid || 'EAGLE',
        description: body.description || '',
        worktype: body.worktype || 'CM',
        status: body.status || undefined,
      };
      const url = `${baseUrl}?lean=1`;
      const res = await maximoFetch(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        apiKey
      );
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json({ ok: false, status: res.status, error: text || 'Maximo create failed' }, { status: res.status });
      }
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* some create responses are empty */ }
      return NextResponse.json({ ok: true, status: res.status, record: json });
    }

    if (mode === 'update') {
      const wonum = body.wonum;
      const siteid = body.siteid || 'AVIATION';
      if (!wonum) {
        return NextResponse.json({ ok: false, error: 'wonum is required for update' }, { status: 400 });
      }

      // Step 1: locate the record's href
      const where = encodeURIComponent(`wonum="${wonum}" and siteid="${siteid}"`);
      const select = encodeURIComponent('wonum,href');
      const lookupUrl = `${baseUrl}?lean=1&oslc.where=${where}&oslc.select=${select}`;
      const lookupRes = await maximoFetch(lookupUrl, { method: 'GET' }, apiKey);
      const lookupText = await lookupRes.text();

      if (!lookupRes.ok) {
        return NextResponse.json({ ok: false, status: lookupRes.status, error: lookupText || 'Lookup before update failed' }, { status: lookupRes.status });
      }

      let lookupJson: { member?: { href?: string }[] };
      try {
        lookupJson = JSON.parse(lookupText);
      } catch {
        return NextResponse.json({ ok: false, error: 'Maximo returned non-JSON response during lookup' }, { status: 502 });
      }

      const href = lookupJson?.member?.[0]?.href;
      if (!href) {
        return NextResponse.json({ ok: false, error: `No Work Order found for wonum=${wonum} siteid=${siteid}` }, { status: 404 });
      }

      // Step 2: POST the update to that exact href with the override header
      const updatePayload: Record<string, unknown> = {};
      if (body.description !== undefined) updatePayload.description = body.description;
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.worktype !== undefined) updatePayload.worktype = body.worktype;

      const updateUrl = `${href}?lean=1`;
      const updateRes = await maximoFetch(
        updateUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-method-override': 'PATCH',
          },
          body: JSON.stringify(updatePayload),
        },
        apiKey
      );
      const updateText = await updateRes.text();

      if (!updateRes.ok) {
        return NextResponse.json({ ok: false, status: updateRes.status, error: updateText || 'Maximo update failed' }, { status: updateRes.status });
      }

      return NextResponse.json({ ok: true, status: updateRes.status, wonum, href });
    }

    return NextResponse.json({ ok: false, error: 'mode must be "create" or "update"' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
