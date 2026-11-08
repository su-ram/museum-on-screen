import { NextResponse } from "next/server";
import { listArtworks } from "@/lib/queries";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return NextResponse.json(await listArtworks({ q: p.get("q") ?? "", page: Number(p.get("page")) || 1 }));
}
