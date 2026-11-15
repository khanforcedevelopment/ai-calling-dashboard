import { db, check } from '@/lib/supabase';
import { fail } from '@/lib/http';
import { fetchRecording } from '@/lib/vapi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Stream a call recording through the dashboard, so the storage link is never shown.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { data } = check(await db().from('calls').select('vapi_call_id, recording_url').eq('id', id).maybeSingle());
    if (!data?.vapi_call_id) return fail('No recording', 404);

    const range = req.headers.get('range');
    let upstream = await fetchRecording(data.vapi_call_id, range);

    // Older setups: the stored link may be public, try it directly.
    if (!upstream.ok && upstream.status !== 206 && data.recording_url) {
      upstream = await fetch(data.recording_url, { headers: range ? { Range: range } : {}, cache: 'no-store' });
    }
    if (!upstream.ok && upstream.status !== 206) return fail('Recording not available yet', 404);

    const headers = new Headers();
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.get('content-type') || headers.get('content-type').includes('octet-stream')) {
      headers.set('content-type', 'audio/wav');
    }
    headers.set('cache-control', 'private, max-age=600');
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return fail(e);
  }
}
