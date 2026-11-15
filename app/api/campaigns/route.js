import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';
import { createCampaign } from '@/lib/campaigns';
import { parseDubaiLocal } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = check(
      await db().from('campaigns').select('id, name, total, scheduled_at, cancelled, created_at').order('created_at', { ascending: false }).limit(200)
    );
    return ok({ campaigns: data || [] });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    let scheduledAt = null;
    if (body.scheduledAt) {
      scheduledAt = parseDubaiLocal(body.scheduledAt);
      if (!scheduledAt) return fail('Invalid schedule date/time', 400);
    }
    const result = await createCampaign({
      name: (body.name || '').toString().slice(0, 120),
      contacts: body.contacts,
      scheduledAt,
      scriptId: body.scriptId || null,
    });
    return ok(result, 201);
  } catch (e) {
    return fail(e, 400);
  }
}
