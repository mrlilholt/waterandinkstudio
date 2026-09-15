create table if not exists public.legacy_artwork_links (
  legacy_number text primary key,
  title text not null,
  price_cents integer not null check (price_cents > 0),
  stripe_payment_url text not null,
  stripe_product_id text not null,
  stripe_payment_link_id text not null,
  created_at timestamptz not null default now()
);

alter table public.legacy_artwork_links enable row level security;

create policy "Public can view legacy checkout links"
  on public.legacy_artwork_links for select using (true);

create policy "Studio owner manages legacy checkout links"
  on public.legacy_artwork_links for all to authenticated
  using ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');
