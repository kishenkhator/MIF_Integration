import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const KEY = 'maximo:latest-event';
const kv = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    // Auth is OFF by default. It only turns on if you explicitly set
    // MAXIMO_WEBHOOK_SECRET in Vercel's env vars. If you didn't configure
    // a matching header on the Maximo End Point side, leave this unset —
    // that mismatch is the most common cause of a 401 here.
    const secret = process.env.MAXIMO_WEBHOOK_SECRET;
    if (secret) {
      const provided = request.headers.get('x-maximo-webhook-secret');
      if (provided !== secret) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized: x-maximo-webhook-secret header missing or does not match MAXIMO_WEBHOOK_SECRET' },
          { status: 401 }
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Request body is not valid JSON' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: 'Expected a JSON object' }, { status: 400 });
    }

    const payload = { ...(body as Record<string, unknown>), receivedAt: new Date().toISOString() };

    await kv.set(KEY, payload);

    return NextResponse.json({ ok: true, receivedAt: payload.receivedAt });
  } catch (err) {
    console.error('webhook error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ ok: false, error: `Server error: ${message}` }, { status: 500 });
  }
}

// Handy for quickly checking the endpoint is alive from a browser.
export async function GET() {
  return NextResponse.json({ ok: true, message: 'POST a Work Order JSON payload here.' });
}
