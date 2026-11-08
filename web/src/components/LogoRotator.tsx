"use client";

import { useEffect, useRef, useState } from "react";

const HOLD_MS = 3200; // how long each slide stays
const SLIDE_MS = 650; // slide animation

/** Slides: service name → English slogan → Korean slogan, then loops. All share one fixed line height. */
const SLIDES = [
  <span key="title" className="font-brand text-2xl tracking-tight">
    Museum <em className="font-serif text-[1.12em] font-normal">on</em> Screen
  </span>,
  <span key="en" className="font-serif text-[26px] tracking-tight">
    Bring the museum <em className="text-muted">to your screen.</em>
  </span>,
  <span key="ko" className="text-base font-medium">미술관을 내 화면 속으로.</span>,
];

/** Vertical "slide-over" rotator. The first slide is cloned at the end so the loop keeps moving upward. */
export function LogoRotator() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const paused = useRef(false);
  const [reduced, setReduced] = useState(true); // render static until we know

  useEffect(() => {
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (paused.current || document.hidden) return;
      setAnimate(true);
      setIndex((i) => i + 1);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [reduced]);

  // After sliding onto the clone of slide 0, jump back to the real slide 0 without animation.
  useEffect(() => {
    if (index !== SLIDES.length) return;
    const t = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, SLIDE_MS + 50);
    return () => clearTimeout(t);
  }, [index]);

  const slides = [...SLIDES, SLIDES[0]];
  return (
    <span
      aria-hidden
      className="block h-8 overflow-hidden"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      <span
        className="block"
        style={{
          transform: `translateY(-${index * 2}rem)`,
          transition: animate && !reduced ? `transform ${SLIDE_MS}ms cubic-bezier(.65,0,.25,1)` : "none",
        }}
      >
        {slides.map((s, i) => (
          <span key={i} className="flex h-8 items-center whitespace-nowrap leading-none">{s}</span>
        ))}
      </span>
    </span>
  );
}
