import Link from "next/link";
import { LoadingImage } from "@/components/LoadingImage";
import { canMake, DEVICES, MUSEUMS } from "@/lib/devices";
import { coverOf, type Artwork } from "@/lib/queries";

export function ArtworkCard({ artwork: a }: { artwork: Artwork }) {
  const cover = coverOf(a);
  // Stored wallpaper if one was pre-generated, otherwise rendered on demand from the museum original.
  const downloads = DEVICES.map((d) => {
    const w = a.wallpapers.find((x) => x.device_type === d.type && x.fit_mode === "fill") ?? a.wallpapers.find((x) => x.device_type === d.type);
    if (w) return { d, href: `/api/wallpapers/${w.id}/download` };
    return canMake(a, d.type, "fill") ? { d, href: `/api/artworks/${a.id}/wallpaper?device=${d.type}&mode=fill` } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const imageUrl = cover?.url ?? a.thumbnail_url ?? a.original_url;

  return (
    <article className="group flex h-full flex-col">
      <Link href={`/artworks/${a.id}`} className="glare group/img relative block overflow-hidden rounded-none bg-line">
        <div className="relative aspect-[4/3]">
          {imageUrl && (
            <LoadingImage
              src={imageUrl}
              alt={`${a.title} — ${a.artist}`}
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-cover"
            />
          )}
          {/* Title / artist / year are hidden until hover (or keyboard focus) to keep the grid calm. */}
          <div className="absolute inset-0 flex flex-col justify-end bg-ink/85 p-4 text-bg opacity-0 transition-opacity duration-300 group-hover/img:opacity-100 group-focus-visible/img:opacity-100">
            <h3 className="line-clamp-3 text-base font-medium leading-snug">{a.title}</h3>
            <p className="mt-1 line-clamp-1 text-sm opacity-80">{a.artist}</p>
            {a.year && <p className="mt-0.5 line-clamp-1 text-xs opacity-60">{a.year}</p>}
          </div>
        </div>
      </Link>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        {MUSEUMS[a.museum] ?? a.museum}
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {downloads.map(({ d, href }) => (
          <li key={d.type}>
            <a href={href} className="inline-block py-1 underline underline-offset-4 decoration-line hover:decoration-accent">{d.label}</a>
          </li>
        ))}
      </ul>
    </article>
  );
}
