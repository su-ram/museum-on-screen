"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ORIENTATIONS } from "@/lib/devices";
import { startNavProgress } from "./TopLoader";

/** Gallery filter by image shape (#11): 전체 / 가로 / 세로. */
export function OrientationFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("orientation") ?? "";

  function change(value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set("orientation", value); else sp.delete("orientation");
    sp.delete("page");
    startNavProgress();
    router.replace(`/?${sp.toString()}#gallery`, { scroll: false });
  }

  const pill = (active: boolean) =>
    `h-9 border px-3 text-sm transition-colors ${active ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink"}`;

  return (
    <div role="group" aria-label="이미지 비율" className="flex gap-1">
      <button onClick={() => change("")} className={pill(!current)} aria-pressed={!current}>전체</button>
      {ORIENTATIONS.map((o) => (
        <button key={o.type} onClick={() => change(o.type)} className={pill(current === o.type)} aria-pressed={current === o.type}>{o.label}</button>
      ))}
    </div>
  );
}
