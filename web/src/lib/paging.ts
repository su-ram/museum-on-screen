/** Pure paging helpers for the gallery (kept dependency-free so they can be unit-tested). */

/** Keeps a (possibly estimated or missing) total consistent with the rows actually returned for a page. */
export function fixTotal(count: number | null, from: number, got: number, pageSize: number) {
  if (got === 0) return count ?? 0; // past the end (or empty result)
  if (got < pageSize) return from + got; // last page: the exact total is known
  return count != null && count >= from + got ? count : from + got + 1; // more rows may follow
}

/** Inclusive [from, to] index ranges for one page of a rotated (wrapping) order. */
export function shuffleRanges(total: number, offset: number, page: number, pageSize: number): [number, number][] {
  const want = Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize));
  if (!want) return [];
  const from = (offset + (page - 1) * pageSize) % total;
  const first = Math.min(want, total - from);
  const out: [number, number][] = [[from, from + first - 1]];
  if (first < want) out.push([0, want - first - 1]);
  return out;
}
