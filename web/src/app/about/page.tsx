import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/RequestForm";
import { MUSEUMS } from "@/lib/devices";

export const metadata: Metadata = { title: "소개" };

const STEPS = [
  ["작품 고르기", "갤러리에서 작가나 작품명으로 검색하고 미술관별로 둘러보세요."],
  ["기기 선택", "모바일, 노트북, 데스크톱 중 내 화면에 맞는 비율을 고르세요."],
  ["맞춤 방식", "Fill은 화면을 가득 채우고, Fit은 작품 전체를 여백과 함께 보여줘요."],
  ["다운로드", "고해상도 JPG를 바로 내려받거나 미술관 원본 이미지를 받을 수 있어요."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
        Bring the museum <em className="text-muted">to your screen.</em>
      </h1>
      <p className="mt-4 text-xl font-medium">미술관을 내 화면 속으로.</p>
      <p className="mt-6 text-lg text-muted">
        Museum on Screen은 세계 주요 미술관의 퍼블릭 도메인 명화를 내 기기 비율에 맞춘 고해상도 배경화면으로 무료로 내려받는 서비스예요.
      </p>

      <h2 className="mt-16 text-sm font-medium text-muted">사용 방법</h2>
      <ol className="mt-4 divide-y divide-line border-y border-line">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="grid grid-cols-[2rem_8rem_1fr] gap-x-4 py-4 text-sm">
            <span className="text-muted">{i + 1}</span>
            <span className="font-medium">{title}</span>
            <span className="text-muted">{body}</span>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 text-sm font-medium text-muted">출처와 라이선스</h2>
      <p className="mt-4 text-sm leading-relaxed">
        모든 작품은 각 미술관이 CC0 또는 퍼블릭 도메인으로 공개한 이미지예요. 작품 페이지마다 미술관, 크레딧, 원본 출처 링크를 함께 보여줘요.
      </p>
      <ul className="mt-3 text-sm text-muted">
        {Object.values(MUSEUMS).map((m) => <li key={m}>· {m}</li>)}
      </ul>

      <Link href="/#gallery" className="mt-12 inline-flex h-10 items-center rounded-none bg-ink px-4 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-[#06231a]">
        갤러리 보기
      </Link>

      <h2 className="mt-20 text-sm font-medium text-muted">Submit a request</h2>
      <div className="mt-4">
        <RequestForm />
      </div>
    </div>
  );
}
