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
};
