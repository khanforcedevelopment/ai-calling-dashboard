import { db, check } from '@/lib/supabase';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Admin only (enforced in middleware). Deleting a user logs them out immediately.
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    check(await db().from('users').delete().eq('id', id));
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
