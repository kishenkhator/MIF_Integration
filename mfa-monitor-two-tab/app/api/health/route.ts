import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '../../../lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const database = await checkDatabaseConnection();
    return NextResponse.json({ ok: true, application: 'mfa-integration-monitor', mysql: { ok: true, database }, eventTable: 'not-created' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ ok: false, application: 'mfa-integration-monitor', mysql: { ok: false }, error: message }, { status: 503 });
  }
}
