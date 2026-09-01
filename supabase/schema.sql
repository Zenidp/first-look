-- First Look — shared fixture cache and usage ledger.
--
-- Run this once in the Supabase SQL editor, then create a PUBLIC storage
-- bucket named `fixtures`.
--
-- Why this exists: Vercel's runtime filesystem is read-only, so the deployed
-- app can read the fixtures committed to git but can never write a new one.
-- Without somewhere shared to put results, every look a bride builds is billed
-- again in full every time anyone builds it. This is the credit saver.
--
-- Access is service-role only. Every query goes through Next.js route handlers
-- that hold SUPABASE_SERVICE_ROLE_KEY; the browser never talks to Supabase, so
-- RLS is left on with no permissive policy, which denies anon and authenticated
-- outright. Storage reads are public so the browser can load the images.

-- ---------------------------------------------------------------------------
-- Fixtures: one row per successful Perfect Corp task.
--
-- `key` is the same content hash the on-disk cache uses (feature + version +
-- task parameters + a hash of every input image's bytes), so a row here and a
-- file in fixtures/ are interchangeable and the lookup can fall through from
-- one to the other.
-- ---------------------------------------------------------------------------
create table if not exists public.fixtures (
  key         text primary key,
  feature     text not null,
  inputs      jsonb not null default '{}'::jsonb,
  -- null for diagnostics, which return attributes rather than a file.
  media_type  text check (media_type in ('image', 'video')),
  -- The attribute payload, for the diagnostics that return one.
  data        jsonb,
  task_id     text,
  units_spent integer not null default 0,
  elapsed_ms  integer not null default 0,
  polls       integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.fixtures enable row level security;

create index if not exists fixtures_feature_idx on public.fixtures (feature);
create index if not exists fixtures_created_idx on public.fixtures (created_at desc);

-- ---------------------------------------------------------------------------
-- Usage ledger: units spent per session.
--
-- A guard against a visitor retrying twenty times on a slow connection, not a
-- security boundary — the session id comes from the client and is trivially
-- forgeable. Real abuse prevention needs auth, which CONTEXT §7 rules out.
-- ---------------------------------------------------------------------------
create table if not exists public.usage (
  session    text primary key,
  units      integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.usage enable row level security;

-- Atomic increment. Doing this as read-then-write from the route would lose
-- counts whenever two steps of the same chain overlap.
create or replace function public.add_usage(p_session text, p_units integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  insert into public.usage as u (session, units)
       values (p_session, greatest(p_units, 0))
  on conflict (session) do update
       set units = u.units + greatest(p_units, 0),
           updated_at = now()
    returning u.units into total;
  return total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pending tasks: video generation that outlives a single request.
--
-- A 5-second clip takes ~62 seconds to render, and a serverless function may be
-- capped at 60. So video is created in one request and polled in another, which
-- means the identity needed to file the result — its cache key, what it cost —
-- has to survive between them. Serverless invocations share no memory, so it
-- lives here.
--
-- Rows are deleted once the task reaches a terminal state. Anything still
-- present after an hour was abandoned; sweep it with:
--   delete from public.pending_tasks where created_at < now() - interval '1 hour';
-- ---------------------------------------------------------------------------
create table if not exists public.pending_tasks (
  task_id    text primary key,
  -- The fixture key this result will be filed under, computed at creation from
  -- the inputs. Kept server-side so a client cannot redirect a result onto
  -- someone else's cache entry.
  key        text not null,
  feature    text not null,
  inputs     jsonb not null default '{}'::jsonb,
  media_type text check (media_type in ('image', 'video')),
  -- Video does not bill a flat rate: 1/2/3 units per second by resolution, so
  -- the real figure is computed at creation and carried, not re-derived.
  units      integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pending_tasks enable row level security;

create index if not exists pending_tasks_created_idx on public.pending_tasks (created_at);

-- ---------------------------------------------------------------------------
-- Look boards: the artefact she sends to her MUA.
--
-- Fixture keys are content-addressed and stable, so a board is just the recipe
-- plus the key of the final image. Replaying one costs nothing.
-- ---------------------------------------------------------------------------
create table if not exists public.look_boards (
  id         text primary key,
  framing    text not null check (framing in ('beauty', 'outfit')),
  recipe     jsonb not null,
  final_key  text not null,
  video_key  text,
  created_at timestamptz not null default now()
);

alter table public.look_boards enable row level security;

-- ---------------------------------------------------------------------------
-- Storage
--
-- Create a bucket named `fixtures`, marked PUBLIC, either in the dashboard or
-- by uncommenting this. Public read is what lets an <img> or <video> tag load
-- the result directly; writes still require the service role key.
-- ---------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public)
--      values ('fixtures', 'fixtures', true)
-- on conflict (id) do update set public = true;
