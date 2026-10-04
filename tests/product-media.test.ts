import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_PRODUCT_IMAGES, getProductImage } from "../lib/product-media.ts";

test("uses the first ordered database image when one exists", () => {
  const result = getProductImage("kids-cotton-tshirt", [
    { url: "https://example.com/second.jpg", sort_order: 1 },
    { url: "https://example.com/main.jpg", sort_order: 0 },
  ]);

  assert.equal(result, "https://example.com/main.jpg");
});

test("falls back to a real demo photo for a known product slug", () => {
  const result = getProductImage("girls-dress", []);
  assert.equal(result, DEMO_PRODUCT_IMAGES["girls-dress"]);
  assert.match(result || "", /^https:\/\//);
});

test("returns null when no image or fallback exists", () => {
  assert.equal(getProductImage("unknown-product", []), null);
});
