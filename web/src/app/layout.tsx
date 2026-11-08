import type { Metadata } from "next";
import { DM_Serif_Display, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import { CuteCursor } from "@/components/CuteCursor";
import { Header } from "@/components/Header";
import { TopLoader } from "@/components/TopLoader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-dm-serif" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: { default: "Museum on Screen — Bring the museum to your screen", template: "%s · Museum on Screen" },
  description: "미술관을 내 화면 속으로. 퍼블릭 도메인 명화를 내 기기 비율에 맞춘 고해상도 배경화면으로 무료 다운로드하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${instrument.variable} ${dmSerif.variable}`}>
      <body className="flex min-h-screen flex-col">
        <CuteCursor />
        <Suspense><TopLoader /></Suspense>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
