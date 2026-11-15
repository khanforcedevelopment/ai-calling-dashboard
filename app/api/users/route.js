import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';
import { hashPassword } from '@/lib/passwords';

export const dynamic = 'force-dynamic';

// Admin only (enforced in middleware).
export async function GET() {
  try {
    const { data } = check(
      await db().from('users').select('id, name, username, role, active, created_at').order('created_at', { ascending: false })
    );
    return ok({ users: data || [] });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const username = (b.username || '').trim().toLowerCase();
    const password = b.password || '';
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return fail('Username: 3-30 characters, letters, numbers, dot, dash or underscore only', 400);
    }
    if (username === 'admin') return fail('"admin" is reserved', 400);
    if (password.length < 6) return fail('Password must be at least 6 characters', 400);

    const { data: existing } = check(await db().from('users').select('id').eq('username', username).maybeSingle());
    if (existing) return fail('This username already exists', 400);

    const { data } = check(
      await db()
        .from('users')
        .insert({
          name: (b.name || username).toString().slice(0, 80),
          username,
          password_hash: hashPassword(password),
          role: b.role === 'admin' ? 'admin' : 'user',
        })
        .select('id, name, username, role, active, created_at')
        .single()
    );
    return ok({ user: data }, 201);
  } catch (e) {
    return fail(e);
  }
}
