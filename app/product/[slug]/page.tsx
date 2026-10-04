"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { addCartItem, type CartItem } from "@/lib/cart";
import { selectVariant, uniqueOptions, type VariantLike } from "@/lib/product-variants";
import type { Product } from "@/lib/types";

type Variant = VariantLike & { product_id: string };
type Image = { id: string; url: string; alt_ar: string | null; alt_en: string | null; sort_order: number };

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("products").select("*").eq("slug", params.slug).eq("is_active", true).maybeSingle();
      if (!p) return;
      setProduct(p as Product);
      const [{ data: vs }, { data: imgs }] = await Promise.all([
        supabase.from("product_variants").select("id,product_id,size,color,stock,price_override").eq("product_id", p.id).eq("is_active", true),
        supabase.from("product_images").select("id,url,alt_ar,alt_en,sort_order").eq("product_id", p.id).order("sort_order"),
      ]);
      const list = (vs || []) as Variant[];
      setVariants(list);
      const options = uniqueOptions(list);
      setSize(options.sizes[0] ?? null);
      setColor(options.colors[0] ?? null);
      setImages((imgs || []) as Image[]);
    })();
  }, [params.slug]);

  const options = useMemo(() => uniqueOptions(variants), [variants]);
  const selectedVariant = useMemo(() => selectVariant(variants, size, color) ?? variants[0] ?? null, [variants, size, color]);
  const price = Number(selectedVariant?.price_override ?? product?.price ?? 0);

  function addToCart() {
    if (!product) return;
    if (variants.length && !selectedVariant) { setMessage("اختار المقاس واللون المناسب."); return; }
    if (selectedVariant && selectedVariant.stock < qty) { setMessage("الكمية المطلوبة غير متاحة."); return; }

    const item: CartItem = {
      key: product.id + "-" + (selectedVariant?.id ?? "base"),
      productId: product.id,
      variantId: selectedVariant?.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      price,
      compare_at_price: product.compare_at_price,
      size: selectedVariant?.size ?? size,
      color: selectedVariant?.color ?? color,
      quantity: qty,
    };
    try {
      const current = JSON.parse(localStorage.getItem("elgewaliy-cart") || "[]");
      localStorage.setItem("elgewaliy-cart", JSON.stringify(addCartItem(Array.isArray(current) ? current : [], item)));
      router.push("/?cart=open");
    } catch { setMessage("تعذر إضافة المنتج للسلة."); }
  }

  if (!product) return <main className="store-shell min-h-screen grid place-items-center"><p className="font-bold">جارٍ تحميل المنتج...</p></main>;

  return (
    <main className="store-shell min-h-screen" dir="rtl">
      <header className="site-header"><div className="nav-wrap"><a href="/" className="brand-lockup"><span className="brand-mark">ج</span><span><b>الجويلي</b><small>ELGEWALIY</small></span></a><a href="/" className="font-black text-orange-600">العودة للمتجر</a></div></header>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-[2rem] bg-[#fff1e5] aspect-square">
            {images[0] ? <img src={images[0].url} alt={images[0].alt_ar || product.name_ar} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-8xl font-black text-orange-200">ج</div>}
          </div>
          {images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-3">{images.map(img => <img key={img.id} src={img.url} alt={img.alt_ar || ""} className="aspect-square rounded-2xl object-cover" />)}</div>}
        </div>
        <div className="py-4">
          <span className="text-sm font-black text-orange-600">ELGEWALIY / KIDSWEAR</span>
          <h1 className="mt-3 text-4xl font-black">{product.name_ar}</h1>
          <p className="mt-1 text-zinc-500">{product.name_en}</p>
          <div className="mt-6 flex items-center gap-3"><b className="text-3xl">{price.toLocaleString("ar-EG")} ج.م</b>{product.compare_at_price && <del className="text-zinc-400">{Number(product.compare_at_price).toLocaleString("ar-EG")} ج.م</del>}</div>
          <p className="mt-6 leading-8 text-zinc-600">{product.description_ar || "قطعة مختارة من تشكيلة الجويلي للأطفال."}</p>
          {options.sizes.length > 0 && <div className="mt-7"><b>المقاس</b><div className="mt-3 flex flex-wrap gap-2">{options.sizes.map(v => <button key={v} onClick={() => setSize(v)} className={size === v ? "rounded-xl bg-orange-500 px-4 py-3 font-black text-white" : "rounded-xl bg-zinc-100 px-4 py-3 font-bold"}>{v}</button>)}</div></div>}
          {options.colors.length > 0 && <div className="mt-5"><b>اللون</b><div className="mt-3 flex flex-wrap gap-2">{options.colors.map(v => <button key={v} onClick={() => setColor(v)} className={color === v ? "rounded-xl bg-orange-500 px-4 py-3 font-black text-white" : "rounded-xl bg-zinc-100 px-4 py-3 font-bold"}>{v}</button>)}</div></div>}
          <div className="mt-6 flex items-center gap-3"><button onClick={() => setQty(q => Math.max(1,q-1))} className="h-12 w-12 rounded-xl bg-zinc-100 text-xl font-black">−</button><b className="w-8 text-center">{qty}</b><button onClick={() => setQty(q => q+1)} className="h-12 w-12 rounded-xl bg-zinc-100 text-xl font-black">+</button><span className="text-sm text-zinc-500">{selectedVariant ? `المتاح: ${selectedVariant.stock}` : ""}</span></div>
          <button onClick={addToCart} className="mt-6 w-full rounded-2xl bg-orange-500 px-6 py-4 text-lg font-black text-white">أضف للسلة</button>
          {message && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}
        </div>
      </section>
    </main>
  );
}
