import { adminClient } from "./supabase.js";
import type { Artwork } from "./types.js";

export function toRow(a: Artwork) {
  return {
    museum: a.source,
    external_id: a.sourceId,
    title: a.title,
    artist: a.artist,
    year: a.year ?? null,
    original_url: a.originalImageUrl,
    thumbnail_url: a.thumbnailUrl ?? null,
    width: a.width ?? null,
    height: a.height ?? null,
    license: a.license,
    is_public_domain: a.isPublicDomain,
    credit_line: a.creditLine ?? null,
    source_url: a.sourceUrl,
  };
}

/** Upsert on (museum, external_id). focal_point_* are left untouched on conflict. */
export async function upsertArtworks(artworks: Artwork[]): Promise<number> {
  const supabase = adminClient();
  const rows = artworks.filter((a) => a.isPublicDomain).map(toRow);
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase
      .from("artworks")
      .upsert(rows.slice(i, i + 200), { onConflict: "museum,external_id" });
    if (error) throw new Error(`upsert failed: ${error.message}`);
  }
  return rows.length;
}
