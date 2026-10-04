export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_ar: string | null;
  alt_en: string | null;
  sort_order: number;
};

export function nextImageOrder(images: Pick<ProductImage, "sort_order">[]) {
  return images.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1;
}

export function imagePath(productId: string, fileName: string) {
  const safe = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return productId + "/" + Date.now() + "-" + safe;
}

export function moveImage<T extends { sort_order: number }>(images: T[], imageId: string, direction: "up" | "down", getId: (image: T) => string) {
  const ordered = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const index = ordered.findIndex((image) => getId(image) === imageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ordered.length) return images;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered.map((image, nextIndex) => ({ ...image, sort_order: nextIndex }));
}

export function storagePathFromPublicUrl(url: string, bucket: string) {
  const marker = "/storage/v1/object/public/" + bucket + "/";
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}