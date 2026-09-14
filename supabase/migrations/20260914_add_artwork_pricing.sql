-- Run this once in Supabase Dashboard → SQL Editor for the existing project.
alter table public.artworks
  add column if not exists size_option text not null default 'Custom',
  add column if not exists price_cents integer check (price_cents is null or price_cents >= 0);
