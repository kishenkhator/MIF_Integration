import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const KEY = 'maximo:latest-event';
const kv = Redis.fromEnv();

type StoredEvent = { receivedAt?: string; [key: string]: unknown };

export async function GET() {
  try {
    const event = await kv.get<StoredEvent>(KEY);
    return NextResponse.json({ event: event ?? null, updatedAt: event?.receivedAt ?? null });
  } catch (err) {
    console.error('latest error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ event: null, error: `Unable to read latest event: ${message}` }, { status: 500 });
  }
}
