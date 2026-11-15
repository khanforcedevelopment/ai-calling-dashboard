import { ok, fail } from '@/lib/http';
import { syncCalls } from '@/lib/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const campaignId = new URL(req.url).searchParams.get('campaignId') || undefined;
    return ok(await syncCalls({ campaignId }));
  } catch (e) {
    return fail(e);
  }
}
