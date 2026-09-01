import { NextResponse } from 'next/server';
import { getDbPool } from '../../../lib/mysql';

export const dynamic = 'force-dynamic';

type EventRow = { id?: number; received_at?: string | Date; payload?: unknown };

function parsePayload(payload: unknown) {
  if (payload && typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch { return { rawPayload: payload }; }
  }
  return {};
}

export async function GET() {
  try {
    const [rows] = await getDbPool().query<EventRow[]>(
      'SELECT id, received_at, payload FROM maximo_events ORDER BY id DESC LIMIT 1'
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: true, event: null, receivedAt: null });
    return NextResponse.json({
      ok: true,
      event: parsePayload(row.payload),
      receivedAt: row.received_at ? new Date(row.received_at).toISOString() : null,
      id: row.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    const missing = /doesn't exist|does not exist|ER_NO_SUCH_TABLE/i.test(message);
    return NextResponse.json({
      ok: false,
      event: null,
      persistence: missing ? 'not-configured' : 'mysql-error',
      error: missing ? 'MySQL is reachable, but the outbound event table has not been created yet.' : `Unable to read outbound event: ${message}`,
    }, { status: 503 });
  }
}
