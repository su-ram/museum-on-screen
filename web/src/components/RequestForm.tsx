"use client";

import { useState } from "react";

const KINDS = [
  ["museum", "미술관/컬렉션 추가"],
  ["artwork", "작품·이미지 문제 신고"],
  ["feature", "기능 제안"],
  ["other", "기타"],
] as const;

const field = "w-full rounded-none border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-ink";

export function RequestForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청을 보내지 못했어요.");
      setState("done");
      form.reset();
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="border border-line p-6">
        <p className="text-base font-medium">요청이 접수됐어요. 고마워요!</p>
        <button onClick={() => setState("idle")} className="mt-4 text-sm text-muted underline underline-offset-4 hover:text-ink">다른 요청 보내기</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 border border-line p-6">
      <p className="text-sm leading-relaxed text-muted">
        추가했으면 하는 미술관, 작품이나 이미지 문제, 기능 아이디어를 알려 주세요. 내용은 공개 GitHub 이슈로 등록되니 개인정보는 적지 말아 주세요.
      </p>
      {/* Honeypot: real users never see or fill this. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        종류
        <select name="kind" required defaultValue="" className={field}>
          <option value="" disabled>선택해 주세요</option>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        제목
        <input name="title" required minLength={2} maxLength={100} placeholder="예: 국립중앙박물관 소장품 추가" className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        내용
        <textarea name="message" required minLength={5} maxLength={3000} rows={5} placeholder="자세히 알려 주세요. 참고 링크가 있으면 함께 적어 주세요." className={`${field} resize-y`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="inline-flex h-10 items-center justify-center self-start rounded-none bg-ink px-5 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-[#06231a] disabled:opacity-50">
        {state === "sending" ? "보내는 중…" : "Submit a request"}
      </button>
    </form>
  );
}
