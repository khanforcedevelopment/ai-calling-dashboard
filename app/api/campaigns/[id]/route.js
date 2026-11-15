import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { data: campaign } = check(await db().from('campaigns').select('*').eq('id', id).single());

    // Fetch all calls (in pages of 1000)
    const calls = [];
    for (let from = 0; ; from += 1000) {
      const { data } = check(
        await db().from('calls').select('*').eq('campaign_id', id).order('seq').range(from, from + 999)
      );
      calls.push(...(data || []));
      if (!data || data.length < 1000) break;
    }

    const counts = {};
    for (const c of calls) counts[c.status] = (counts[c.status] || 0) + 1;

    return ok({ campaign, calls, counts });
  } catch (e) {
    return fail(e);
  }
}
