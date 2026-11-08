import { NextResponse } from "next/server";
import { getWallpaper } from "@/lib/queries";

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/** Streams the pre-generated file as an attachment (no image processing at request time). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const w = await getWallpaper((await params).id);
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const upstream = await fetch(w.url);
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  const name = `museum-on-screen_${slug(w.artworks.title) || "artwork"}_${w.device_type}_${w.fit_mode}.${w.format}`;
  return new Response(upstream.body, {
    headers: {
      "Content-Type": w.format === "png" ? "image/png" : "image/jpeg",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
