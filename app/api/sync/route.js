import { ok, fail } from '@/lib/http';
import { syncCalls } from '@/lib/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const campaignId = sp.get('campaignId') || undefined;
    const callId = sp.get('callId') || undefined;
    return ok(await syncCalls({ campaignId, callId }));
  } catch (e) {
    return fail(e);
  }
}
