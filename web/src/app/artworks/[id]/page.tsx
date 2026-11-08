import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WallpaperPicker } from "@/components/WallpaperPicker";
import { MUSEUMS } from "@/lib/devices";
import { getArtwork } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArtwork((await params).id).catch(() => null);
  return a ? { title: `${a.title} — ${a.artist}` } : {};
}

export default async function ArtworkPage({ params }: Props) {
  const a = await getArtwork((await params).id);
  if (!a) notFound();
  const rows: [string, React.ReactNode][] = [
    ["작가", a.artist],
    ["제작연도", a.year ?? "—"],
    ["미술관", MUSEUMS[a.museum] ?? a.museum],
    ["라이선스", a.license],
    ["크레딧", a.credit_line ?? "—"],
    ["원본 크기", a.width && a.height ? `${a.width.toLocaleString()} × ${a.height.toLocaleString()}px` : "—"],
    ["출처", <a key="s" href={a.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:decoration-accent">미술관 작품 페이지 ↗</a>],
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10 max-lg:pb-24 sm:px-8">
      <Link href="/#gallery" className="text-sm text-muted hover:text-ink">← 갤러리</Link>
      <h1 className="mt-6 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{a.title}</h1>
      <p className="mt-3 text-base text-muted">
        {[a.artist, a.year, MUSEUMS[a.museum] ?? a.museum].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-12">
        <WallpaperPicker artworkId={a.id} wallpapers={a.wallpapers} title={a.title} original={{ url: a.original_url, width: a.width, height: a.height }}>
          <dl className="grid gap-y-3 border-t border-line pt-6 text-sm grid-cols-[88px_1fr]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </WallpaperPicker>
      </div>
    </div>
  );
}
