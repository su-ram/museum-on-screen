"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RetryButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tries, setTries] = useState(0);
  return (
    <button
      onClick={() => { setTries((n) => n + 1); start(() => router.refresh()); }}
      disabled={pending}
      className="mt-4 inline-flex h-10 items-center rounded-none bg-ink px-4 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-[#06231a] disabled:opacity-50"
    >
      {pending ? "불러오는 중…" : tries ? "다시 시도" : "다시 불러오기"}
    </button>
  );
}
