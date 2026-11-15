import { ok, fail } from '@/lib/http';
import { createCampaign, dispatchBatch } from '@/lib/campaigns';
import { normalizeNumber } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Call one number right away (e.g. for a test or a demo).
export async function POST(req) {
  try {
    const { name, number, scriptId } = await req.json();
    const clean = normalizeNumber(number);
    if (!clean) return fail('Invalid phone number', 400);
    const campaign = await createCampaign({
      name: `Quick call: ${name || clean}`,
      contacts: [{ name, number: clean }],
      scheduledAt: null,
      scriptId: scriptId || null,
    });
    if (campaign.skippedDnc) return fail('This number is on the do-not-call list', 400);
    await dispatchBatch(campaign.id);
    return ok({ id: campaign.id });
  } catch (e) {
    return fail(e);
  }
}
