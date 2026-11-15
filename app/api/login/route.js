import { NextResponse } from 'next/server';
import { COOKIE_NAME, sessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD is not set on the server' }, { status: 500 });
  }
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
