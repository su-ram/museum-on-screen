import { NextResponse } from "next/server";
import { getArtwork } from "@/lib/queries";

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/** Streams the original museum image as an attachment (public-domain / CC0 works only). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getArtwork((await params).id);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const upstream = await fetch(a.original_url, { headers: { "User-Agent": "museum-on-screen/0.1" } });
  // Some museums (e.g. AIC) refuse server-side requests; let the visitor's browser fetch it directly instead.
  if (upstream.status === 403) return NextResponse.redirect(a.original_url, 302);
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  const type = upstream.headers.get("content-type") ?? "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("tiff") ? "tif" : "jpg";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="museum-on-screen_${slug(a.title) || "artwork"}_original.${ext}"`,
    "Cache-Control": "public, max-age=3600",
  };
  const len = upstream.headers.get("content-length");
  if (len) headers["Content-Length"] = len;
  return new Response(upstream.body, { headers });
}
