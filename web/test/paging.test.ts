import { test } from "node:test";
import assert from "node:assert/strict";
import { fixTotal, shuffleRanges } from "../src/lib/paging.ts";

test("a full page with an exact count keeps the count", () => {
  assert.equal(fixTotal(250, 100, 100, 100), 250);
});
test("an underestimated or missing count still allows the next page (#16)", () => {
  assert.equal(fixTotal(120, 100, 100, 100), 201);
  assert.equal(fixTotal(null, 100, 100, 100), 201);
});
test("a short page reveals the exact total", () => {
  assert.equal(fixTotal(9999, 200, 37, 100), 237);
});
test("shuffle ranges wrap around the end", () => {
  assert.deepEqual(shuffleRanges(250, 0, 2, 100), [[100, 199]]);
  assert.deepEqual(shuffleRanges(250, 200, 1, 100), [[200, 249], [0, 49]]);
  assert.deepEqual(shuffleRanges(250, 200, 3, 100), [[150, 199]]);
  assert.deepEqual(shuffleRanges(250, 0, 4, 100), []);
});
