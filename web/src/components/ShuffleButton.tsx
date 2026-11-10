"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startNavProgress } from "./TopLoader";

/** Re-orders the gallery randomly: picks a fresh seed (kept in the URL so paging stays consistent). */
export function ShuffleButton() {
  const router = useRouter();
  const params = useSearchParams();

  function shuffle() {
    const sp = new URLSearchParams(params.toString());
    sp.set("shuffle", String(1 + Math.floor(Math.random() * 2147483646)));
    sp.delete("page");
    startNavProgress();
    router.replace(`/?${sp.toString()}#gallery`, { scroll: false });
  }

  return (
    <button
      onClick={shuffle}
      aria-label="작품 순서 랜덤으로 섞기"
      className="inline-flex h-9 items-center gap-1.5 rounded-none border border-line px-3.5 text-sm text-ink transition-colors hover:border-ink"
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h3c4 0 4 10 8 10h3M3 15h3c1.5 0 2.5-1.5 3.3-3M11 6.5C11.8 5.6 12.7 5 14 5h3M15 3l2 2-2 2M15 13l2 2-2 2" />
      </svg>
      섞기
    </button>
  );
}
