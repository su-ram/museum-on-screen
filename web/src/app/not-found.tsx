import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-32 sm:px-8">
      <h1 className="font-serif text-6xl">찾을 수 없는 작품이에요.</h1>
      <Link href="/#gallery" className="mt-8 inline-flex h-10 items-center rounded-none bg-ink px-4 text-sm font-medium text-bg">갤러리로 돌아가기</Link>
    </div>
  );
}
