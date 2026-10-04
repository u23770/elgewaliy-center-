export const DEMO_PRODUCT_IMAGES: Record<string, string> = {
  "kids-cotton-tshirt":
    "https://images.unsplash.com/photo-1552873816-636e43209957?auto=format&fit=crop&q=82&w=1400",
  "boys-tracksuit":
    "https://images.unsplash.com/flagged/photo-1555895361-b7fa814c0d26?auto=format&fit=crop&q=82&w=1400",
  "girls-dress":
    "https://images.unsplash.com/photo-1590209447055-e53ad37a8004?auto=format&fit=crop&q=82&w=1400",
  "kids-summer-set":
    "https://images.unsplash.com/photo-1766918780914-5df4a5a98c44?auto=format&fit=crop&q=82&w=1400",
};

export function getProductImage(
  slug: string,
  images: Array<{ url: string; sort_order: number }> = [],
) {
  const mainImage = [...images].sort(
    (a, b) => a.sort_order - b.sort_order,
  )[0]?.url;

  return mainImage || DEMO_PRODUCT_IMAGES[slug] || null;
}
