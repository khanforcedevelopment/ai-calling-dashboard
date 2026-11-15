import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';
import { normalizeNumber } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = check(await db().from('dnc').select('*').order('created_at', { ascending: false }).limit(5000));
    return ok({ numbers: data || [] });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const { numbers, reason } = await req.json();
    const list = (Array.isArray(numbers) ? numbers : [numbers]).map((n) => normalizeNumber(n)).filter(Boolean);
    if (list.length === 0) return fail('No valid numbers', 400);
    const rows = [...new Set(list)].map((number) => ({ number, reason: (reason || 'Added manually').toString().slice(0, 200) }));
    check(await db().from('dnc').upsert(rows));
    return ok({ added: rows.length });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req) {
  try {
    const number = new URL(req.url).searchParams.get('number');
    if (!number) return fail('Missing number', 400);
    check(await db().from('dnc').delete().eq('number', number));
    return ok({ removed: true });
  } catch (e) {
    return fail(e);
  }
}
