import { getJson, mapLimit } from "../http.js";
import type { Artwork, MuseumClient, SearchOptions } from "../types.js";

const BASE = "https://collectionapi.metmuseum.org/public/collection";

interface MetSearch { total: number; objectIDs: number[] | null }
interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  artistDisplayName: string;
  objectURL: string;
  objectDate: string;
  creditLine: string;
}

export const met: MuseumClient = {
  source: "met",
  async search({ query, page = 1, limit = 20 }: SearchOptions) {
    // v1 search was retired 2026-10-01; v1.1 is paginated via offset/limit.
    const url =
      `${BASE}/v1.1/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(query)}` +
      `&offset=${(page - 1) * limit}&limit=${limit}`;
    const { objectIDs } = await getJson<MetSearch>(url);
    const ids = objectIDs ?? [];
    // Met search returns IDs only; fetch details (modest concurrency to respect ~80 req/s limit).
    const objs = await mapLimit(ids, 2, (id) =>
      getJson<MetObject>(`${BASE}/v1/objects/${id}`).catch(() => null),
    );
    const out: Artwork[] = [];
    for (const o of objs) {
      if (!o || !o.isPublicDomain || !o.primaryImage) continue;
      out.push({
        id: `met:${o.objectID}`,
        source: "met",
        sourceId: String(o.objectID),
        title: o.title,
        artist: o.artistDisplayName || "Unknown",
        originalImageUrl: o.primaryImage,
        thumbnailUrl: o.primaryImageSmall || undefined,
        year: o.objectDate || undefined,
        creditLine: o.creditLine || undefined,
        isPublicDomain: true,
        sourceMuseum: "The Metropolitan Museum of Art",
        license: "CC0",
        sourceUrl: o.objectURL,
      });
    }
    return out;
  },
};
