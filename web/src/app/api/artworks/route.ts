import { NextResponse } from "next/server";
import { listArtworks } from "@/lib/queries";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const res = await listArtworks({ q: p.get("q") ?? undefined, museum: p.get("museum") ?? undefined, page: Number(p.get("page")) || 1, shuffle: Number(p.get("shuffle")) || undefined });
  return NextResponse.json(res);
}
