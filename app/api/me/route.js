import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ username: s.username, name: s.name, role: s.role });
}
