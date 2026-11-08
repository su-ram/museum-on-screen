import { NextResponse } from "next/server";
import { getArtwork } from "@/lib/queries";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getArtwork((await params).id);
  return a ? NextResponse.json(a) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
