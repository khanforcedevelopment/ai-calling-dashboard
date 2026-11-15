import { NextResponse } from 'next/server';
import { COOKIE_NAME, ADMIN_UID, verifySession } from './lib/auth';

// Check that a non-admin user still exists and is active.
async function userIsActive(uid) {
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(uid)}&active=eq.true&select=id`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login')) {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(COOKIE_NAME)?.value);
  let allowed = !!session;
  if (session && session.uid !== ADMIN_UID) allowed = await userIsActive(session.uid);

  if (allowed) {
    // Only admins can manage users.
    if ((pathname.startsWith('/users') || pathname.startsWith('/api/users')) && session.role !== 'admin') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const res = NextResponse.redirect(url);
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
