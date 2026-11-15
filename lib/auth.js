// Session cookies. Works in both the Edge runtime (middleware) and Node (API routes).
export const COOKIE_NAME = 'acd_session';
export const ADMIN_UID = 'admin';

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data) {
  // The admin password is part of the key, so changing it logs everyone out.
  const secret = `${process.env.AUTH_SECRET || ''}::${process.env.DASHBOARD_PASSWORD || ''}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

// payload: { uid, username, role }
export async function signSession(payload) {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, iat: Date.now() })));
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(token) {
  if (!token || !process.env.AUTH_SECRET || !process.env.DASHBOARD_PASSWORD) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if ((await hmac(body)) !== sig) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (Date.now() - p.iat > 30 * 24 * 60 * 60 * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

// For API routes: read the session from the request cookie.
export async function getSession(req) {
  return verifySession(req.cookies.get(COOKIE_NAME)?.value);
}
