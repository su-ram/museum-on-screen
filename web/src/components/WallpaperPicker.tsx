"use client";

import { LoadingImage } from "@/components/LoadingImage";
import { useMemo, useState } from "react";
import { canMake, DEVICES, FIT_BACKGROUND, MODES, type DeviceType, type FitMode } from "@/lib/devices";
import type { Wallpaper } from "@/lib/queries";

type DeviceChoice = DeviceType | "original";

function PreviewImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  return <LoadingImage key={src} src={src} alt={alt} sizes="(min-width:1024px) 720px, 100vw" priority className={className} />;
}
export interface OriginalImage { url: string; width: number | null; height: number | null }

export function WallpaperPicker({ wallpapers, title, original, artworkId, children }: { wallpapers: Wallpaper[]; title: string; original: OriginalImage; artworkId: string; children?: React.ReactNode }) {
  const byKey = useMemo(() => new Map(wallpapers.map((w) => [`${w.device_type}:${w.fit_mode}`, w])), [wallpapers]);
  // A preset is available if it was pre-generated, or can be rendered on demand from the original (no upscaling).
  const makeable = (device: DeviceType, m: FitMode) => byKey.has(`${device}:${m}`) || canMake(original, device, m);
  const firstDevice = DEVICES.find((d) => makeable(d.type, "fill") || makeable(d.type, "fit"));
  const [choice, setChoice] = useState<DeviceChoice>(firstDevice?.type ?? "original");
  const isOriginal = choice === "original";
  const device: DeviceType = isOriginal ? "laptop" : choice;
  const [mode, setMode] = useState<FitMode>("fill");

  const dev = DEVICES.find((d) => d.type === device)!;
  const ratio = original.width && original.height ? original.width / original.height : 4 / 3;
  const modeAvailable = (m: FitMode) => makeable(device, m);
  const effectiveMode: FitMode = modeAvailable(mode) ? mode : modeAvailable("fill") ? "fill" : "fit";
  const current = byKey.get(`${device}:${effectiveMode}`);

  const pill = (active: boolean, disabled = false) =>
    `rounded-none border h-9 px-3.5 text-sm font-medium transition-colors ${
      disabled ? "cursor-not-allowed border-line text-muted/50 line-through" : active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-muted hover:border-ink hover:text-ink"
    }`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      {/* Preview */}
      <div className="flex min-h-[420px] items-center justify-center p-6 sm:p-10">
        {isOriginal ? (
          <div
            className="artwork-frame relative overflow-hidden rounded-none bg-line"
            style={{
              aspectRatio: `${ratio}`,
              width: `min(100%, calc(70vh * ${ratio}))`,
            }}
          >
            <PreviewImage key={original.url} src={original.url} alt={`${title} — 원본`} className="object-contain" />
          </div>
        ) : current || makeable(device, effectiveMode) ? (
          <div
            className={`artwork-frame relative overflow-hidden bg-line ${dev.kind === "phone" ? "rounded-[2.2rem] border-[7px] border-ink/90" : "rounded-none border-[6px] border-ink/90"}`}
            style={{
              aspectRatio: `${dev.width} / ${dev.height}`,
              height: dev.kind === "phone" ? "min(58vh, 520px)" : undefined,
              width: dev.kind === "phone" ? undefined : "min(100%, 720px)",
              // On-demand presets are previewed from the original: Fit shows it whole on the dark matte.
              backgroundColor: !current && effectiveMode === "fit" ? FIT_BACKGROUND : undefined,
            }}
          >
            {current ? (
              <PreviewImage key={current.url} src={current.url} alt={`${title} — ${dev.label} ${effectiveMode}`} className="object-cover" />
            ) : (
              <PreviewImage key={`${original.url}:${effectiveMode}`} src={original.url} alt={`${title} — ${dev.label} ${effectiveMode}`} className={effectiveMode === "fit" ? "object-contain" : "object-cover"} />
            )}
          </div>
        ) : (
          <p className="text-muted">이 기기용 이미지가 없어요.</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted">기기</h3>
          <div className="flex flex-wrap gap-2">
            {DEVICES.map((d) => {
              const has = makeable(d.type, "fill") || makeable(d.type, "fit");
              return (
                <button key={d.type} disabled={!has} onClick={() => setChoice(d.type)} className={pill(choice === d.type, !has)} title={has ? `${d.width}×${d.height}` : "원본 해상도가 부족해요"}>
                  {d.label}
                </button>
              );
            })}
            <button onClick={() => setChoice("original")} className={pill(isOriginal)}>원본</button>
          </div>
          <p className="mt-2 text-xs text-muted">{isOriginal ? (original.width && original.height ? `${original.width.toLocaleString()} × ${original.height.toLocaleString()}px` : "") : `${dev.width} × ${dev.height}px`}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-muted">맞춤 방식</h3>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button key={m.type} disabled={isOriginal || !modeAvailable(m.type)} onClick={() => setMode(m.type)} className={pill(!isOriginal && effectiveMode === m.type, isOriginal || !modeAvailable(m.type))}>
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{MODES.find((m) => m.type === effectiveMode)?.hint}</p>
        </div>

        {isOriginal ? (
          <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-line max-lg:bg-bg/95 max-lg:px-5 max-lg:py-3 max-lg:backdrop-blur">
            <a href={`/api/artworks/${artworkId}/original`} className="flex h-10 items-center justify-center rounded-none bg-ink px-4 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-[#06231a]">
              다운로드 · 원본
            </a>
          </div>
        ) : (
          (current || makeable(device, effectiveMode)) && (
            <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-line max-lg:bg-bg/95 max-lg:px-5 max-lg:py-3 max-lg:backdrop-blur">
              <a href={current ? `/api/wallpapers/${current.id}/download` : `/api/artworks/${artworkId}/wallpaper?device=${device}&mode=${effectiveMode}`} className="flex h-10 items-center justify-center rounded-none bg-ink px-4 text-sm font-medium text-bg transition-colors hover:bg-accent hover:text-[#06231a]">
                다운로드 · JPG{current?.file_size ? ` · ${(current.file_size / 1048576).toFixed(1)}MB` : ""}
              </a>
              {!current && <p className="mt-2 text-xs text-muted">다운로드할 때 만들어져서 몇 초 걸릴 수 있어요.</p>}
            </div>
          )
        )}
        {children}
      </div>
    </div>
  );
}
