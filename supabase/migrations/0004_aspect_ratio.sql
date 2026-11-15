-- #11: store each artwork's width/height ratio so the gallery can filter by orientation.
alter table public.artworks
  add column if not exists aspect_ratio double precision
  generated always as (width::double precision / nullif(height, 0)) stored;

create index if not exists artworks_aspect_ratio_idx on public.artworks (aspect_ratio);
