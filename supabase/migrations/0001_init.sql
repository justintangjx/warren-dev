-- Warren — initial schema
-- Run this in the Supabase SQL Editor (Project → SQL → New query → paste → Run).

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  product_type text not null,
  model_number text not null,
  serial_number text not null,
  purchase_date date not null,
  warranty_duration_months integer not null default 12 check (warranty_duration_months > 0),
  receipt_url text,
  is_extended boolean not null default false,
  extended_until date,
  created_at timestamptz not null default now()
);

create index if not exists warranties_user_id_idx on public.warranties (user_id);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_description text not null,
  status text not null default 'submitted'
    check (status in ('submitted','in_review','resolved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists claims_user_id_idx on public.claims (user_id);
create index if not exists claims_warranty_id_idx on public.claims (warranty_id);

create table if not exists public.extended_warranty_purchases (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('1y','2y')),
  amount_cents integer not null check (amount_cents >= 0),
  stripe_payment_intent_id text,
  status text not null default 'mocked'
    check (status in ('succeeded','failed','mocked')),
  created_at timestamptz not null default now()
);

create index if not exists ewp_user_id_idx on public.extended_warranty_purchases (user_id);
create index if not exists ewp_warranty_id_idx on public.extended_warranty_purchases (warranty_id);

------------------------------------------------------------------------------
-- updated_at trigger for claims
------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table public.warranties enable row level security;
alter table public.claims enable row level security;
alter table public.extended_warranty_purchases enable row level security;

drop policy if exists "warranties_select_own" on public.warranties;
drop policy if exists "warranties_insert_own" on public.warranties;
drop policy if exists "warranties_update_own" on public.warranties;
drop policy if exists "warranties_delete_own" on public.warranties;

create policy "warranties_select_own" on public.warranties
  for select using (auth.uid() = user_id);
create policy "warranties_insert_own" on public.warranties
  for insert with check (auth.uid() = user_id);
create policy "warranties_update_own" on public.warranties
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "warranties_delete_own" on public.warranties
  for delete using (auth.uid() = user_id);

drop policy if exists "claims_select_own" on public.claims;
drop policy if exists "claims_insert_own" on public.claims;
drop policy if exists "claims_update_own" on public.claims;

create policy "claims_select_own" on public.claims
  for select using (auth.uid() = user_id);
create policy "claims_insert_own" on public.claims
  for insert with check (auth.uid() = user_id);
create policy "claims_update_own" on public.claims
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ewp_select_own" on public.extended_warranty_purchases;
drop policy if exists "ewp_insert_own" on public.extended_warranty_purchases;

create policy "ewp_select_own" on public.extended_warranty_purchases
  for select using (auth.uid() = user_id);
create policy "ewp_insert_own" on public.extended_warranty_purchases
  for insert with check (auth.uid() = user_id);

------------------------------------------------------------------------------
-- Storage bucket for receipts (paths: <user_id>/<warranty_id>/<filename>)
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

drop policy if exists "receipts_select_own" on storage.objects;
drop policy if exists "receipts_insert_own" on storage.objects;
drop policy if exists "receipts_delete_own" on storage.objects;

create policy "receipts_select_own" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
