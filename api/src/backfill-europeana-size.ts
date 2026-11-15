/** Fills width/height for europeana rows that don't have them:  npm run backfill:europeana-size */
import { europeanaSize } from "./europeana-size.js";
import { mapLimit } from "./http.js";
import { adminClient } from "./supabase.js";

const key = process.env.EUROPEANA_API_KEY;
if (!key) throw new Error("EUROPEANA_API_KEY is not set (add it to api/.env)");
const supabase = adminClient();
let done = 0, failed = 0;

for (;;) {
  const { data, error } = await supabase
    .from("artworks")
    .select("id, external_id, original_url")
    .eq("museum", "europeana")
    .is("width", null)
    .limit(200);
  if (error) throw new Error(error.message);
  if (!data?.length) break;
  const results = await mapLimit(data, 5, async (r) => {
    const size = await europeanaSize(r.original_url, r.external_id, key);
    if (!size) return false;
    const { error } = await supabase.from("artworks").update(size).eq("id", r.id);
    return !error;
  });
  done += results.filter(Boolean).length;
  failed += results.filter((x) => !x).length;
  console.log(`updated=${done} failed=${failed}`);
  if (results.every((x) => !x)) break; // nothing progressed; avoid an endless loop on unresolvable rows
}
console.log(`finished: updated=${done} failed=${failed}`);
process.exit(0);
