alter table public.legacy_artwork_settings add column if not exists title text;
alter table public.legacy_artwork_settings add column if not exists description text;
alter table public.legacy_artwork_settings add column if not exists image_url text;
alter table public.legacy_artwork_settings add column if not exists size_option text;
alter table public.legacy_artwork_settings add column if not exists etsy_url text;
alter table public.legacy_artwork_settings add column if not exists is_published boolean;
alter table public.legacy_artwork_settings add column if not exists new_arrival boolean;
