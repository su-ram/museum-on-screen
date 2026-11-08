import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

/** Server-only client (used from server components and route handlers). */
export function db() {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set (see .env.example)");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function wallpaperUrl(storagePath: string) {
  return `${url}/storage/v1/object/public/museum-wallpapers/${storagePath}`;
}
