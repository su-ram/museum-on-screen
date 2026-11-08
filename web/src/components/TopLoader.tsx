"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export const NAV_START = "mos:nav-start";
export const startNavProgress = () => window.dispatchEvent(new Event(NAV_START));

/** Thin top progress bar: starts on link clicks / our search+filter changes, finishes when the URL commits. */
export function TopLoader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    if (safety.current) clearTimeout(safety.current);
  };

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clear();
    setProgress(100);
    setTimeout(() => { setVisible(false); setProgress(0); }, 250);
  }, []);

  const start = useCallback(() => {
    if (active.current) return;
    active.current = true;
    clear();
    setVisible(true);
    setProgress(8);
    // Trickle: always moves, never reaches 100 until the page commits.
    timer.current = setInterval(() => setProgress((p) => p + (90 - p) * 0.12), 200);
    safety.current = setTimeout(finish, 12000);
  }, [finish]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(NAV_START, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAV_START, start);
      clear();
    };
  }, [start]);

  // The URL committed → navigation finished.
  useEffect(() => { finish(); }, [pathname, params, finish]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}>
      <div className="h-full bg-accent shadow-[0_0_8px_var(--accent)]" style={{ width: `${progress}%`, transition: progress === 0 ? "none" : "width 200ms ease-out" }} />
    </div>
  );
}
