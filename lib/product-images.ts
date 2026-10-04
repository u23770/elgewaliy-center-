export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
};

export function nextImageOrder(images: Pick<ProductImage, "sort_order">[]) {
  return images.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1;
}

export function imagePath(productId: string, fileName: string) {
  const safe = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return `${productId}/${Date.now()}-${safe}`;
}
