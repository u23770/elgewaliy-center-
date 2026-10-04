import test from "node:test";
import assert from "node:assert/strict";
import { imagePath, nextImageOrder } from "../lib/product-images.ts";

test("nextImageOrder appends after the highest sort order", () => {
  assert.equal(nextImageOrder([{ sort_order: 0 }, { sort_order: 3 }]), 4);
});

test("nextImageOrder starts at zero for an empty gallery", () => {
  assert.equal(nextImageOrder([]), 0);
});

test("imagePath namespaces files by product and sanitizes the filename", () => {
  const path = imagePath("product-1", "Summer Shirt (Front).WEBP");
  assert.match(path, /^product-1\/\d+-summer-shirt-front\.webp$/);
});
