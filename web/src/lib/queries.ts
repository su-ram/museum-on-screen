import { db, wallpaperUrl } from "./supabase";
import { isRangeError, reconcile } from "./paging";
import { HIDDEN_MUSEUMS, ORIENTATIONS, type DeviceType, type FitMode, type Orientation } from "./devices";

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
export async function listArtworks(opts: { q?: string; museum?: string; orientation?: Orientation; page?: number; shuffle?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim().replace(/[,()%*\\]/g, " ");
  const seed = opts.shuffle && Number.isFinite(opts.shuffle) ? Math.floor(opts.shuffle) : 0;

  const base = (count: "exact" | "planned", head = false) => {
    let query = db()
      .from("artworks")
      .select(head ? "id" : `${COLS}, wallpapers(${WP})`, head ? { count, head } : undefined)
      .eq("is_public_domain", true)
      .not("museum", "in", `(${HIDDEN_MUSEUMS.join(",")})`);
    if (opts.museum) query = query.eq("museum", opts.museum);
    const o = ORIENTATIONS.find((x) => x.type === opts.orientation);
    if (o) query = query.gte("aspect_ratio", o.min).lte("aspect_ratio", o.max);
    if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
    return query;
  };
  // Random-looking but stable order (see fetchRange): ids are random v4 UUIDs, so museums and artists come
  // out mixed (instead of A–Z by artist, where one name can fill a whole page) and paging stays consistent.

  // The exact row count is the expensive part. If it fails (e.g. statement timeout while bulk ingests
  // are writing), fall back to the planner's estimate, and finally to no count at all — the page itself
  // must never fail just because counting did (#16).
  const countRows = async (): Promise<number | null> => {
    for (const c of ["exact", "planned", "planned"] as const) {
      const res = await base(c, true);
      if (!res.error) return res.count ?? 0;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  };
  // Row fetch without a count; a range past the end is just an empty page, not an error.
  const fetchRange = async (from: number, to: number): Promise<Raw[]> => {
    let last: { message: string } | null = null;
    for (let i = 0; i < 3; i++) {
      const res = await base("planned").order("id").range(from, to);
      if (!res.error) return (res.data ?? []) as unknown as Raw[];
      if (isRangeError(res.error)) return [];
      last = res.error;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
    throw new Error(last?.message ?? "artworks query failed");
  };

  let rows: Raw[];
  let total: number;
  let pages: number;
  if (!seed) {
    // Ask for one extra row so we know whether a next page exists without trusting the count.
    const from = (page - 1) * PAGE_SIZE;
    const [got, count] = await Promise.all([fetchRange(from, from + PAGE_SIZE), countRows()]);
    const hasMore = got.length > PAGE_SIZE;
    rows = got.slice(0, PAGE_SIZE);
    ({ total, pages } = reconcile({ count, page, pageSize: PAGE_SIZE, got: rows.length, hasMore }));
  } else {
    // Shuffle: rotate the stable id order by a seeded offset (wrapping around), then shuffle each page.
    // Every page of one seed stays consistent, and a new seed gives a different order.
    const count = await countRows();
    if (count === null) throw new Error("artworks count failed");
    total = count;
    pages = Math.ceil(total / PAGE_SIZE);
    const offset = total ? Math.floor(rng(seed)() * total) : 0;
    const from = (offset + (page - 1) * PAGE_SIZE) % Math.max(total, 1);
    const want = Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE));
    rows = [];
    if (want > 0) {
      const first = Math.min(want, total - from);
      rows = await fetchRange(from, from + first - 1);
      if (first < want) rows = rows.concat(await fetchRange(0, want - first - 1));
      const rand = rng(seed + page);
      for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
    }
  }
  return { artworks: rows.map(hydrate), total, pages, page };
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
