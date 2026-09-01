import { NextResponse } from 'next/server';
import { getDbPool } from '../../../../lib/mysql';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const secret = process.env.MAXIMO_WEBHOOK_SECRET?.trim();
    if (secret && request.headers.get('x-maximo-webhook-secret') !== secret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: webhook secret does not match.' }, { status: 401 });
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ ok: false, error: 'Request body is not valid JSON.' }, { status: 400 }); }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: 'Expected a JSON object.' }, { status: 400 });
    }

    const receivedAt = new Date().toISOString();
    const [result] = await getDbPool().execute(
      'INSERT INTO maximo_events (received_at, payload) VALUES (?, ?)',
      [receivedAt, JSON.stringify({ ...(body as Record<string, unknown>), receivedAt })]
    );

    const insertId = 'insertId' in result ? result.insertId : null;
    return NextResponse.json({ ok: true, receivedAt, id: insertId });
  } catch (error) {
    console.error('webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    const missing = /doesn't exist|does not exist|ER_NO_SUCH_TABLE/i.test(message);
    return NextResponse.json({
      ok: false,
      persistence: missing ? 'not-configured' : 'mysql-error',
      error: missing ? 'MySQL is reachable, but maximo_events has not been created yet. No outbound event was stored.' : `Unable to store outbound event: ${message}`,
    }, { status: 503 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Maximo outbound webhook is ready. Create the MySQL event table before enabling persistence.' });
}
