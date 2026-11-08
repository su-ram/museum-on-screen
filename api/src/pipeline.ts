/**
 * Stage 2: download originals, check resolution, render Fit/Fill wallpapers with Sharp,
 * upload to Supabase Storage and record them in `wallpapers`.
 *
 *   npm run process               # all artworks without an original yet
 *   npm run process -- --limit 3  # first 3 only
 *   npm run process -- --force    # reprocess everything
 */
import { appendFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import { mapLimit } from "./http.js";
import { PRESETS, type DeviceType, type FitMode } from "./presets.js";
import { isSupported, render } from "./process.js";
import { adminClient } from "./supabase.js";

const ORIGINALS = "museum-originals";
const WALLPAPERS = "museum-wallpapers";
const MAX_UPLOAD = 50 * 1024 * 1024; // Supabase free-tier per-file cap

interface ArtworkRow {
  id: string; museum: string; external_id: string; title: string; original_url: string;
  focal_point_x: number; focal_point_y: number; original_storage_path: string | null;
}

const supabase = adminClient();
const argv = process.argv.slice(2);
const force = argv.includes("--force");
const limit = Number(argv[argv.indexOf("--limit") + 1]) || undefined;

function logFailure(row: ArtworkRow, reason: string) {
  mkdirSync("data", { recursive: true });
  appendFileSync("data/failures.jsonl", JSON.stringify({ at: new Date().toISOString(), id: row.id, museum: row.museum, external_id: row.external_id, reason }) + "\n");
  console.warn(`  ✗ ${row.museum}:${row.external_id} ${reason}`);
}

async function ensureBuckets() {
  const { data } = await supabase.storage.listBuckets();
  const have = new Set((data ?? []).map((b) => b.name));
  if (!have.has(ORIGINALS)) await supabase.storage.createBucket(ORIGINALS, { public: false });
  if (!have.has(WALLPAPERS)) await supabase.storage.createBucket(WALLPAPERS, { public: true });
}

async function download(url: string): Promise<Buffer> {
  const UA = "museum-on-screen/0.1";
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "AIC-User-Agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt < 2 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`download HTTP ${res.status}`);
  }
}

async function upload(bucket: string, path: string, body: Buffer) {
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
}

async function processOne(row: ArtworkRow): Promise<{ made: number; skipped: number } | null> {
  let buf: Buffer;
  try { buf = await download(row.original_url); } catch (e) { logFailure(row, (e as Error).message); return null; }

  let meta;
  try { meta = await sharp(buf, { limitInputPixels: false }).metadata(); } catch (e) { logFailure(row, `corrupt image: ${(e as Error).message}`); return null; }
  // EXIF orientations 5-8 swap width/height.
  const swap = (meta.orientation ?? 1) >= 5;
  const src = { width: swap ? meta.height! : meta.width!, height: swap ? meta.width! : meta.height! };
  if (!src.width || !src.height) { logFailure(row, "no dimensions"); return null; }

  const stem = `${row.museum}-${row.external_id}`;
  const originalPath = `${row.museum}/${row.external_id}.jpg`;
  if (buf.length <= MAX_UPLOAD) await upload(ORIGINALS, originalPath, buf);
  const { error: uerr } = await supabase.from("artworks").update({
    width: src.width, height: src.height,
    original_storage_path: buf.length <= MAX_UPLOAD ? originalPath : null,
  }).eq("id", row.id);
  if (uerr) throw new Error(uerr.message);

  let made = 0, skipped = 0;
  const focal = { x: row.focal_point_x, y: row.focal_point_y };
  for (const device of Object.keys(PRESETS) as DeviceType[]) {
    for (const mode of ["fit", "fill"] as FitMode[]) {
      if (!isSupported(src, device, mode)) { skipped++; continue; } // never upscale
      const out = await render(buf, device, mode, focal);
      if (out.length > MAX_UPLOAD) { skipped++; continue; }
      const path = `${device}/${stem}-${mode}.jpg`;
      await upload(WALLPAPERS, path, out);
      const { error } = await supabase.from("wallpapers").upsert({
        artwork_id: row.id, device_type: device, fit_mode: mode, format: "jpg",
        width: PRESETS[device].width, height: PRESETS[device].height,
        storage_path: path, file_size: out.length,
      }, { onConflict: "artwork_id,device_type,fit_mode,format" });
      if (error) throw new Error(error.message);
      made++;
    }
  }
  return { made, skipped };
}

await ensureBuckets();
let q = supabase.from("artworks").select("id,museum,external_id,title,original_url,focal_point_x,focal_point_y,original_storage_path").order("museum").order("external_id");
if (!force) q = q.is("original_storage_path", null);
if (limit) q = q.limit(limit);
const { data, error } = await q;
if (error) throw new Error(error.message);
const rows = (data ?? []) as ArtworkRow[];
console.log(`processing ${rows.length} artworks`);

// Sequential-ish: museum image servers rate-limit aggressively.
const results = await mapLimit(rows, 2, async (row) => {
  try {
    const r = await processOne(row);
    if (r) console.log(`  ✓ ${row.museum}:${row.external_id} ${row.title.slice(0, 40)} — ${r.made} made, ${r.skipped} skipped (low res)`);
    return r;
  } catch (e) { logFailure(row, (e as Error).message); return null; }
});
const ok = results.filter(Boolean).length;
console.log(`done: ${ok}/${rows.length} artworks ok, ${results.reduce((n, r) => n + (r?.made ?? 0), 0)} wallpapers`);
process.exit(0);
