import test from "node:test";
import assert from "node:assert/strict";
import { addCartItem, cartCount, cartTotal, removeCartItem, updateCartQuantity } from "../lib/cart.ts";
import { selectVariant, uniqueOptions } from "../lib/product-variants.ts";

const item = {
  key: "p1-v1",
  productId: "p1",
  variantId: "v1",
  name_ar: "تيشيرت",
  name_en: "T-shirt",
  price: 249,
  size: "4-6",
  color: "أبيض",
};

test("adding the same variant merges quantities instead of duplicating rows", () => {
  const once = addCartItem([], item);
  const twice = addCartItem(once, item);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].quantity, 2);
});

test("cart total and count reflect quantities", () => {
  const cart = addCartItem([], { ...item, quantity: 2 });
  assert.equal(cartCount(cart), 2);
  assert.equal(cartTotal(cart), 498);
});

test("updating quantity to zero removes the item", () => {
  const cart = addCartItem([], item);
  assert.equal(updateCartQuantity(cart, item.key, 0).length, 0);
});

test("removeCartItem removes only the selected key", () => {
  const cart = addCartItem(addCartItem([], item), { ...item, key: "p2-v1", productId: "p2" });
  const result = removeCartItem(cart, item.key);
  assert.equal(result.length, 1);
  assert.equal(result[0].key, "p2-v1");
});

test("variant options are unique and preserve first-seen order", () => {
  const variants = [
    { id: "1", size: "4-6", color: "أبيض", stock: 2, price_override: null },
    { id: "2", size: "6-8", color: "أبيض", stock: 1, price_override: 279 },
    { id: "3", size: "4-6", color: "أسود", stock: 4, price_override: null },
  ];
  assert.deepEqual(uniqueOptions(variants), {
    sizes: ["4-6", "6-8"],
    colors: ["أبيض", "أسود"],
  });
});

test("variant selection respects both size and color", () => {
  const variants = [
    { id: "1", size: "4-6", color: "أبيض", stock: 2, price_override: null },
    { id: "2", size: "4-6", color: "أسود", stock: 1, price_override: null },
  ];
  assert.equal(selectVariant(variants, "4-6", "أسود")?.id, "2");
  assert.equal(selectVariant(variants, "6-8", "أسود"), null);
});
