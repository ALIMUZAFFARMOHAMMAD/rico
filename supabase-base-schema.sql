-- Base schema for a fresh Supabase project (run this FIRST, before supabase-phase1.sql).
-- Reconstructed 2026-08-16 from lib/db.js + every column actually read/written across
-- pages/api/*.js — the original DDL was never committed (the table was created by hand in
-- the Supabase UI). If qifwvhfzecjymezaqyfx.supabase.co is gone and you're standing up a
-- replacement project, run this in the new project's SQL editor before pointing
-- NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at it.
--
-- Zero-DDL design: this ONE table holds everything (user memory, board tasks, club feed,
-- etc.) as JSON under synthetic `user_id` composite keys — see lib/db.js's header comment
-- for the key scheme. Do not add more tables for new features; extend `traits`/`messages`
-- on this table the same way the rest of the app does.

create table if not exists conversations (
  id bigint generated always as identity primary key,
  user_id text not null,
  messages jsonb not null default '[]',
  traits jsonb not null default '{}',
  riasec text not null default '',
  msg_count integer not null default 0,
  voice_notes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately NOT unique on user_id: lib/db.js's upsertRow does its own
-- lookup-then-insert-or-update (no ON CONFLICT), so a real unique constraint would turn a
-- race between two concurrent requests for the same key into a 500 instead of a harmless
-- duplicate row — every read already picks the most recent by `updated_at`, so duplicates
-- are invisible to the app. A plain (non-unique) index just keeps that lookup fast.
create index if not exists conversations_user_id_idx on conversations (user_id);
