import test from "node:test";
import assert from "node:assert/strict";
import { filterProducts, getVisibleVariantOptions, getVariantPrice } from "../lib/storefront";

test("filters products by category and Arabic/English search", () => {
  const products = [
    { id: "1", name_ar: "تيشيرت قطن", name_en: "Cotton T-Shirt", category_id: "tops" },
    { id: "2", name_ar: "بنطلون جينز", name_en: "Blue Jeans", category_id: "bottoms" },
  ];

  assert.equal(filterProducts(products, "tops", "قطن").length, 1);
  assert.equal(filterProducts(products, "all", "jeans")[0].id, "2");
  assert.equal(filterProducts(products, "bottoms", "").length, 1);
});

test("only returns variant options that have stock when a compatible choice exists", () => {
  const variants = [
    { id: "a", size: "M", color: "Black", stock: 3, price_override: null },
    { id: "b", size: "M", color: "White", stock: 0, price_override: null },
    { id: "c", size: "L", color: "White", stock: 2, price_override: 450 },
  ];

  const options = getVisibleVariantOptions(variants, "M", null);
  assert.deepEqual(options.colors, ["Black"]);
  assert.deepEqual(options.sizes, ["M"]);
});

test("uses variant override price, otherwise base product price", () => {
  assert.equal(getVariantPrice(399, { price_override: 450 }), 450);
  assert.equal(getVariantPrice(399, { price_override: null }), 399);
});
