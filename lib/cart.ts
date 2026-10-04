export type CartItem = {
  key: string;
  productId: string;
  variantId?: string;
  name_ar: string;
  name_en: string;
  price: number;
  compare_at_price?: number | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
};

export function addCartItem(items: CartItem[], item: Omit<CartItem, "quantity"> & { quantity?: number }) {
  const quantity = Math.max(1, item.quantity ?? 1);
  const index = items.findIndex((entry) => entry.key === item.key);
  if (index === -1) return [...items, { ...item, quantity }];
  return items.map((entry, i) => i === index ? { ...entry, quantity: entry.quantity + quantity } : entry);
}

export function removeCartItem(items: CartItem[], key: string) {
  return items.filter((item) => item.key !== key);
}

export function updateCartQuantity(items: CartItem[], key: string, quantity: number) {
  if (quantity <= 0) return removeCartItem(items, key);
  return items.map((item) => item.key === key ? { ...item, quantity } : item);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
