import { NextResponse } from "next/server";
import { listArtworks } from "@/lib/queries";
import { isOrientation } from "@/lib/devices";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const res = await listArtworks({ q: p.get("q") ?? undefined, museum: p.get("museum") ?? undefined, orientation: isOrientation(p.get("orientation")) ? (p.get("orientation") as "landscape" | "portrait") : undefined, page: Number(p.get("page")) || 1, shuffle: Number(p.get("shuffle")) || undefined });
  return NextResponse.json(res);
}
