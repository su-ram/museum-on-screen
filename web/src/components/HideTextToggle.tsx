"use client";

import { useEffect, useState } from "react";

const KEY = "mos:hide-text";

/** Gallery "photos only" toggle (#14): hides per-card text (museum name, device links, hover caption). */
export function HideTextToggle() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(KEY) === "1");
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-hide-text", hidden);
  }, [hidden]);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem(KEY, next ? "1" : "0");
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "작품 정보 보이기" : "작품 정보 숨기기"}
      title={hidden ? "정보 보이기" : "사진만 보기"}
      className={`h-9 border px-3 text-sm transition-colors ${hidden ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink"}`}
    >
      {hidden ? "정보 보기" : "사진만"}
    </button>
  );
}
