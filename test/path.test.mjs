import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSafePathValue, fillPath } from "../src/path.mjs";

test("fillPath encodes values", () => {
  assert.equal(fillPath("/p/{id}", { id: "a b" }), "/p/a%20b");
});

test("fillPath reports missing params", () => {
  assert.throws(() => fillPath("/p/{id}", {}), /Missing path params: id/);
});

test("rejects dot-segments and slashes", () => {
  for (const value of ["..", ".", "../x", "a/b", "a\\b", "%2e%2e", "%2E%2E", "%2f", "\u0000"]) {
    assert.throws(() => assertSafePathValue("id", value), /Unsafe path param/);
  }
});

test("accepts ordinary ids", () => {
  assert.equal(fillPath("/p/{id}", { id: "20948772560" }), "/p/20948772560");
});
