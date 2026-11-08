import sharp from "sharp";
import { FIT_BACKGROUND, JPEG_QUALITY, PRESETS, type DeviceType, type FitMode } from "./presets.js";

export interface SourceInfo { width: number; height: number }
export interface FocalPoint { x: number; y: number }

/**
 * Scale factor needed to produce the preset from the source.
 * fit  -> artwork shown whole, so scale = min(tw/sw, th/sh)
 * fill -> artwork covers the screen, so scale = max(tw/sw, th/sh)
 */
export function requiredScale(src: SourceInfo, device: DeviceType, mode: FitMode): number {
  const { width: tw, height: th } = PRESETS[device];
  const rx = tw / src.width;
  const ry = th / src.height;
  return mode === "fit" ? Math.min(rx, ry) : Math.max(rx, ry);
}

/** We never upscale: a preset is offered only if the source has enough pixels. */
export function isSupported(src: SourceInfo, device: DeviceType, mode: FitMode): boolean {
  return requiredScale(src, device, mode) <= 1;
}

export async function render(
  input: Buffer,
  device: DeviceType,
  mode: FitMode,
  focal: FocalPoint = { x: 0.5, y: 0.5 },
): Promise<Buffer> {
  const { width, height } = PRESETS[device];
  const base = sharp(input, { limitInputPixels: false }).rotate().toColourspace("srgb");
  const jpeg = { quality: JPEG_QUALITY, chromaSubsampling: "4:4:4", mozjpeg: true } as const;

  if (mode === "fit") {
    return base
      .resize(width, height, { fit: "contain", background: FIT_BACKGROUND, withoutEnlargement: false })
      .jpeg(jpeg)
      .toBuffer();
  }

  // Fill: scale to cover, then crop around the focal point (sharp's `position` can't take x/y).
  const { data, info } = await base
    .resize(width, height, { fit: "outside" })
    .toBuffer({ resolveWithObject: true });
  const left = clamp(Math.round(focal.x * info.width - width / 2), 0, info.width - width);
  const top = clamp(Math.round(focal.y * info.height - height / 2), 0, info.height - height);
  return sharp(data).extract({ left, top, width, height }).jpeg(jpeg).toBuffer();
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
