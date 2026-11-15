import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const type = new URL(req.url).searchParams.get('type') === 'sell' ? 'sell' : 'buy';
    const leads = [];
    for (let from = 0; ; from += 1000) {
      const { data } = check(
        await db()
          .from('calls')
          .select('id, customer_name, customer_number, ended_at, summary, structured_data, recording_url, campaigns(name)')
          .eq('structured_data->>intent', type)
          .order('ended_at', { ascending: false })
          .range(from, from + 999)
      );
      leads.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return ok({ type, leads });
  } catch (e) {
    return fail(e);
  }
}
