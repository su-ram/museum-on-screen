import { getJson } from "../http.js";
import type { Artwork, MuseumClient, SearchOptions } from "../types.js";

const BASE = "https://api.artic.edu/api/v1/artworks/search";

interface AicArtwork {
  id: number;
  title: string;
  artist_title: string | null;
  image_id: string | null;
  is_public_domain: boolean;
  date_display?: string | null;
  credit_line?: string | null;
  thumbnail?: { width?: number; height?: number } | null;
}
interface AicResponse { data: AicArtwork[]; config: { iiif_url: string; website_url: string } }

export const aic: MuseumClient = {
  source: "aic",
  async search({ query, page = 1, limit = 20 }: SearchOptions) {
    const fields = "id,title,artist_title,image_id,is_public_domain,date_display,credit_line,thumbnail";
    const url =
      `${BASE}?q=${encodeURIComponent(query)}&fields=${fields}` +
      `&query[term][is_public_domain]=true&page=${page}&limit=${limit}`;
    const { data, config } = await getJson<AicResponse>(url);
    const out: Artwork[] = [];
    for (const a of data) {
      if (!a.is_public_domain || !a.image_id) continue;
      // IIIF: "full/full" is the original size. NOTE: AIC's CDN may answer 403 (Cloudflare challenge) to bulk downloads; retry later.
      out.push({
        id: `aic:${a.id}`,
        source: "aic",
        sourceId: String(a.id),
        title: a.title,
        artist: a.artist_title || "Unknown",
        originalImageUrl: `${config.iiif_url}/${a.image_id}/full/full/0/default.jpg`,
        thumbnailUrl: `${config.iiif_url}/${a.image_id}/full/400,/0/default.jpg`,
        width: a.thumbnail?.width,
        height: a.thumbnail?.height,
        year: a.date_display || undefined,
        creditLine: a.credit_line || undefined,
        isPublicDomain: true,
        sourceMuseum: "The Art Institute of Chicago",
        license: "CC0",
        sourceUrl: `${config.website_url}/artworks/${a.id}`,
      });
    }
    return out;
  },
};
