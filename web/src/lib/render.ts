import sharp from "sharp";
import { DEVICES, FIT_BACKGROUND, JPEG_QUALITY, requiredScale, type DeviceType, type FitMode } from "./devices";

const MAX_BYTES = 150 * 1024 * 1024;
const MAX_PIXELS = 400_000_000;
const CONCURRENCY = 2; // each render holds the whole original in memory; the Fly VM is small
let active = 0;
const waiting: (() => void)[] = [];
async function acquire() {
  if (active < CONCURRENCY) { active++; return; }
  if (waiting.length >= 8) throw new RenderError(503, "지금 요청이 많아요. 잠시 후 다시 시도해 주세요.");
  await new Promise<void>((r) => waiting.push(r));
}
function release() { const next = waiting.shift(); if (next) next(); else active--; }

export class RenderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function download(url: string): Promise<Buffer> {
  const UA = "museum-on-screen/0.1";
  const res = await fetch(url, { headers: { "User-Agent": UA, "AIC-User-Agent": UA } }).catch(() => null);
  if (!res || !res.ok) throw new RenderError(502, `미술관 서버에서 원본을 가져오지 못했어요${res ? ` (HTTP ${res.status})` : ""}.`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new RenderError(413, "원본 파일이 너무 커서 월페이퍼를 만들 수 없어요. '원본' 다운로드를 이용해 주세요.");
  return Buffer.from(await res.arrayBuffer());
}

/** Renders one Fit/Fill wallpaper JPEG from the museum's original image (never upscales). */
export async function renderWallpaper(originalUrl: string, device: DeviceType, mode: FitMode): Promise<Buffer> {
  const { width, height } = DEVICES.find((d) => d.type === device)!;
  await acquire();
  try {
    const input = await download(originalUrl);
    const meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata().catch(() => {
      throw new RenderError(422, "원본 이미지를 읽을 수 없어요.");
    });
    const swap = (meta.orientation ?? 1) >= 5;
    const src = { width: swap ? meta.height! : meta.width!, height: swap ? meta.width! : meta.height! };
    if (!src.width || !src.height) throw new RenderError(422, "원본 이미지 크기를 알 수 없어요.");
    if (requiredScale(src, device, mode) > 1) throw new RenderError(422, "원본 해상도가 부족해서 이 기기용 월페이퍼는 만들 수 없어요.");

    const base = sharp(input, { limitInputPixels: MAX_PIXELS }).rotate().toColourspace("srgb");
    const jpeg = { quality: JPEG_QUALITY, chromaSubsampling: "4:4:4", mozjpeg: false } as const;
    if (mode === "fit") {
      return await base.resize(width, height, { fit: "contain", background: FIT_BACKGROUND }).jpeg(jpeg).toBuffer();
    }
    return await base.resize(width, height, { fit: "cover", position: "centre" }).jpeg(jpeg).toBuffer();
  } finally {
    release();
  }
}
