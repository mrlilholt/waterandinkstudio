-- Run this once in Supabase Dashboard → SQL Editor for the existing project.
alter table public.artworks
  add column if not exists stripe_payment_url text;
