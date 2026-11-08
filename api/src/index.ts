import { aic } from "./museums/aic.js";
import { cleveland } from "./museums/cleveland.js";
import { met } from "./museums/met.js";
import type { Artwork, ClientSource, MuseumClient, SearchOptions } from "./types.js";

export * from "./types.js";
export { aic, cleveland, met };

export const clients: Record<ClientSource, MuseumClient> = { met, cleveland, aic };

/** Search all (or selected) museums in parallel; a failing museum doesn't break the others. */
export async function searchAll(
  opts: SearchOptions,
  sources: ClientSource[] = ["met", "cleveland", "aic"],
): Promise<{ artworks: Artwork[]; errors: Partial<Record<ClientSource, string>> }> {
  const errors: Partial<Record<ClientSource, string>> = {};
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
