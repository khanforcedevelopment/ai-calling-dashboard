import { NextResponse } from 'next/server';
import { COOKIE_NAME, ADMIN_UID, signSession } from '@/lib/auth';
import { checkPassword } from '@/lib/passwords';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!process.env.DASHBOARD_PASSWORD || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD and AUTH_SECRET must be set on the server' }, { status: 500 });
  }
  const user = (username || '').trim().toLowerCase();
  if (!user || !password) return NextResponse.json({ error: 'Enter username and password' }, { status: 400 });

  let session = null;
  if (user === 'admin') {
    if (password === process.env.DASHBOARD_PASSWORD) session = { uid: ADMIN_UID, username: 'admin', name: 'Admin', role: 'admin' };
  } else {
    const { data } = await db().from('users').select('*').eq('username', user).eq('active', true).maybeSingle();
    if (data && checkPassword(password, data.password_hash)) {
      session = { uid: data.id, username: data.username, name: data.name, role: data.role };
    }
  }

  if (!session) return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await signSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
