alter table public.artworks add column if not exists stripe_product_id text;
alter table public.artworks add column if not exists stripe_payment_link_id text;

create table if not exists public.legacy_artwork_settings (
  legacy_number text primary key,
  price_cents integer check (price_cents is null or price_cents >= 0),
  availability text check (availability in ('available', 'sold', 'inquiry')),
  updated_at timestamptz not null default now()
);

alter table public.legacy_artwork_settings enable row level security;

create policy "Public can view legacy artwork settings"
  on public.legacy_artwork_settings for select using (true);

create policy "Studio owner manages legacy artwork settings"
  on public.legacy_artwork_settings for all to authenticated
  using ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');
