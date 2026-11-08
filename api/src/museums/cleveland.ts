import { getJson } from "../http.js";
import type { Artwork, MuseumClient, SearchOptions } from "../types.js";

const BASE = "https://openaccess-api.clevelandart.org/api/artworks/";

interface CmaImage { url: string; width?: string; height?: string }
interface CmaArtwork {
  id: number;
  title: string;
  url: string;
  creation_date?: string;
  creditline?: string;
  share_license_status: string;
  creators?: { description: string }[];
  images?: { web?: CmaImage; print?: CmaImage; full?: CmaImage } | null;
}

export const cleveland: MuseumClient = {
  source: "cleveland",
  async search({ query, page = 1, limit = 20 }: SearchOptions) {
    const url =
      `${BASE}?q=${encodeURIComponent(query)}&has_image=1&cc0=1` +
      `&limit=${limit}&skip=${(page - 1) * limit}`;
    const { data } = await getJson<{ data: CmaArtwork[] }>(url);
    const out: Artwork[] = [];
    for (const a of data) {
      if (a.share_license_status !== "CC0") continue;
      // `full` is a TIFF (huge); `print` is a high-res JPEG suitable for processing.
      const img = a.images?.print ?? a.images?.web ?? a.images?.full;
      if (!img?.url) continue;
      out.push({
        id: `cleveland:${a.id}`,
        source: "cleveland",
        sourceId: String(a.id),
        title: a.title,
        artist: a.creators?.[0]?.description?.split("(")[0]?.trim() || "Unknown",
        originalImageUrl: img.url,
        thumbnailUrl: a.images?.web?.url,
        width: img.width ? Number(img.width) : undefined,
        height: img.height ? Number(img.height) : undefined,
        year: a.creation_date || undefined,
        creditLine: a.creditline || undefined,
        isPublicDomain: true,
        sourceMuseum: "The Cleveland Museum of Art",
        license: "CC0",
        sourceUrl: a.url,
      });
    }
    return out;
  },
};
