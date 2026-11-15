-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create extension if not exists pgcrypto;

-- Saved call scripts (first message + system prompt)
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  first_message text not null default '',
  system_prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per uploaded list (or quick call)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  script_id uuid references scripts(id) on delete set null,
  scheduled_at timestamptz,
  total integer not null default 0,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per person to call
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  seq integer not null default 0,
  customer_name text,
  customer_number text not null,
  scheduled_for timestamptz,
  status text not null default 'pending',
  -- pending | skipped_dnc | cancelled | error | scheduled | queued | ringing | in-progress | forwarding | ended
  vapi_call_id text,
  error text,
  ended_reason text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  recording_url text,
  transcript text,
  summary text,
  structured_data jsonb,
  cost numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calls_campaign_idx on calls(campaign_id, seq);
create index if not exists calls_status_idx on calls(status);
create index if not exists calls_vapi_idx on calls(vapi_call_id);
create index if not exists calls_intent_idx on calls((structured_data->>'intent'));

-- Do-not-call list
create table if not exists dnc (
  number text primary key,
  reason text,
  created_at timestamptz not null default now()
);

-- Lock tables: only the server (service role key) can read/write.
alter table scripts enable row level security;
alter table campaigns enable row level security;
alter table calls enable row level security;
alter table dnc enable row level security;
