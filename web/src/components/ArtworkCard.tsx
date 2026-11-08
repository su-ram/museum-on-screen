import Image from "next/image";
import Link from "next/link";
import { DEVICES, MUSEUMS } from "@/lib/devices";
import { coverOf, type Artwork } from "@/lib/queries";

export function ArtworkCard({ artwork: a }: { artwork: Artwork }) {
  const cover = coverOf(a);
  const downloads = DEVICES.map((d) => {
    const w = a.wallpapers.find((x) => x.device_type === d.type && x.fit_mode === "fill") ?? a.wallpapers.find((x) => x.device_type === d.type);
    return w ? { d, w } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <article className="group flex h-full flex-col">
      <Link href={`/artworks/${a.id}`} className="glare relative block overflow-hidden rounded-none bg-line">
        <div className="relative aspect-[4/3]">
          {cover && (
            <Image
              src={cover.url}
              alt={`${a.title} — ${a.artist}`}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
      </Link>
      <div className="mt-3 flex flex-1 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium leading-snug">
            <Link href={`/artworks/${a.id}`} className="hover:underline underline-offset-4">{a.title}</Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted">{a.artist}{a.year ? ` · ${a.year}` : ""}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {MUSEUMS[a.museum] ?? a.museum}
          </p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {downloads.map(({ d, w }) => (
          <li key={d.type}>
            <a href={`/api/wallpapers/${w.id}/download`} className="inline-block py-1 underline underline-offset-4 decoration-line hover:decoration-accent">{d.label}</a>
          </li>
        ))}
      </ul>
    </article>
  );
}
