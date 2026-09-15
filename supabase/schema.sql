-- Run this once in Supabase Dashboard → SQL Editor.
-- The exact owner email is enforced in both the database and file storage.

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  description text,
  image_path text not null unique,
  size_option text not null default 'Custom',
  price_cents integer check (price_cents is null or price_cents >= 0),
  availability text not null default 'available' check (availability in ('available', 'sold', 'inquiry')),
  etsy_url text,
  stripe_payment_url text,
  stripe_product_id text,
  stripe_payment_link_id text,
  new_arrival boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.artworks enable row level security;

create policy "Public can view published artworks"
  on public.artworks for select using (is_published = true);

create policy "Studio owner manages artworks"
  on public.artworks for all to authenticated
  using ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');

insert into storage.buckets (id, name, public)
values ('artwork-images', 'artwork-images', true)
on conflict (id) do update set public = true;

create policy "Public can view artwork images"
  on storage.objects for select using (bucket_id = 'artwork-images');

create policy "Studio owner uploads artwork images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'artwork-images' and (auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');

create policy "Studio owner updates artwork images"
  on storage.objects for update to authenticated
  using (bucket_id = 'artwork-images' and (auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com')
  with check (bucket_id = 'artwork-images' and (auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');

create policy "Studio owner deletes artwork images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'artwork-images' and (auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');

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
create policy "Public can view legacy checkout links" on public.legacy_artwork_links for select using (true);
create policy "Studio owner manages legacy checkout links" on public.legacy_artwork_links for all to authenticated
  using ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');

create table if not exists public.legacy_artwork_settings (
  legacy_number text primary key,
  title text,
  description text,
  image_url text,
  size_option text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  availability text check (availability in ('available', 'sold', 'inquiry')),
  etsy_url text,
  is_published boolean,
  new_arrival boolean,
  additional_images jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.legacy_artwork_settings enable row level security;
create policy "Public can view legacy artwork settings" on public.legacy_artwork_settings for select using (true);
create policy "Studio owner manages legacy artwork settings" on public.legacy_artwork_settings for all to authenticated
  using ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'waterandinkstudio@gmail.com');
