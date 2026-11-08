"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { startNavProgress } from "./TopLoader";

/** Search box in the top navigation. Works from any page; results always show on the gallery. */
export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("q") ?? "";
  const [q, setQ] = useState(current);
  const lastPushed = useRef(current);

  // Keep the box in sync when the URL changes elsewhere (e.g. browser back).
  useEffect(() => {
    setQ(current);
    lastPushed.current = current;
  }, [current]);

  function go(value: string, replace: boolean) {
    const sp = new URLSearchParams(pathname === "/" ? params.toString() : "");
    if (value.trim()) sp.set("q", value.trim()); else sp.delete("q");
    sp.delete("page");
    lastPushed.current = value.trim();
    const url = `/?${sp.toString()}#gallery`;
    startNavProgress();
    replace ? router.replace(url, { scroll: false }) : router.push(url);
  }

  // Live search while typing on the gallery page.
  useEffect(() => {
    if (pathname !== "/" || q.trim() === lastPushed.current) return;
    const t = setTimeout(() => go(q, true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pathname]);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); go(q, false); }}
      className="group relative min-w-0 flex-1 lg:max-w-sm"
    >
      {/* magnifier */}
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-ink" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); e.currentTarget.blur(); } }}
        placeholder="작가 또는 작품명 검색"
        aria-label="작가 또는 작품명 검색"
        className="h-9 w-full rounded-none border-0 bg-transparent pl-7 pr-8 text-sm outline-none placeholder:text-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {q ? (
          <button type="button" aria-label="검색어 지우기" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="flex h-6 w-6 items-center justify-center text-muted hover:text-ink">
            <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        ) : null}
      </div>
    </form>
  );
}
