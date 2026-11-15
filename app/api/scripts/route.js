import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data } = check(await db().from('scripts').select('*').order('updated_at', { ascending: false }));
    return ok({ scripts: data || [] });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (!b.name || !b.name.trim()) return fail('Script name is required', 400);
    const { data } = check(
      await db()
        .from('scripts')
        .insert({ name: b.name.trim().slice(0, 120), first_message: b.first_message || '', system_prompt: b.system_prompt || '' })
        .select()
        .single()
    );
    return ok({ script: data }, 201);
  } catch (e) {
    return fail(e);
  }
}
