"use client";

import { useEffect, useState } from "react";

const KEY = "mos:hide-text";

/** Gallery "photos only" switch (#14, #19): hides per-card text (museum name, device links, hover caption). */
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

  // #19: icon + on/off switch only (no text label). On = photos-only mode.
  return (
    <button
      type="button"
      role="switch"
      onClick={toggle}
      aria-checked={hidden}
      aria-label="사진만 보기"
      title={hidden ? "정보 보이기" : "사진만 보기"}
      className="group flex h-9 items-center gap-2 border border-line px-2 text-ink transition-colors hover:border-ink"
    >
      <span aria-hidden="true" className="text-base leading-none">🖼️</span>
      <span
        aria-hidden="true"
        className={`relative inline-block h-5 w-9 rounded-full transition-colors ${hidden ? "bg-ink" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-bg shadow transition-transform ${hidden ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}
