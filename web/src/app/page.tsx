import Link from "next/link";
import { Suspense } from "react";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ShuffleButton } from "@/components/ShuffleButton";
import { RetryButton } from "@/components/RetryButton";
import { listArtworks, PAGE_SIZE } from "@/lib/queries";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; museum?: string; page?: string; shuffle?: string }> }) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  let result: Awaited<ReturnType<typeof listArtworks>> | null = null;
  try {
    result = await listArtworks({ q: sp.q, museum: sp.museum, page, shuffle: Number(sp.shuffle) || undefined });
  } catch (e) {
    console.error(e);
  }
  const pages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;
  const href = (p: number) => {
    const n = new URLSearchParams();
    if (sp.q) n.set("q", sp.q);
    if (sp.museum) n.set("museum", sp.museum);
    if (sp.shuffle) n.set("shuffle", sp.shuffle);
    if (p > 1) n.set("page", String(p));
    return `/?${n.toString()}#gallery`;
  };

  return (
    <>
      <section id="gallery" className="mx-auto max-w-[1600px] scroll-mt-20 px-5 pt-5 sm:px-8 sm:pt-6">
        <h1 className="sr-only">Museum on Screen — Bring the museum to your screen. 미술관을 내 화면 속으로.</h1>
        {result && (
          <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted">
            <ShuffleButton />
            <span>{result.total.toLocaleString()}점</span>
          </div>
        )}

        {!result ? (
          <div className="mt-10 py-8 text-muted">
            <p>작품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
            <RetryButton />
          </div>
        ) : result.artworks.length === 0 ? (
          <p className="mt-10 py-8 text-muted">조건에 맞는 작품이 없어요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
            {result.artworks.map((a) => <ArtworkCard key={a.id} artwork={a} />)}
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-14 flex items-center justify-center gap-3 text-sm font-medium">
            {page > 1 && <Link href={href(page - 1)} className="rounded-none border border-line px-3.5 py-2 text-sm hover:border-ink">← 이전</Link>}
            <span className="text-muted">{page} / {pages}</span>
            {page < pages && <Link href={href(page + 1)} className="rounded-none border border-line px-3.5 py-2 text-sm hover:border-ink">다음 →</Link>}
          </nav>
        )}
      </section>
    </>
  );
}
