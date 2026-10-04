export type VariantLike = {
  id: string;
  size: string | null;
  color: string | null;
  stock: number;
  price_override: number | null;
};

export function uniqueOptions(variants: VariantLike[]) {
  return {
    sizes: [...new Set(variants.map((variant) => variant.size).filter(Boolean))] as string[],
    colors: [...new Set(variants.map((variant) => variant.color).filter(Boolean))] as string[],
  };
}

export function selectVariant(
  variants: VariantLike[],
  size?: string | null,
  color?: string | null,
) {
  return variants.find(
    (variant) =>
      (size == null || variant.size === size) &&
      (color == null || variant.color === color),
  ) ?? null;
}
