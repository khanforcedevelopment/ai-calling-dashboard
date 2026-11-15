// Works in both the Edge runtime (middleware) and Node (API routes).
export const COOKIE_NAME = 'acd_session';

export async function sessionToken() {
  const pw = process.env.DASHBOARD_PASSWORD || '';
  const secret = process.env.AUTH_SECRET || '';
  const data = new TextEncoder().encode(`${pw}::${secret}::v1`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
