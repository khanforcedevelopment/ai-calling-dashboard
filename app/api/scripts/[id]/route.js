import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { data } = check(await db().from('scripts').select('*').eq('id', id).single());
    return ok({ script: data });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const b = await req.json();
    if (!b.name || !b.name.trim()) return fail('Script name is required', 400);
    const { data } = check(
      await db()
        .from('scripts')
        .update({
          name: b.name.trim().slice(0, 120),
          first_message: b.first_message || '',
          system_prompt: b.system_prompt || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
    );
    return ok({ script: data });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    check(await db().from('scripts').delete().eq('id', id));
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
