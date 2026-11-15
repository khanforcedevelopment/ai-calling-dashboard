import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const status = sp.get('status');
    const search = (sp.get('q') || '').replace(/[^\w\s+@.-]/g, '').trim();
    const page = Math.max(0, Number(sp.get('page') || 0));
    const size = 50;

    let q = db()
      .from('calls')
      .select('*, campaigns(name)', { count: 'exact' })
      .not('status', 'in', '(pending,skipped_dnc)')
      .order('created_at', { ascending: false })
      .order('seq', { ascending: true })
      .range(page * size, page * size + size - 1);
    if (status) q = q.eq('status', status);
    if (search) q = q.or(`customer_number.ilike.%${search}%,customer_name.ilike.%${search}%`);

    const { data, count } = check(await q);
    return ok({ calls: data || [], total: count || 0, page, size });
  } catch (e) {
    return fail(e);
  }
}
