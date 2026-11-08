"use client";

import { useState } from "react";

/**
 * Download link that works like a normal <a href> without JS, but with JS shows a "creating…" state
 * while the server renders the wallpaper (can take several seconds), then saves the file.
 * Errors from the server are shown inline instead of navigating to a raw JSON page.
 */
export function DownloadLink({
  href, className, busyClassName = "", children, busyLabel = "만드는 중…",
}: { href: string; className?: string; busyClassName?: string; children: React.ReactNode; busyLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" etc. work
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "다운로드하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "museum-on-screen.jpg";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <a
        href={href}
        onClick={onClick}
        aria-busy={busy}
        className={`${className ?? ""} ${busy ? `animate-pulse cursor-progress ${busyClassName}` : ""}`}
      >
        {busy ? busyLabel : children}
      </a>
      {error && <span role="alert" className="mt-1 block basis-full text-xs text-red-600">{error}</span>}
    </>
  );
}
