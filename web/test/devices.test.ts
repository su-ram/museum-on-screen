import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultDevice, isOrientation, ORIENTATIONS } from "../src/lib/devices.ts";

test("landscape originals default to desktop", () => {
  assert.equal(defaultDevice({ width: 4000, height: 2500 }), "desktop");
});
test("portrait originals default to mobile", () => {
  assert.equal(defaultDevice({ width: 2000, height: 4000 }), "mobile");
});
test("square, unknown or too-small originals fall back to original", () => {
  assert.equal(defaultDevice({ width: 3000, height: 3000 }), "original");
  assert.equal(defaultDevice({ width: null, height: null }), "original");
  assert.equal(defaultDevice({ width: 300, height: 200 }), "original");
});
test("orientation ranges match their screen shapes", () => {
  const r = (t: string) => ORIENTATIONS.find((o) => o.type === t)!;
  assert.ok(16 / 9 >= r("landscape").min && 16 / 9 <= r("landscape").max);
  assert.ok(1290 / 2796 >= r("portrait").min && 1290 / 2796 <= r("portrait").max);
  assert.ok(isOrientation("portrait") && !isOrientation("square"));
});
