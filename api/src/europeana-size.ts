import { getJson } from "./http.js";

/**
 * Europeana's search API has no image size. IIIF images (Nationalmuseum) report it in info.json;
 * for the rest (Slovak National Gallery) it's in the record's web resource metadata.
 */
export async function europeanaSize(
  originalUrl: string,
  sourceId: string,
  key: string,
): Promise<{ width: number; height: number } | null> {
  try {
    if (originalUrl.includes("/iiif/")) {
      const info = await getJson<{ width?: number; height?: number }>(originalUrl.replace(/\/full\/.*$/, "/info.json"));
      return info.width && info.height ? { width: info.width, height: info.height } : null;
    }
    const rec = await getJson<any>(`https://api.europeana.eu/record/v2/${sourceId}.json?wskey=${key}`);
    const hosts = (u: string) => u.replace(/^https?:/, "");
    for (const agg of rec.object?.aggregations ?? []) {
      for (const w of agg.webResources ?? []) {
        if (hosts(w.about) === hosts(originalUrl) && w.ebucoreWidth && w.ebucoreHeight) {
          return { width: w.ebucoreWidth, height: w.ebucoreHeight };
        }
      }
    }
  } catch {
    // leave the size empty; the backfill script can retry
  }
  return null;
}
