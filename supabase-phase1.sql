-- AgentConnect Phase 2 schema upgrade (optional — the app currently runs on a
-- zero-DDL composite-key scheme inside `conversations`, see lib/db.js).
-- Run this in the Supabase SQL editor when you want proper tables, then
-- migrate lib/db.js to use them.

-- Per-agent memory: add agent column to conversations
alter table conversations add column if not exists agent_id text not null default 'tony';
create unique index if not exists conversations_user_agent on conversations (user_id, agent_id);

-- Matches
create table if not exists matches (
  user_id text not null,
  agent_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, agent_id)
);

-- Reports (safety pipeline)
create table if not exists reports (
  id bigint generated always as identity primary key,
  user_id text,
  agent_id text not null,
  message text,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz default now()
);
