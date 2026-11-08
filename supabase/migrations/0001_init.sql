-- Museum on Screen: artworks + wallpapers

create table public.artworks (
  id                    uuid primary key default gen_random_uuid(),
  museum                text not null check (museum in ('met', 'cleveland', 'aic')),
  external_id           text not null,
  title                 text not null,
  artist                text not null default 'Unknown',
  year                  text,ㅌㅂ
  original_url          text not null,
  thumbnail_url         text,
  original_storage_path text,
  width                 int,
  height                int,
  license               text not null,
  is_public_domain      boolean not null default false,
  credit_line           text,
  source_url            text not null,
  focal_point_x         double precision not null default 0.5 check (focal_point_x between 0 and 1),
  focal_point_y         double precision not null default 0.5 check (focal_point_y between 0 and 1),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (museum, external_id)
);

-- Only public-domain / CC0 works may be exposed (see design §7).
alter table public.artworks
  add constraint artworks_public_domain_only check (is_public_domain);

create index artworks_museum_idx on public.artworks (museum);
create index artworks_artist_idx on public.artworks (artist);
create index artworks_search_idx on public.artworks
  using gin (to_tsvector('simple', title || ' ' || artist));

create table public.wallpapers (
  id           uuid primary key default gen_random_uuid(),
  artwork_id   uuid not null references public.artworks (id) on delete cascade,
  device_type  text not null check (device_type in ('mobile', 'mobile_qhd', 'laptop', 'desktop')),
  width        int not null,
  height       int not null,
  fit_mode     text not null check (fit_mode in ('fit', 'fill')),
  storage_path text not null,
  file_size    bigint,
  format       text not null check (format in ('jpg', 'png')),
  created_at   timestamptz not null default now(),
  unique (artwork_id, device_type, fit_mode, format)
);

create index wallpapers_artwork_idx on public.wallpapers (artwork_id);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger artworks_touch before update on public.artworks
  for each row execute function public.touch_updated_at();

-- Public read-only access; writes only via the service role (ingest pipeline).
alter table public.artworks  enable row level security;
alter table public.wallpapers enable row level security;
create policy "artworks are publicly readable"  on public.artworks  for select using (true);
create policy "wallpapers are publicly readable" on public.wallpapers for select using (true);
