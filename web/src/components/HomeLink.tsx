"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Link to the gallery that also re-fetches when you are already there. Next skips the fetch when the
 * target URL equals the current one (only the #hash differs), so a failed/stale list could never be
 * recovered by clicking the logo or the "갤러리" nav item.
 */
export function HomeLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && pathname === "/" && params.toString() === "") router.refresh();
      }}
    />
  );
}
