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
