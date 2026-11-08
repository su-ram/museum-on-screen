-- New museum sources no longer need a schema change: the museum list is enforced by the app,
-- and the public-domain-only rule (artworks_public_domain_only) stays in place.
alter table public.artworks drop constraint if exists artworks_museum_check;
