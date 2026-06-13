-- Warren — receipt OCR fields
-- Run this in the Supabase SQL Editor after 0001_init.sql.
--
-- Adds optional retailer and purchase price columns, populated automatically
-- when a user scans a receipt (and editable manually).

alter table public.warranties
  add column if not exists retailer text,
  add column if not exists purchase_price_cents integer
    check (purchase_price_cents is null or purchase_price_cents >= 0);
