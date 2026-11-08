import { VISIBLE_MUSEUMS } from "@/lib/devices";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-24 sm:px-8 sm:py-36 md:grid-cols-2 md:items-end">
        <div>
          <p className="font-serif text-3xl leading-tight">Bring the museum<br />to your screen.</p>
          <p className="mt-3 text-sm text-muted">미술관을 내 화면 속으로.</p>
        </div>
        <div className="text-sm leading-relaxed text-muted md:text-right">
          <p>모든 작품은 CC0 또는 퍼블릭 도메인으로 공개된 이미지이며, 각 작품 페이지에 출처와 크레딧을 표시합니다.</p>
          <p className="mt-2">{VISIBLE_MUSEUMS.map(([, v]) => v).join(" · ")}</p>
        </div>
      </div>
    </footer>
  );
}
