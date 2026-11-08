export type DeviceType = "mobile" | "mobile_qhd" | "laptop" | "desktop";
export type FitMode = "fit" | "fill";

export const PRESETS: Record<DeviceType, { width: number; height: number }> = {
  mobile: { width: 1290, height: 2796 },
  mobile_qhd: { width: 1440, height: 3200 },
  laptop: { width: 2560, height: 1600 },
  desktop: { width: 2560, height: 1440 },
};

export const FIT_BACKGROUND = "#171717";
export const JPEG_QUALITY = 95;
