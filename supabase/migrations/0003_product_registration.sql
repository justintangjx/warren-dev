-- Warren — product registration
-- Run this in the Supabase SQL Editor after 0002_receipt_ocr.sql.
--
-- Tracks whether a tracked product has been registered with its manufacturer.
-- One row per warranty (assisted-registration status + optional confirmation).

create table if not exists public.product_registrations (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null unique references public.warranties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','assisted','registered','not_available')),
  method text check (method in ('url','unsupported')),
  registration_url text,
  confirmation_reference text,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_registrations_user_id_idx
  on public.product_registrations (user_id);

------------------------------------------------------------------------------
-- updated_at trigger (reuses public.set_updated_at from 0001_init.sql)
------------------------------------------------------------------------------

drop trigger if exists product_registrations_set_updated_at on public.product_registrations;
create trigger product_registrations_set_updated_at
  before update on public.product_registrations
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table public.product_registrations enable row level security;

drop policy if exists "product_registrations_select_own" on public.product_registrations;
drop policy if exists "product_registrations_insert_own" on public.product_registrations;
drop policy if exists "product_registrations_update_own" on public.product_registrations;

create policy "product_registrations_select_own" on public.product_registrations
  for select using (auth.uid() = user_id);
create policy "product_registrations_insert_own" on public.product_registrations
  for insert with check (auth.uid() = user_id);
create policy "product_registrations_update_own" on public.product_registrations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
