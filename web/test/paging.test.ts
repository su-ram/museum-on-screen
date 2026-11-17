import { test } from "node:test";
import assert from "node:assert/strict";
import { isRangeError, reconcile } from "../src/lib/paging.ts";

const P = 100;

test("range past the end is treated as empty, not a failure (#16)", () => {
  assert.ok(isRangeError({ code: "PGRST103", message: "Requested range not satisfiable" }));
  assert.ok(isRangeError({ message: "Requested range not satisfiable" }));
  assert.ok(!isRangeError({ message: "canceling statement due to statement timeout" }));
  assert.ok(!isRangeError(null));
});
test("next page is offered whenever more rows exist, even if the count failed", () => {
  const r = reconcile({ count: null, page: 1, pageSize: P, got: P, hasMore: true });
  assert.equal(r.pages, 2);
  assert.ok(r.total > P);
});
test("an underestimated count never hides the next page", () => {
  const r = reconcile({ count: 50, page: 2, pageSize: P, got: P, hasMore: true });
  assert.equal(r.pages, 3);
});
test("an overestimated count is corrected on the last page", () => {
  const r = reconcile({ count: 10_000, page: 3, pageSize: P, got: 40, hasMore: false });
  assert.deepEqual(r, { total: 240, pages: 3 });
});
test("exact counts keep the normal page total", () => {
  assert.deepEqual(reconcile({ count: 1234, page: 1, pageSize: P, got: P, hasMore: true }), { total: 1234, pages: 13 });
});
