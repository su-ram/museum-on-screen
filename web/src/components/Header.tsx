import Link from "next/link";
import { Suspense } from "react";
import { HeaderSearch } from "./HeaderSearch";
import { LogoRotator } from "./LogoRotator";
import { MuseumFilter } from "./MuseumFilter";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 sm:px-8 lg:h-16 lg:flex-nowrap lg:py-0">
        <Link href="/" aria-label="Museum on Screen — Bring the museum to your screen. 홈으로" className="shrink-0">
          <LogoRotator />
        </Link>
        <div className="order-last flex w-full min-w-0 items-center gap-2 lg:order-none lg:w-auto lg:flex-1 lg:justify-center">
          <Suspense><HeaderSearch /></Suspense>
          <Suspense><MuseumFilter /></Suspense>
        </div>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/#gallery" className="hidden text-muted sm:inline transition-colors hover:text-ink">갤러리</Link>
          <Link href="/about" className="text-muted transition-colors hover:text-ink">소개</Link>
        </nav>
      </div>
    </header>
  );
}
