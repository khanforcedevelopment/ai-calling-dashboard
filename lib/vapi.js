// Server-only helpers for the Vapi API. The API key never reaches the browser.
const BASE = 'https://api.vapi.ai';

async function vapiFetch(path, opts = {}) {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error('VAPI_API_KEY is not set');
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    let msg = res.statusText;
    if (body && typeof body === 'object') {
      msg = Array.isArray(body.message) ? body.message.join('; ') : body.message || body.error || msg;
    } else if (typeof body === 'string' && body) {
      msg = body;
    }
    const err = new Error(`Call service error (${res.status}): ${msg}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// What the AI should pull out of every call. Shows up on the Leads page.
export const STRUCTURED_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: ['buy', 'sell', 'not_interested', 'call_back', 'unknown'],
      description: 'Whether the person wants to buy property, sell property, is not interested, or asked to be called back later.',
    },
    interested_in_uae_investment: { type: 'boolean', description: 'True if the person said they are interested in investing in UAE property.' },
    buy_property_type: { type: 'string', enum: ['off_plan', 'ready', 'not_sure'], description: 'For buyers: off-plan or ready property.' },
    preferred_area: { type: 'string', description: 'For buyers: preferred area or community.' },
    budget: { type: 'string', description: 'For buyers: budget they mentioned.' },
    whatsapp_number: { type: 'string', description: 'WhatsApp number they confirmed or gave.' },
    contact_name: { type: 'string', description: 'Name the person gave during the call.' },
    sell_property_type: { type: 'string', description: 'For sellers: apartment, villa, townhouse, plot, office, etc.' },
    sell_location: { type: 'string', description: 'For sellers: community, building or project name.' },
    sell_bedrooms: { type: 'string', description: 'For sellers: number of bedrooms.' },
    sell_area_sqft: { type: 'string', description: 'For sellers: size in square feet.' },
    sell_status: { type: 'string', description: 'For sellers: ready vacant, ready rented, or off-plan.' },
    sell_expected_price: { type: 'string', description: 'For sellers: expected selling price.' },
    callback_time: { type: 'string', description: 'If they asked to be called later, when.' },
    do_not_call: { type: 'boolean', description: 'True if the person asked not to be called again.' },
  },
};

// The base assistant's model settings, cached for a few minutes.
let assistantCache = { at: 0, data: null };
async function getBaseAssistant() {
  if (assistantCache.data && Date.now() - assistantCache.at < 5 * 60 * 1000) return assistantCache.data;
  const data = await vapiFetch(`/assistant/${encodeURIComponent(process.env.VAPI_ASSISTANT_ID)}`);
  assistantCache = { at: Date.now(), data };
  return data;
}

// Build overrides that swap in a saved script (first message + system prompt)
// while keeping the assistant's voice, model and other settings.
async function scriptOverrides(script) {
  if (!script) return {};
  const out = {};
  if (script.first_message && script.first_message.trim()) out.firstMessage = script.first_message;
  if (script.system_prompt && script.system_prompt.trim()) {
    const base = await getBaseAssistant();
    const model = base?.model;
    if (!model?.provider || !model?.model) {
      throw new Error('Could not load the AI settings to apply the script');
    }
    const { messages, ...rest } = model;
    const others = Array.isArray(messages) ? messages.filter((m) => m.role !== 'system') : [];
    out.model = { ...rest, messages: [{ role: 'system', content: script.system_prompt }, ...others] };
  }
  return out;
}

// "good morning" / "good afternoon" / "good evening" based on UAE time.
export function greetingFor(date = new Date()) {
  const hour = new Date(date.getTime() + 4 * 60 * 60 * 1000).getUTCHours();
  if (hour >= 4 && hour < 12) return 'good morning';
  if (hour >= 12 && hour < 17) return 'good afternoon';
  return 'good evening';
}

// When the AI says one of these, Vapi hangs up the call.
function endCallPhrases() {
  const custom = (process.env.END_CALL_PHRASES || '').split('|').map((s) => s.trim()).filter(Boolean);
  return custom.length ? custom : ['goodbye', 'good bye', 'have a great day', 'have a nice day', 'khuda hafiz', 'allah hafiz', 'ma3a salama', 'مع السلامة'];
}

// Start (or schedule) one outbound call.
export async function createCall({ number, name, earliestAt, latestAt, script }) {
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!assistantId || !phoneNumberId) {
    throw new Error('VAPI_ASSISTANT_ID and VAPI_PHONE_NUMBER_ID must be set');
  }

  const base = {
    assistantId,
    phoneNumberId,
    customer: { number, ...(name ? { name: String(name).slice(0, 40) } : {}) },
  };
  if (earliestAt) {
    base.schedulePlan = { earliestAt: earliestAt.toISOString(), ...(latestAt ? { latestAt: latestAt.toISOString() } : {}) };
  }

  const variables = {
    ...(await scriptOverrides(script)),
    endCallPhrases: endCallPhrases(),
    variableValues: { name: name || '', greeting: greetingFor(earliestAt || new Date()) },
  };
  const withAnalysis = {
    ...base,
    assistantOverrides: {
      ...variables,
      analysisPlan: {
        summaryPlan: { enabled: true },
        structuredDataPlan: { enabled: true, schema: STRUCTURED_SCHEMA },
      },
    },
  };

  try {
    return await vapiFetch('/call', { method: 'POST', body: JSON.stringify(withAnalysis) });
  } catch (e) {
    // If Vapi rejects the analysis settings, try again without them
    // (lead details can still come from Structured Outputs set up in Vapi).
    if (e.status !== 400) throw e;
    return vapiFetch('/call', { method: 'POST', body: JSON.stringify({ ...base, assistantOverrides: variables }) });
  }
}

export function getCall(id) {
  return vapiFetch(`/call/${encodeURIComponent(id)}`);
}

export function deleteCall(id) {
  return vapiFetch(`/call/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Convert a Vapi call object into the columns we store.
export function mapVapiCall(c) {
  const art = c.artifact || {};
  const analysis = c.analysis || {};

  let structured = analysis.structuredData && typeof analysis.structuredData === 'object' ? { ...analysis.structuredData } : null;
  const outputs = art.structuredOutputs;
  if (outputs && typeof outputs === 'object') {
    const merged = { ...(structured || {}) };
    for (const v of Object.values(outputs)) {
      if (!v || v.result === undefined || v.result === null) continue;
      if (typeof v.result === 'object' && !Array.isArray(v.result)) Object.assign(merged, v.result);
      else if (v.name) merged[v.name] = v.result;
    }
    if (Object.keys(merged).length) structured = merged;
  }

  let duration = null;
  if (c.startedAt && c.endedAt) {
    duration = Math.max(0, Math.round((new Date(c.endedAt) - new Date(c.startedAt)) / 1000));
  }

  return {
    status: c.status || null,
    ended_reason: c.endedReason || null,
    started_at: c.startedAt || null,
    ended_at: c.endedAt || null,
    duration_seconds: duration,
    recording_url:
      art.recordingUrl ||
      art.recording?.mono?.combinedUrl ||
      art.recording?.stereoUrl ||
      art.stereoRecordingUrl ||
      c.recordingUrl ||
      c.stereoRecordingUrl ||
      null,
    transcript: art.transcript || c.transcript || null,
    summary: analysis.summary || c.summary || null,
    structured_data: structured,
    cost: typeof c.cost === 'number' ? c.cost : null,
  };
}
