import { aic } from "./museums/aic.js";
import { cleveland } from "./museums/cleveland.js";
import { met } from "./museums/met.js";
import type { Artwork, MuseumClient, MuseumSource, SearchOptions } from "./types.js";

export * from "./types.js";
export { aic, cleveland, met };

export const clients: Record<MuseumSource, MuseumClient> = { met, cleveland, aic };

/** Search all (or selected) museums in parallel; a failing museum doesn't break the others. */
export async function searchAll(
  opts: SearchOptions,
  sources: MuseumSource[] = ["met", "cleveland", "aic"],
): Promise<{ artworks: Artwork[]; errors: Partial<Record<MuseumSource, string>> }> {
  const errors: Partial<Record<MuseumSource, string>> = {};
  const results = await Promise.all(
    sources.map((s) =>
      clients[s].search(opts).catch((e: Error) => {
        errors[s] = e.message;
        return [] as Artwork[];
      }),
    ),
  );
  return { artworks: results.flat(), errors };
}
