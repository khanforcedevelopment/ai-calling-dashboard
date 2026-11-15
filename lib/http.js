import { NextResponse } from 'next/server';

export function ok(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(err, status = 500) {
  const message = typeof err === 'string' ? err : err?.message || 'Something went wrong';
  return NextResponse.json({ error: message }, { status });
}
