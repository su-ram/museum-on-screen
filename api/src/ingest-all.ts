/**
 * Metadata-only bulk ingest: walks each museum's whole open-access catalogue and upserts
 * rows into `artworks` (text + image URLs only — no image is downloaded or stored).
 * Resumable: progress is kept in data/ingest-state.json, so it can be stopped and restarted.
 *
 *   npm run ingest:all -- --budget 150000          # stop after ~150k rows (DB size guard)
 *   npm run ingest:all -- --museum cleveland --museum aic
 *   npm run ingest:all -- --reset                  # forget saved progress
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { upsertArtworks } from "./db.js";
import { getJson, mapLimit } from "./http.js";
import type { Artwork, MuseumSource } from "./types.js";

const argv = process.argv.slice(2);
const flag = (n: string) => argv.flatMap((a, i) => (a === `--${n}` && argv[i + 1] ? [argv[i + 1]!] : []));
const budget = Number(flag("budget")[0] ?? 150_000);
const sources = (flag("museum").length ? flag("museum") : ["cleveland", "aic", "met"]) as MuseumSource[];
const STATE = "data/ingest-state.json";

interface State { cleveland: { skip: number; done: boolean }; aic: { page: number; done: boolean }; met: { ids: number[] | null; idx: number; done: boolean }; total: number }
const fresh = (): State => ({ cleveland: { skip: 0, done: false }, aic: { page: 1, done: false }, met: { ids: null, idx: 0, done: false }, total: 0 });
mkdirSync("data", { recursive: true });
const state: State = argv.includes("--reset") || !existsSync(STATE) ? fresh() : { ...fresh(), ...JSON.parse(readFileSync(STATE, "utf8")) };
const save = () => writeFileSync(STATE, JSON.stringify(state));
const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

async function flush(list: Artwork[]) {
  const uniq = [...new Map(list.map((a) => [a.id, a])).values()];
  if (!uniq.length) return;
  for (let attempt = 0; ; attempt++) {
    try { await upsertArtworks(uniq); break; }
    catch (e) { if (attempt >= 4) throw e; log(`upsert retry: ${(e as Error).message}`); await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); }
  }
  state.total += uniq.length;
}
const overBudget = () => state.total >= budget;

// ---- Cleveland: ~42k CC0 works, 1000 per request ------------------------------------------
interface CmaImage { url: string; width?: string; height?: string }
interface CmaArtwork { id: number; title: string; url: string; creation_date?: string; creditline?: string; share_license_status: string; creators?: { description: string }[]; images?: { web?: CmaImage; print?: CmaImage; full?: CmaImage } | null }

async function cleveland() {
  const LIMIT = 500;
  while (!state.cleveland.done && !overBudget()) {
    const url = `https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&limit=${LIMIT}&skip=${state.cleveland.skip}` +
      `&fields=id,title,url,creation_date,creditline,share_license_status,creators,images`;
    const { data } = await getJson<{ data: CmaArtwork[] }>(url, 4);
    const out: Artwork[] = [];
    for (const a of data) {
      if (a.share_license_status !== "CC0") continue;
      const img = a.images?.print ?? a.images?.web ?? a.images?.full;
      if (!img?.url) continue;
      out.push({
        id: `cleveland:${a.id}`, source: "cleveland", sourceId: String(a.id), title: a.title,
        artist: a.creators?.[0]?.description?.split("(")[0]?.trim() || "Unknown",
        originalImageUrl: img.url, thumbnailUrl: a.images?.web?.url,
        width: img.width ? Number(img.width) : undefined, height: img.height ? Number(img.height) : undefined,
        year: a.creation_date || undefined, creditLine: a.creditline || undefined,
        isPublicDomain: true, sourceMuseum: "The Cleveland Museum of Art", license: "CC0", sourceUrl: a.url,
      });
    }
    await flush(out);
    state.cleveland.skip += LIMIT;
    if (data.length < LIMIT) state.cleveland.done = true;
    save();
    log(`[cleveland] skip=${state.cleveland.skip} total=${state.total}`);
  }
}

// ---- Art Institute of Chicago: ~133k works listed, ~1/3 public domain ----------------------
interface AicArtwork { id: number; title: string; artist_title: string | null; image_id: string | null; is_public_domain: boolean; date_display?: string | null; credit_line?: string | null; thumbnail?: { width?: number; height?: number } | null }

async function aic() {
  const LIMIT = 100;
  const fields = "id,title,artist_title,image_id,is_public_domain,date_display,credit_line,thumbnail";
  while (!state.aic.done && !overBudget()) {
    const res = await getJson<{ data: AicArtwork[]; config: { iiif_url: string; website_url: string } }>(
      `https://api.artic.edu/api/v1/artworks?limit=${LIMIT}&page=${state.aic.page}&fields=${fields}`, 4);
    const { data, config } = res;
    const out: Artwork[] = [];
    for (const a of data) {
      if (!a.is_public_domain || !a.image_id) continue;
      out.push({
        id: `aic:${a.id}`, source: "aic", sourceId: String(a.id), title: a.title, artist: a.artist_title || "Unknown",
        originalImageUrl: `${config.iiif_url}/${a.image_id}/full/full/0/default.jpg`,
        thumbnailUrl: `${config.iiif_url}/${a.image_id}/full/400,/0/default.jpg`,
        width: a.thumbnail?.width, height: a.thumbnail?.height,
        year: a.date_display || undefined, creditLine: a.credit_line || undefined,
        isPublicDomain: true, sourceMuseum: "The Art Institute of Chicago", license: "CC0", sourceUrl: `${config.website_url}/artworks/${a.id}`,
      });
    }
    await flush(out);
    state.aic.page++;
    if (data.length < LIMIT) state.aic.done = true;
    save();
    if (state.aic.page % 10 === 0) log(`[aic] page=${state.aic.page} total=${state.total}`);
    await new Promise((r) => setTimeout(r, 300)); // be polite
  }
}

// ---- The Met: ~371k public-domain works; one request per object ----------------------------
interface MetObject { objectID: number; isPublicDomain: boolean; primaryImage: string; primaryImageSmall: string; title: string; artistDisplayName: string; objectURL: string; objectDate: string; creditLine: string }

async function met() {
  const BASE = "https://collectionapi.metmuseum.org/public/collection";
  if (!state.met.ids) {
    const r = await getJson<{ objectIDs: number[] | null }>(`${BASE}/v1.1/search?hasImages=true&isPublicDomain=true&q=*`, 4);
    state.met.ids = r.objectIDs ?? [];
    save();
    log(`[met] ${state.met.ids.length} candidate ids`);
  }
  const ids = state.met.ids;
  const CHUNK = 200;
  while (!state.met.done && !overBudget()) {
    const slice = ids.slice(state.met.idx, state.met.idx + CHUNK);
    if (!slice.length) { state.met.done = true; save(); break; }
    const objs = await mapLimit(slice, 6, async (id) => {
      try { return await getJson<MetObject>(`${BASE}/v1/objects/${id}`, 4); } catch { return null; }
    });
    const out: Artwork[] = [];
    for (const o of objs) {
      if (!o || !o.isPublicDomain || !o.primaryImage) continue;
      out.push({
        id: `met:${o.objectID}`, source: "met", sourceId: String(o.objectID), title: o.title, artist: o.artistDisplayName || "Unknown",
        originalImageUrl: o.primaryImage, thumbnailUrl: o.primaryImageSmall || undefined,
        year: o.objectDate || undefined, creditLine: o.creditLine || undefined,
        isPublicDomain: true, sourceMuseum: "The Metropolitan Museum of Art", license: "CC0", sourceUrl: o.objectURL,
      });
    }
    await flush(out);
    state.met.idx += CHUNK;
    save();
    if ((state.met.idx / CHUNK) % 5 === 0) log(`[met] ${state.met.idx}/${ids.length} total=${state.total}`);
  }
}

const jobs: Record<MuseumSource, () => Promise<void>> = { cleveland, aic, met };
for (const s of sources) {
  if (overBudget()) break;
  log(`start ${s} (budget ${state.total}/${budget})`);
  try { await jobs[s](); } catch (e) { log(`[${s}] stopped: ${(e as Error).message}`); }
}
log(`finished: ${state.total} rows upserted this run-set${overBudget() ? " (budget reached)" : ""}`);
process.exit(0);
