import { ok, fail } from '@/lib/http';
import { dispatchBatch } from '@/lib/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    return ok(await dispatchBatch(id));
  } catch (e) {
    return fail(e);
  }
}
