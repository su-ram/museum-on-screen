/**
 * Metadata-only bulk ingest: walks each museum's whole open-access catalogue and upserts
 * rows into `artworks` (text + image URLs only — no image is downloaded or stored).
 * Resumable: progress is kept in data/ingest-state.json, so it can be stopped and restarted.
 *
 *   npm run ingest:all -- --budget 150000          # stop after ~150k rows (DB size guard)
 *   npm run ingest:all -- --museum cleveland --museum aic
 *   npm run ingest:all -- --reset                  # forget saved progress
 *   npm run ingest:all -- --museum rijks --rijks-type painting --dry-run --budget 100   # parse only, no DB write
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { upsertArtworks } from "./db.js";
import { getJson, mapLimit } from "./http.js";
import type { Artwork, MuseumSource } from "./types.js";

const argv = process.argv.slice(2);
const flag = (n: string) => argv.flatMap((a, i) => (a === `--${n}` && argv[i + 1] ? [argv[i + 1]!] : []));
const budget = Number(flag("budget")[0] ?? 150_000);
const sources = (flag("museum").length ? flag("museum") : ["cleveland", "aic", "met"]) as MuseumSource[];
const STATE = flag("state")[0] ?? "data/ingest-state.json";

interface State { rijks: { next: string | null; done: boolean }; smk: { offset: number; done: boolean }; nga: { done: boolean }; cleveland: { skip: number; done: boolean }; aic: { page: number; done: boolean }; met: { ids: number[] | null; idx: number; done: boolean }; total: number }
const fresh = (): State => ({ rijks: { next: null, done: false }, smk: { offset: 0, done: false }, nga: { done: false }, cleveland: { skip: 0, done: false }, aic: { page: 1, done: false }, met: { ids: null, idx: 0, done: false }, total: 0 });
mkdirSync("data", { recursive: true });
const state: State = argv.includes("--reset") || !existsSync(STATE) ? fresh() : { ...fresh(), ...JSON.parse(readFileSync(STATE, "utf8")) };
const save = () => writeFileSync(STATE, JSON.stringify(state));
const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

async function flush(list: Artwork[]) {
  const uniq = [...new Map(list.map((a) => [a.id, a])).values()];
  if (!uniq.length) return;
  if (argv.includes("--dry-run")) { for (const a of uniq.slice(0, 3)) console.log(JSON.stringify(a)); state.total += uniq.length; return; }
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


// ---- SMK (Denmark): ~39k public-domain works with images ----------------------------------
interface SmkItem {
  object_number: string; titles?: { title: string }[]; production?: { creator?: string; creator_forename?: string; creator_surname?: string }[];
  production_date?: { period?: string }[]; image_iiif_id?: string; image_width?: number; image_height?: number;
  public_domain?: boolean; rights?: string; frontend_url?: string; credit_line?: string | null; has_image?: boolean;
}
const SMK_MAX = 2560; // SMK's IIIF server is slow on big sizes (30-80s); cap the longest side

async function smk() {
  const ROWS = 100;
  while (!state.smk.done && !overBudget()) {
    const url = `https://api.smk.dk/api/v1/art/search/?keys=*&filters=${encodeURIComponent("[public_domain:true],[has_image:true]")}&offset=${state.smk.offset}&rows=${ROWS}&lang=en`;
    const { items } = await getJson<{ items: SmkItem[] }>(url, 4);
    const out: Artwork[] = [];
    for (const a of items) {
      if (!a.public_domain || !a.image_iiif_id) continue;
      const c = a.production?.[0];
      const artist = c?.creator_forename && c?.creator_surname ? `${c.creator_forename} ${c.creator_surname}` : c?.creator?.split(",").reverse().map((x) => x.trim()).join(" ") || "Unknown";
      const w = a.image_width, h = a.image_height;
      const k = w && h ? Math.min(1, SMK_MAX / Math.max(w, h)) : 1;
      out.push({
        id: `smk:${a.object_number}`, source: "smk", sourceId: a.object_number,
        title: a.titles?.[0]?.title || a.object_number, artist,
        originalImageUrl: `${a.image_iiif_id}/full/!${SMK_MAX},${SMK_MAX}/0/default.jpg`,
        thumbnailUrl: `${a.image_iiif_id.replace("//iip.", "//iip-thumb.")}/full/!600,600/0/default.jpg`,
        width: w ? Math.round(w * k) : undefined, height: h ? Math.round(h * k) : undefined,
        year: a.production_date?.[0]?.period || undefined, creditLine: a.credit_line || undefined,
        isPublicDomain: true, sourceMuseum: "SMK — National Gallery of Denmark", license: "Public Domain",
        sourceUrl: a.frontend_url ?? `https://open.smk.dk/artwork/image/${a.object_number}`,
      });
    }
    await flush(out);
    state.smk.offset += ROWS;
    if (items.length < ROWS) state.smk.done = true;
    save();
    if ((state.smk.offset / ROWS) % 10 === 0) log(`[smk] offset=${state.smk.offset} total=${state.total}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ---- NGA (USA): open-data CSVs on GitHub; only images flagged openaccess=1 ------------------
function* csvRows(text: string): Generator<string[]> {
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; yield row; row = []; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); yield row; }
}

async function cached(url: string, file: string): Promise<string> {
  mkdirSync("data/cache", { recursive: true });
  const path = `data/cache/${file}`;
  if (!existsSync(path) || statSync(path).size < 1000) {
    log(`[nga] downloading ${file}`);
    const res = await fetch(url, { headers: { "User-Agent": "museum-on-screen/0.1" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(path, "utf8");
}

async function nga() {
  if (state.nga.done) return;
  const B = "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data";
  const img = new Map<string, { iiif: string; w: number; h: number; seq: number }>();
  let head: string[] | null = null;
  for (const r of csvRows(await cached(`${B}/published_images.csv`, "nga_images.csv"))) {
    if (!head) { head = r; continue; }
    const get = (n: string) => r[head!.indexOf(n)] ?? "";
    if (get("openaccess") !== "1" || get("viewtype") !== "primary") continue;
    const id = get("depictstmsobjectid"), seq = Number(get("sequence")) || 0;
    const prev = img.get(id);
    if (!prev || seq < prev.seq) img.set(id, { iiif: get("iiifurl"), w: Number(get("width")) || 0, h: Number(get("height")) || 0, seq });
  }
  log(`[nga] ${img.size} open-access primary images`);
  const batch: Artwork[] = [];
  head = null;
  for (const r of csvRows(await cached(`${B}/objects.csv`, "nga_objects.csv"))) {
    if (!head) { head = r; continue; }
    const get = (n: string) => r[head!.indexOf(n)] ?? "";
    const id = get("objectid"), im = img.get(id);
    if (!im || !get("title")) continue;
    batch.push({
      id: `nga:${id}`, source: "nga", sourceId: id, title: get("title"), artist: get("attribution") || "Unknown",
      originalImageUrl: `${im.iiif}/full/full/0/default.jpg`, thumbnailUrl: `${im.iiif}/full/!600,600/0/default.jpg`,
      width: im.w || undefined, height: im.h || undefined, year: get("displaydate") || undefined, creditLine: get("creditline") || undefined,
      isPublicDomain: true, sourceMuseum: "National Gallery of Art", license: "CC0", sourceUrl: `https://www.nga.gov/artworks/${id}`,
    });
  }
  for (let i = 0; i < batch.length && !overBudget(); i += 500) {
    await flush(batch.slice(i, i + 500));
    save();
    if ((i / 500) % 10 === 0) log(`[nga] ${i}/${batch.length} total=${state.total}`);
  }
  if (!overBudget()) { state.nga.done = true; save(); }
}

// ---- Rijksmuseum (NL): Linked Art; one request per object. Default: paintings only ----------
const rijksType = flag("rijks-type")[0] ?? "painting";
/* eslint-disable @typescript-eslint/no-explicit-any */
const EN = "http://vocab.getty.edu/aat/300388277";
const arr = (x: any): any[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const isEn = (n: any) => arr(n.language).some((l: any) => l.id === EN);

function rijksArtwork(o: any): Artwork | null {
  const objNum = arr(o.identified_by).find((i: any) => i.type === "Identifier" && arr(i.classified_as).some((c: any) => arr(c.notation).some((n: any) => n["@value"] === "object number")))?.content as string | undefined;
  const names = arr(o.identified_by).filter((i: any) => i.type === "Name");
  const title = (names.find((n: any) => isEn(n) && arr(n.classified_as).some((c: any) => String(c.id).endsWith("300404670"))) ?? names.find(isEn) ?? names[0])?.content as string | undefined;
  let image: string | undefined, publicDomain = false;
  for (const s of arr(o.subject_of)) for (const d of arr(s.digitally_carried_by)) {
    const url = arr(d.access_point)[0]?.id as string | undefined;
    if (url?.startsWith("https://iiif.micr.io/")) {
      image = url;
      publicDomain = arr(d.referred_to_by).some((r: any) => /publicdomain\/(mark|zero)/.test(r.content ?? ""));
    }
  }
  if (!objNum || !title || !image || !publicDomain) return null;
  const id = image.split("/")[3]!;
  const artist = arr(o.produced_by?.part).flatMap((p: any) => arr(p.carried_out_by)).map((c: any) => arr(c.notation).find((n: any) => n["@language"] === "en")?.["@value"]).find(Boolean) as string | undefined;
  const year = arr(o.produced_by?.timespan?.identified_by).find(isEn)?.content as string | undefined;
  return {
    id: `rijks:${objNum}`, source: "rijks", sourceId: objNum, title, artist: artist || "Unknown",
    originalImageUrl: `https://iiif.micr.io/${id}/full/max/0/default.jpg`,
    thumbnailUrl: `https://iiif.micr.io/${id}/full/!600,600/0/default.jpg`,
    year, isPublicDomain: true, sourceMuseum: "Rijksmuseum", license: "Public Domain",
    sourceUrl: `https://www.rijksmuseum.nl/en/collection/${objNum}`,
  };
}

async function rijks() {
  let url = state.rijks.next ?? `https://data.rijksmuseum.nl/search/collection?imageAvailable=true&type=${encodeURIComponent(rijksType)}`;
  while (!state.rijks.done && !overBudget()) {
    const page = await getJson<any>(url, 4);
    const ids: string[] = (page.orderedItems ?? []).map((i: any) => i.id);
    const objs = await mapLimit(ids, 5, async (id) => {
      try {
        const res = await fetch(id, { headers: { Accept: "application/ld+json", "User-Agent": "museum-on-screen/0.1" } });
        return res.ok ? await res.json() : null;
      } catch { return null; }
    });
    await flush(objs.map((o) => (o ? rijksArtwork(o) : null)).filter((a): a is Artwork => !!a));
    const next = page.next?.id as string | undefined;
    if (!next || !ids.length) state.rijks.done = true; else { url = next; state.rijks.next = next; }
    save();
    log(`[rijks] total=${state.total}${state.rijks.done ? " (done)" : ""}`);
  }
}

const jobs: Record<MuseumSource, () => Promise<void>> = { cleveland, aic, met, smk, nga, rijks };
for (const s of sources) {
  if (overBudget()) break;
  log(`start ${s} (budget ${state.total}/${budget})`);
  try { await jobs[s](); } catch (e) { log(`[${s}] stopped: ${(e as Error).message}`); }
}
log(`finished: ${state.total} rows upserted this run-set${overBudget() ? " (budget reached)" : ""}`);
process.exit(0);
