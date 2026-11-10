import { db, wallpaperUrl } from "./supabase";
import { HIDDEN_MUSEUMS, type DeviceType, type FitMode } from "./devices";

export interface Wallpaper {
  id: string;
  artwork_id: string;
  device_type: DeviceType;
  fit_mode: FitMode;
  width: number;
  height: number;
  storage_path: string;
  file_size: number | null;
  format: string;
  url: string;
}

export interface Artwork {
  id: string;
  museum: string;
  external_id: string;
  title: string;
  artist: string;
  year: string | null;
  original_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  license: string;
  credit_line: string | null;
  source_url: string;
  wallpapers: Wallpaper[];
}

const WP = "id,artwork_id,device_type,fit_mode,width,height,storage_path,file_size,format";
const COLS = "id,museum,external_id,title,artist,year,original_url,thumbnail_url,width,height,license,credit_line,source_url";

type Raw = Omit<Artwork, "wallpapers"> & { wallpapers: Omit<Wallpaper, "url">[] };
const hydrate = (r: Raw): Artwork => ({
  ...r,
  wallpapers: r.wallpapers.map((w) => ({ ...w, url: wallpaperUrl(w.storage_path) })),
});

export const PAGE_SIZE = 100; // 4열 × 25행

/** mulberry32 — tiny seeded PRNG so a shuffle seed always yields the same order. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** All public-domain artworks in the DB (wallpapers may or may not be pre-generated). Never calls the museum APIs. */
export async function listArtworks(opts: { q?: string; museum?: string; page?: number; shuffle?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim().replace(/[,()%*\\]/g, " ");
  const seed = opts.shuffle && Number.isFinite(opts.shuffle) ? Math.floor(opts.shuffle) : 0;

  const base = (count: "exact" | "planned", head = false) => {
    let query = db()
      .from("artworks")
      .select(`${COLS}, wallpapers(${WP})`, { count, head })
      .eq("is_public_domain", true)
      .not("museum", "in", `(${HIDDEN_MUSEUMS.join(",")})`);
    if (opts.museum) query = query.eq("museum", opts.museum);
    if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
    return query;
  };
  // Random-looking but stable order: ids are random v4 UUIDs, so museums and artists come out mixed
  // (instead of A–Z by artist, where one name can fill a whole page) and paging stays consistent.
  const range = (count: "exact" | "planned", from: number, to: number) => base(count).order("id").range(from, to);

  // The exact row count is the expensive part. If the DB hits its statement timeout (e.g. while bulk
  // ingests are writing), retry with the planner's estimate instead of failing the whole page.
  const withRetry = async <T extends { error: { message: string } | null }>(f: (c: "exact" | "planned") => PromiseLike<T>) => {
    let res = await f("exact");
    for (let i = 0; i < 2 && res.error && /timeout/i.test(res.error.message); i++) {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      res = await f("planned");
    }
    return res;
  };

  let rows: Raw[];
  let total: number;
  if (!seed) {
    const res = await withRetry((c) => range(c, (page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1));
    if (res.error) throw new Error(res.error.message);
    rows = (res.data ?? []) as unknown as Raw[];
    total = res.count ?? 0;
  } else {
    // Shuffle: rotate the stable id order by a seeded offset (wrapping around), then shuffle each page.
    // Every page of one seed stays consistent, and a new seed gives a different order.
    const head = await withRetry((c) => base(c, true));
    if (head.error) throw new Error(head.error.message);
    total = head.count ?? 0;
    const offset = total ? Math.floor(rng(seed)() * total) : 0;
    const from = (offset + (page - 1) * PAGE_SIZE) % Math.max(total, 1);
    const want = Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE));
    rows = [];
    if (want > 0) {
      const first = Math.min(want, total - from);
      const a = await withRetry((c) => range(c, from, from + first - 1));
      if (a.error) throw new Error(a.error.message);
      rows = (a.data ?? []) as unknown as Raw[];
      if (first < want) {
        const b = await withRetry((c) => range(c, 0, want - first - 1));
        if (b.error) throw new Error(b.error.message);
        rows = rows.concat((b.data ?? []) as unknown as Raw[]);
      }
      const rand = rng(seed + page);
      for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
    }
  }
  return { artworks: rows.map(hydrate), total, page };
}

export async function getArtwork(id: string): Promise<Artwork | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db()
    .from("artworks")
    .select(`${COLS}, wallpapers(${WP})`)
    .eq("id", id)
    .eq("is_public_domain", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data && !HIDDEN_MUSEUMS.includes(data.museum) ? hydrate(data as unknown as Raw) : null;
}

export async function getWallpaper(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db()
    .from("wallpapers")
    .select(`${WP}, artworks!inner(title, artist, is_public_domain)`)
    .eq("id", id)
    .eq("artworks.is_public_domain", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const w = data as unknown as Omit<Wallpaper, "url"> & { artworks: { title: string; artist: string } };
  return { ...w, url: wallpaperUrl(w.storage_path) };
}

/** Preferred card image: laptop/desktop fill → any fill → anything. */
export function coverOf(a: Artwork): Wallpaper | undefined {
  const order = (w: Wallpaper) =>
    (w.fit_mode === "fill" ? 0 : 10) + { laptop: 0, desktop: 1, mobile: 2, mobile_qhd: 3 }[w.device_type];
  return [...a.wallpapers].sort((x, y) => order(x) - order(y))[0];
}
