export type SearchableProduct = {
  id: string;
  name_ar: string;
  name_en: string;
  category_id: string | null;
};

export type StoreVariant = {
  id: string;
  size: string | null;
  color: string | null;
  stock: number;
  price_override: number | null;
};

export function filterProducts<T extends SearchableProduct>(
  products: T[],
  categoryId: string,
  query: string,
) {
  const q = query.trim().toLocaleLowerCase("ar-EG");
  return products.filter((product) => {
    if (categoryId !== "all" && product.category_id !== categoryId) return false;
    if (!q) return true;
    return product.name_ar.toLocaleLowerCase("ar-EG").includes(q) ||
      product.name_en.toLocaleLowerCase("en-US").includes(q);
  });
}

export function getVisibleVariantOptions(
  variants: StoreVariant[],
  selectedSize: string | null,
  selectedColor: string | null,
) {
  const available = variants.filter((variant) => variant.stock > 0);
  const forSizes = selectedColor ? available.filter((variant) => variant.color === selectedColor) : available;
  const forColors = selectedSize ? available.filter((variant) => variant.size === selectedSize) : available;
  return {
    sizes: [...new Set(forSizes.map((variant) => variant.size).filter(Boolean))] as string[],
    colors: [...new Set(forColors.map((variant) => variant.color).filter(Boolean))] as string[],
  };
}

export function shouldOpenCart(search: string) { return new URLSearchParams(search).get("cart") === "open"; }

export function getVariantPrice(basePrice: number, variant: Pick<StoreVariant, "price_override"> | null | undefined) {
  const value = Number(variant?.price_override ?? NaN);
  return Number.isFinite(value) ? value : Number(basePrice);
}
