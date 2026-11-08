"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * next/image that shows a pulsing placeholder + spinner until the image has loaded,
 * then fades the image in. Must be rendered inside a `relative` container (uses `fill`).
 */
// The Art Institute of Chicago's image server answers 403 to our server-side requests (bot protection),
// so its images skip Next's optimizer and are loaded straight from the visitor's browser.
const BROWSER_ONLY = /^https:\/\/www\.artic\.edu\//;

export function LoadingImage({ className = "", onLoad, onError, unoptimized, ...props }: Omit<ImageProps, "fill">) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  // Images already in the browser cache can finish before hydration, so onLoad never fires.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setState("loaded");
  }, []);

  return (
    <>
      {state === "loading" && (
        <div aria-hidden className="glare-loop absolute inset-0 bg-line" />
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-line text-xs text-muted">이미지를 불러오지 못했어요</div>
      )}
      <Image
        {...props}
        unoptimized={unoptimized ?? (typeof props.src === "string" && BROWSER_ONLY.test(props.src))}
        ref={ref}
        fill
        onLoad={(e) => { setState("loaded"); onLoad?.(e); }}
        onError={(e) => { setState("error"); onError?.(e); }}
        className={`${className} transition-opacity duration-500 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
