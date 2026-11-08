"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * next/image that shows a pulsing placeholder + spinner until the image has loaded,
 * then fades the image in. Must be rendered inside a `relative` container (uses `fill`).
 */
export function LoadingImage({ className = "", onLoad, onError, ...props }: Omit<ImageProps, "fill">) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  // Images already in the browser cache can finish before hydration, so onLoad never fires.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setState("loaded");
  }, []);

  return (
    <>
      {state === "loading" && (
        <div aria-hidden className="absolute inset-0 flex animate-pulse items-center justify-center gap-2 bg-line">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="dot-wave h-2 w-2 rounded-full bg-ink" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-line text-xs text-muted">이미지를 불러오지 못했어요</div>
      )}
      <Image
        {...props}
        ref={ref}
        fill
        onLoad={(e) => { setState("loaded"); onLoad?.(e); }}
        onError={(e) => { setState("error"); onError?.(e); }}
        className={`${className} transition-opacity duration-500 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
