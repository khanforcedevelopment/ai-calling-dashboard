import { createClient } from '@supabase/supabase-js';

let client;

// Server-only Supabase client. Never import this into a client component.
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Throw a readable error if a Supabase call failed, otherwise return { data, count }.
export function check(res) {
  if (res.error) throw new Error(`Database error: ${res.error.message}`);
  return res;
}
