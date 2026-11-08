"use client";

import { useEffect } from "react";

/** Leaves a trail of black star dust, petals and confetti behind the mouse; bursts on click. */
export function CuteCursor() {
  useEffect(() => {
    // Only for real mice; skip touch devices and users who prefer reduced motion.
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;

    const GLYPHS = ["✦", "✿", "✧", "•"];
    let live = 0, lastX = -999, lastY = -999;

    const puff = (x: number, y: number, burst = false) => {
      if (live > 60) return;
      const el = document.createElement("span");
      const confetti = Math.random() < 0.35;
      const size = 7 + Math.random() * 9;
      el.setAttribute("aria-hidden", "true");
      Object.assign(el.style, {
        position: "fixed", left: "0", top: "0", zIndex: "59", pointerEvents: "none", color: "var(--ink)",
        fontSize: `${size}px`, lineHeight: "1", willChange: "transform, opacity",
        ...(confetti ? { width: `${size * 0.5}px`, height: `${size * 0.9}px`, background: "var(--ink)", borderRadius: "1px" } : {}),
      });
      if (!confetti) el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
      document.body.appendChild(el);
      live++;
      const spread = burst ? 70 : 24;
      const dx = (Math.random() - 0.5) * spread * 2;
      const dy = burst ? (Math.random() - 0.7) * spread * 2 : 14 + Math.random() * 26;
      const rot = (Math.random() - 0.5) * 360;
      const duration = burst ? 800 : 650 + Math.random() * 300;
      let done = false;
      const cleanup = () => { if (done) return; done = true; el.remove(); live--; };
      el.animate(
        [
          { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(1)`, opacity: 1 },
          { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${rot}deg) scale(0.3)`, opacity: 0 },
        ],
        { duration, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
      ).onfinish = cleanup;
      setTimeout(cleanup, duration + 300); // fallback if animations are throttled (background tab)
    };

    const move = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 16) {
        lastX = e.clientX; lastY = e.clientY;
        puff(e.clientX, e.clientY);
      }
    };
    const press = (e: MouseEvent) => { for (let i = 0; i < 9; i++) puff(e.clientX, e.clientY, true); };

    addEventListener("mousemove", move);
    addEventListener("mousedown", press);
    return () => {
      removeEventListener("mousemove", move);
      removeEventListener("mousedown", press);
    };
  }, []);

  return null;
}
