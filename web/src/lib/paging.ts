/** Pure pagination helpers for the gallery (#16). Kept free of DB imports so they can be unit-tested. */

/** PostgREST answers 416 / PGRST103 when the requested range starts past the last row. That's "no rows", not a failure. */
export function isRangeError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST103" || /range not satisfiable/i.test(err.message ?? "");
}

/**
 * Reconcile the (possibly estimated or missing) row count with what the page query actually returned.
 * `got` rows came back for `page`; `hasMore` says whether at least one more row exists after them.
 * The planner estimate can be too high or too low, so the real rows always win near the end.
 */
export function reconcile(opts: { count: number | null; page: number; pageSize: number; got: number; hasMore: boolean }) {
  const { count, page, pageSize, got, hasMore } = opts;
  const seen = (page - 1) * pageSize + got;
  let total: number;
  if (!hasMore) total = got > 0 || page === 1 ? seen : Math.min(count ?? 0, (page - 1) * pageSize);
  else total = Math.max(count ?? 0, seen + 1);
  const pages = hasMore ? Math.max(page + 1, Math.ceil(total / pageSize)) : Math.max(got > 0 ? page : 0, Math.ceil(total / pageSize));
  return { total, pages };
}
