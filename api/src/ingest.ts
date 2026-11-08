/**
 * Collect public-domain artworks from the museum APIs and store them in Supabase.
 *
 *   npm run ingest -- --dry-run                 # print only, no DB needed
 *   npm run ingest -- --per-museum 7 --query monet --query "van gogh"
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (not needed with --dry-run)
 */
import { upsertArtworks } from "./db.js";
import { clients, type Artwork, type ClientSource } from "./index.js";

function args(name: string): string[] {
  const out: string[] = [];
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i] === `--${name}` && a[i + 1]) out.push(a[++i]!);
  return out;
}
const dryRun = process.argv.includes("--dry-run");
const perMuseum = Number(args("per-museum")[0] ?? 7);
const queries = args("query").length ? args("query") : ["monet", "van gogh", "landscape", "flowers"];
const sources = (args("museum").length ? args("museum") : ["cleveland", "aic", "met"]) as ClientSource[];

const collected = new Map<string, Artwork>();
for (const source of sources) {
  let n = 0;
  for (const q of queries) {
    if (n >= perMuseum) break;
    try {
      const found = await clients[source].search({ query: q, limit: perMuseum * 2 });
      for (const a of found) {
        if (n >= perMuseum) break;
        // Rights gate: no license info / not public domain => never ingested.
        if (!a.isPublicDomain || !a.license || collected.has(a.id)) continue;
        collected.set(a.id, a);
        n++;
      }
    } catch (e) {
      console.warn(`[${source}] "${q}" failed: ${(e as Error).message}`);
    }
  }
  console.log(`[${source}] collected ${n}`);
}

const list = [...collected.values()];
if (dryRun) {
  for (const a of list) console.log(`${a.id}\t${a.title} — ${a.artist} (${a.year ?? "?"})`);
  console.log(`dry-run: ${list.length} artworks, nothing written`);
} else {
  console.log(`upserted ${await upsertArtworks(list)} artworks`);
}
