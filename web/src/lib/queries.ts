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

/** All public-domain artworks in the DB (wallpapers may or may not be pre-generated). Never calls the museum APIs. */
export async function listArtworks(opts: { q?: string; museum?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  let query = db()
    .from("artworks")
    .select(`${COLS}, wallpapers(${WP})`, { count: "exact" })
    .eq("is_public_domain", true)
    .not("museum", "in", `(${HIDDEN_MUSEUMS.join(",")})`)
    .order("artist")
    .order("title")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (opts.museum) query = query.eq("museum", opts.museum);
  const q = opts.q?.trim().replace(/[,()%*\\]/g, " ");
  if (q) query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { artworks: ((data ?? []) as unknown as Raw[]).map(hydrate), total: count ?? 0, page };
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
