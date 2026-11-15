import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

const NO_ANSWER = ['customer-did-not-answer', 'customer-busy', 'voicemail', 'customer-did-not-give-microphone-permission'];

async function count(build) {
  const { count } = check(await build(db().from('calls').select('id', { count: 'exact', head: true })));
  return count || 0;
}

export async function GET() {
  try {
    const [placed, ended, noAnswer, connected, buyers, sellers, pending] = await Promise.all([
      count((q) => q.not('vapi_call_id', 'is', null)),
      count((q) => q.eq('status', 'ended')),
      count((q) => q.eq('status', 'ended').in('ended_reason', NO_ANSWER)),
      count((q) => q.eq('status', 'ended').gte('duration_seconds', 15)),
      count((q) => q.eq('structured_data->>intent', 'buy')),
      count((q) => q.eq('structured_data->>intent', 'sell')),
      count((q) => q.in('status', ['pending', 'scheduled', 'queued', 'ringing', 'in-progress'])),
    ]);

    const { data: campaigns } = check(
      await db().from('campaigns').select('id, name, total, scheduled_at, cancelled, created_at').order('created_at', { ascending: false }).limit(8)
    );

    return ok({ placed, ended, noAnswer, connected, buyers, sellers, pending, campaigns: campaigns || [] });
  } catch (e) {
    return fail(e);
  }
}
