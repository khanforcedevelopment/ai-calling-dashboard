// Server-only: create campaigns, send calls to Vapi, and pull back results.
import { db, check } from './supabase';
import { normalizeNumber } from './phone';
import { buildSlots, clampToBusinessHours, latestStartFor } from './schedule';
import { createCall, getCall, deleteCall, mapVapiCall } from './vapi';

export const MAX_CONTACTS = 5000;
const FINAL_STATUSES = ['ended', 'cancelled', 'error', 'skipped_dnc'];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function createCampaign({ name, contacts, scheduledAt, scriptId }) {
  if (!Array.isArray(contacts) || contacts.length === 0) throw new Error('No contacts to call');
  if (contacts.length > MAX_CONTACTS) throw new Error(`Too many contacts (max ${MAX_CONTACTS} per upload)`);

  // Clean numbers and remove duplicates
  const seen = new Set();
  const clean = [];
  for (const c of contacts) {
    const number = normalizeNumber(c.number);
    if (!number || seen.has(number)) continue;
    seen.add(number);
    clean.push({ name: (c.name || '').toString().trim().slice(0, 120), number });
  }
  if (clean.length === 0) throw new Error('None of the phone numbers were valid');

  // Check the do-not-call list
  const blocked = new Set();
  for (const part of chunk(clean.map((c) => c.number), 500)) {
    const { data } = check(await db().from('dnc').select('number').in('number', part));
    (data || []).forEach((r) => blocked.add(r.number));
  }

  const start = scheduledAt || new Date();
  const toCall = clean.filter((c) => !blocked.has(c.number));
  const slots = buildSlots(toCall.length, start);

  const { data: campaign } = check(
    await db()
      .from('campaigns')
      .insert({
        name: name || 'Untitled campaign',
        script_id: scriptId || null,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        total: clean.length,
      })
      .select()
      .single()
  );

  let slotIndex = 0;
  const rows = clean.map((c, i) => {
    const isBlocked = blocked.has(c.number);
    return {
      campaign_id: campaign.id,
      seq: i,
      customer_name: c.name || null,
      customer_number: c.number,
      status: isBlocked ? 'skipped_dnc' : 'pending',
      scheduled_for: isBlocked ? null : slots[slotIndex++].toISOString(),
    };
  });
  for (const part of chunk(rows, 500)) {
    check(await db().from('calls').insert(part));
  }

  return { id: campaign.id, total: clean.length, skippedDnc: blocked.size, invalid: contacts.length - clean.length };
}

// Send the next few pending calls of a campaign to Vapi. The browser calls this in a loop.
export async function dispatchBatch(campaignId, limit = 12) {
  const { data: campaign } = check(await db().from('campaigns').select('id, cancelled, script_id').eq('id', campaignId).single());
  if (campaign.cancelled) return { processed: 0, remaining: 0 };

  let script = null;
  if (campaign.script_id) {
    const { data } = check(await db().from('scripts').select('*').eq('id', campaign.script_id).maybeSingle());
    script = data;
  }

  const { data: rows } = check(
    await db().from('calls').select('*').eq('campaign_id', campaignId).eq('status', 'pending').order('seq').limit(limit)
  );

  const now = new Date();
  for (const row of rows || []) {
    let when = new Date(Math.max(new Date(row.scheduled_for || now).getTime(), now.getTime()));
    when = clampToBusinessHours(when);
    const scheduleIt = when.getTime() - now.getTime() > 60 * 1000;

    try {
      const call = await createCall({
        number: row.customer_number,
        name: row.customer_name,
        earliestAt: scheduleIt ? when : null,
        latestAt: scheduleIt ? latestStartFor(when) : null,
        script,
      });
      check(
        await db()
          .from('calls')
          .update({
            vapi_call_id: call?.id || null,
            status: call?.status || (scheduleIt ? 'scheduled' : 'queued'),
            scheduled_for: when.toISOString(),
            error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
      );
    } catch (e) {
      check(
        await db()
          .from('calls')
          .update({ status: 'error', error: String(e.message || e).slice(0, 500), updated_at: new Date().toISOString() })
          .eq('id', row.id)
      );
    }
  }

  const { count } = check(
    await db().from('calls').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'pending')
  );
  return { processed: (rows || []).length, remaining: count || 0 };
}

// Ask Vapi for the latest status / recording / transcript of unfinished calls.
export async function syncCalls({ campaignId, callId, limit = 40 } = {}) {
  let rows;
  if (callId) {
    // Refresh one specific call (the "Refresh from Vapi" button).
    ({ data: rows } = check(
      await db().from('calls').select('id, vapi_call_id, customer_number').eq('id', callId).not('vapi_call_id', 'is', null)
    ));
  } else {
    // Unfinished calls, plus calls that ended in the last 30 minutes but are still
    // missing their recording / summary (Vapi adds those a little after the call ends).
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    let q = db()
      .from('calls')
      .select('id, vapi_call_id, customer_number')
      .not('vapi_call_id', 'is', null)
      .or(
        `status.not.in.(${FINAL_STATUSES.join(',')}),` +
          `and(status.eq.ended,ended_at.gte.${recent},or(recording_url.is.null,summary.is.null,structured_data.is.null))`
      )
      .order('updated_at', { ascending: true })
      .limit(limit);
    if (campaignId) q = q.eq('campaign_id', campaignId);
    ({ data: rows } = check(await q));
  }

  let updated = 0;
  for (const part of chunk(rows || [], 8)) {
    await Promise.all(
      part.map(async (row) => {
        try {
          const call = await getCall(row.vapi_call_id);
          const fields = mapVapiCall(call);
          check(await db().from('calls').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', row.id));
          if (fields.structured_data?.do_not_call === true) {
            await db().from('dnc').upsert({ number: row.customer_number, reason: 'Asked not to be called (AI call)' });
          }
          updated++;
        } catch (e) {
          // Keep going; try again on the next refresh.
          await db().from('calls').update({ updated_at: new Date().toISOString() }).eq('id', row.id);
        }
      })
    );
  }
  return { updated, checked: (rows || []).length };
}

export async function cancelCampaign(campaignId) {
  check(await db().from('campaigns').update({ cancelled: true }).eq('id', campaignId));
  check(
    await db()
      .from('calls')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
  );

  const { data: waiting } = check(
    await db().from('calls').select('id, vapi_call_id').eq('campaign_id', campaignId).in('status', ['scheduled', 'queued'])
  );
  let cancelled = 0;
  for (const row of waiting || []) {
    try {
      if (row.vapi_call_id) await deleteCall(row.vapi_call_id);
      check(await db().from('calls').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', row.id));
      cancelled++;
    } catch {
      // The call may already be dialing; leave it.
    }
  }
  return { cancelled };
}
