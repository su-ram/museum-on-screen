-- Allow the new museum sources (SMK = Statens Museum for Kunst, NGA = National Gallery of Art).
alter table public.artworks drop constraint if exists artworks_museum_check;
alter table public.artworks
  add constraint artworks_museum_check check (museum in ('met', 'cleveland', 'aic', 'smk', 'nga'));
