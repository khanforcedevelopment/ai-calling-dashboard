import { db, check } from '@/lib/supabase';
import { fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Stream a call recording through the dashboard, so the original storage link is never shown.
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { data } = check(await db().from('calls').select('recording_url').eq('id', id).maybeSingle());
    if (!data?.recording_url) return fail('No recording', 404);

    const range = req.headers.get('range');
    const upstream = await fetch(data.recording_url, { headers: range ? { Range: range } : {}, cache: 'no-store' });
    if (!upstream.ok && upstream.status !== 206) return fail('Recording not available', 502);

    const headers = new Headers();
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.get('content-type')) headers.set('content-type', 'audio/wav');
    headers.set('cache-control', 'private, max-age=3600');
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return fail(e);
  }
}
