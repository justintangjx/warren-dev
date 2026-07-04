-- Warren — readiness agent recommendations
-- Run this in the Supabase SQL Editor after 0003_product_registration.sql.
--
-- Stores typed, user-confirmed readiness recommendations. V1 is suggest-only:
-- rows describe next actions, but never execute claims, payments, or provider contact.

create table if not exists public.agent_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  warranty_id uuid references public.warranties(id) on delete cascade,
  kind text not null
    check (kind in ('register_product','extend_before_expiry','claim_follow_up')),
  status text not null default 'open'
    check (status in ('open','dismissed','resolved')),
  priority text not null
    check (priority in ('low','medium','high')),
  title text not null,
  body text not null,
  action_payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  fingerprint text not null,
  last_evaluated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_recommendations_dismissed_at_check
    check ((status = 'dismissed') = (dismissed_at is not null)),
  constraint agent_recommendations_resolved_at_check
    check ((status = 'resolved') = (resolved_at is not null))
);

create unique index if not exists agent_recommendations_user_fingerprint_idx
  on public.agent_recommendations (user_id, fingerprint);

create index if not exists agent_recommendations_user_status_idx
  on public.agent_recommendations (user_id, status, priority);

create index if not exists agent_recommendations_warranty_id_idx
  on public.agent_recommendations (warranty_id);

------------------------------------------------------------------------------
-- updated_at trigger (reuses public.set_updated_at from 0001_init.sql)
------------------------------------------------------------------------------

drop trigger if exists agent_recommendations_set_updated_at on public.agent_recommendations;
create trigger agent_recommendations_set_updated_at
  before update on public.agent_recommendations
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table public.agent_recommendations enable row level security;

drop policy if exists "agent_recommendations_select_own" on public.agent_recommendations;
drop policy if exists "agent_recommendations_insert_own" on public.agent_recommendations;
drop policy if exists "agent_recommendations_update_own" on public.agent_recommendations;

create policy "agent_recommendations_select_own" on public.agent_recommendations
  for select using (auth.uid() = user_id);
create policy "agent_recommendations_insert_own" on public.agent_recommendations
  for insert with check (auth.uid() = user_id);
create policy "agent_recommendations_update_own" on public.agent_recommendations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
