export type DeviceType = "mobile" | "mobile_qhd" | "laptop" | "desktop";
export type FitMode = "fit" | "fill";

export const DEVICES: { type: DeviceType; label: string; width: number; height: number; kind: "phone" | "screen" }[] = [
  { type: "mobile", label: "Mobile", width: 1290, height: 2796, kind: "phone" },
  { type: "mobile_qhd", label: "Mobile QHD", width: 1440, height: 3200, kind: "phone" },
  { type: "laptop", label: "Laptop", width: 2560, height: 1600, kind: "screen" },
  { type: "desktop", label: "Desktop", width: 2560, height: 1440, kind: "screen" },
];

export const MODES: { type: FitMode; label: string; hint: string }[] = [
  { type: "fill", label: "Fill", hint: "화면 가득 채우기 (일부 잘림)" },
  { type: "fit", label: "Fit", hint: "작품 전체 보기 (여백 포함)" },
];

export const MUSEUMS: Record<string, string> = {
  met: "The Met",
  cleveland: "Cleveland Museum of Art",
  aic: "Art Institute of Chicago",
  smk: "SMK — National Gallery of Denmark",
  nga: "National Gallery of Art",
};

export const FIT_BACKGROUND = "#171717";
export const JPEG_QUALITY = 95;

/** Scale needed to produce a preset from a source: fit = artwork whole, fill = covers the screen. */
export function requiredScale(src: { width: number; height: number }, device: DeviceType, mode: FitMode): number {
  const d = DEVICES.find((x) => x.type === device)!;
  const rx = d.width / src.width;
  const ry = d.height / src.height;
  return mode === "fit" ? Math.min(rx, ry) : Math.max(rx, ry);
}

/** We never upscale. When the source size is unknown we optimistically allow it (the server re-checks). */
export function canMake(src: { width: number | null; height: number | null }, device: DeviceType, mode: FitMode): boolean {
  if (!src.width || !src.height) return true;
  return requiredScale({ width: src.width, height: src.height }, device, mode) <= 1;
}
