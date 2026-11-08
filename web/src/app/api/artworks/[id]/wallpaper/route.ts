import { NextResponse } from "next/server";
import { DEVICES, type DeviceType, type FitMode } from "@/lib/devices";
import { getArtwork } from "@/lib/queries";
import { RenderError, renderWallpaper } from "@/lib/render";

export const runtime = "nodejs";
export const maxDuration = 60;

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/**
 * On-demand wallpaper: uses the pre-generated file when one exists, otherwise downloads the
 * museum original and renders it right now (nothing is stored).
 *   GET /api/artworks/:id/wallpaper?device=laptop&mode=fill
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url);
  const device = url.searchParams.get("device") as DeviceType | null;
  const mode = (url.searchParams.get("mode") ?? "fill") as FitMode;
  if (!device || !DEVICES.some((d) => d.type === device) || (mode !== "fit" && mode !== "fill")) {
    return NextResponse.json({ error: "device/mode가 올바르지 않아요." }, { status: 400 });
  }
  const a = await getArtwork((await params).id);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stored = a.wallpapers.find((w) => w.device_type === device && w.fit_mode === mode);
  if (stored) return NextResponse.redirect(new URL(`/api/wallpapers/${stored.id}/download`, url), 307);

  try {
    const body = await renderWallpaper(a.original_url, device, mode);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="museum-on-screen_${slug(a.title) || "artwork"}_${device}_${mode}.jpg"`,
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    if (e instanceof RenderError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "월페이퍼를 만들지 못했어요." }, { status: 500 });
  }
}
