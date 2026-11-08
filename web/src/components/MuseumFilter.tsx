"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MUSEUMS } from "@/lib/devices";
import { startNavProgress } from "./TopLoader";

export function MuseumFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const museum = params.get("museum") ?? "";

  function change(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set("museum", value); else sp.delete("museum");
    sp.delete("page");
    startNavProgress();
    router.replace(`/?${sp.toString()}#gallery`, { scroll: false });
  }

  return (
    <div className="relative shrink-0">
      <select
        value={museum}
        onChange={(e) => change(e.target.value)}
        aria-label="미술관 선택"
        className="h-9 w-32 appearance-none truncate rounded-none sm:w-auto border border-line bg-transparent pl-3.5 pr-9 text-sm font-normal outline-none focus-visible:outline-none transition-colors hover:border-ink focus:border-ink"
      >
        <option value="">전체 미술관</option>
        {Object.entries(MUSEUMS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
