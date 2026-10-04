"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { imagePath, nextImageOrder, type ProductImage } from "@/lib/product-images";

type Product = { id: string; name_ar: string; name_en: string; price: number; compare_at_price: number | null; is_active: boolean; category_id: string | null; };

type Variant = { id: string; product_id: string; size: string | null; color: string | null; sku: string | null; stock: number; price_override: number | null; is_active: boolean; };

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  accepted: "تم القبول",
  preparing: "جاري التجهيز",
  ready: "جاهز",
  out_for_delivery: "خرج للتوصيل",
  shipped: "خرج للتوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const workflow = ["new", "accepted", "preparing", "ready", "out_for_delivery", "delivered"];

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantForm, setVariantForm] = useState({ size: "", color: "", sku: "", stock: "0", price: "" });
  const [variantSaving, setVariantSaving] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const loadProducts = useCallback(async () => {
    const [{ data, error: e }, { data: cats }] = await Promise.all([
      supabase.from("products").select("id,name_ar,name_en,price,compare_at_price,is_active,category_id").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name_ar,name_en").order("sort_order")
    ]);
    if (e) setError("تعذر تحميل المنتجات."); else { setProducts((data || []) as Product[]); setCategories(cats || []); }
  }, []);

  const loadOrders = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("orders")
      .select("id,order_number,customer_name,customer_phone,customer_address,total,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (queryError) {
      setError("تعذر تحميل الطلبات. تأكد من صلاحيات حساب الموظف.");
      return;
    }

    setOrders((data || []) as Order[]);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: staff } = await supabase
        .from("admins")
        .select("id,role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const isStaff = !!staff && (staff.role === "admin" || staff.role === "staff");
      setAuthorized(isStaff);
      if (!isStaff) {
        setLoading(false);
        return;
      }

      await Promise.all([loadOrders(), loadProducts()]);
      setLoading(false);

      channel = supabase
        .channel("elgewaliy-admin-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_events" }, () => loadOrders())
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadOrders, loadProducts]);

  const addProduct = async () => {
    const nameAr = window.prompt("اسم المنتج بالعربي؟");
    if (!nameAr) return;
    const nameEn = window.prompt("اسم المنتج بالإنجليزية؟");
    const price = window.prompt("السعر؟");
    if (!nameEn || !price) return;
    const slug = nameEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error: e } = await supabase.rpc("upsert_store_product", { p_id: null, p_category_id: categories[0]?.id || null, p_name_ar: nameAr, p_name_en: nameEn, p_slug: slug, p_description_ar: null, p_description_en: null, p_price: Number(price), p_compare_at_price: null, p_is_active: true });
    if (e) setError(e.message); else await loadProducts();
  };

  const loadVariants = async (productId: string) => {
    const { data, error: e } = await supabase.from("product_variants").select("id,product_id,size,color,sku,stock,price_override,is_active").eq("product_id", productId).order("size").order("color");
    if (e) setError("تعذر تحميل المقاسات والألوان."); else setVariants((data || []) as Variant[]);
  };

  const loadImages = async (productId: string) => { const { data, error: e } = await supabase.from("product_images").select("id,product_id,url,alt_ar,alt_en,sort_order").eq("product_id", productId).order("sort_order"); if (e) setError("تعذر تحميل صور المنتج."); else setImages((data || []) as ProductImage[]); };

  const uploadImages = async (files: FileList | null) => { if (!selectedProduct || !files?.length) return; setUploadingImages(true); setError(""); try { for (const file of Array.from(files)) { if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("الصور يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 5MB."); const path=imagePath(selectedProduct.id,file.name); const {error:uploadError}=await supabase.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type}); if(uploadError) throw uploadError; const {data:publicData}=supabase.storage.from("product-images").getPublicUrl(path); const {error:dbError}=await supabase.from("product_images").insert({product_id:selectedProduct.id,url:publicData.publicUrl,alt_ar:selectedProduct.name_ar,alt_en:selectedProduct.name_en,sort_order:nextImageOrder(images)}); if(dbError) throw dbError; await loadImages(selectedProduct.id); } } catch(e){setError(e instanceof Error?e.message:"تعذر رفع الصور.")} finally{setUploadingImages(false)} };

  const deleteImage = async (image: ProductImage) => { const {error:e}=await supabase.from("product_images").delete().eq("id",image.id); if(e){setError(e.message);return;} await loadImages(image.product_id); };

  const openVariants = async (product: Product) => {
    setSelectedProduct(product);
    setVariantForm({ size: "", color: "", sku: "", stock: "0", price: "" });
    await Promise.all([loadVariants(product.id),loadImages(product.id)]);
  };

  const startEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setVariantForm({ size: variant.size || "", color: variant.color || "", sku: variant.sku || "", stock: String(variant.stock), price: variant.price_override == null ? "" : String(variant.price_override) });
  };

  const saveVariant = async () => {
    if (!selectedProduct) return;
    const stock = Number(variantForm.stock);
    if (!Number.isInteger(stock) || stock < 0) { setError("المخزون يجب أن يكون رقمًا صحيحًا غير سالب."); return; }
    setVariantSaving(true); setError("");
    const { error: e } = await supabase.rpc("set_store_variant", {
      p_id: editingVariant?.id ?? null,
      p_product_id: selectedProduct.id,
      p_size: variantForm.size.trim() || null,
      p_color: variantForm.color.trim() || null,
      p_sku: variantForm.sku.trim() || null,
      p_stock: stock,
      p_price_override: variantForm.price.trim() ? Number(variantForm.price) : null,
      p_is_active: true,
    });
    if (e) setError(e.message); else { setVariantForm({ size: "", color: "", sku: "", stock: "0", price: "" }); setEditingVariant(null); await loadVariants(selectedProduct.id); }
    setVariantSaving(false);
  };

  const toggleVariant = async (variant: Variant) => {
    if (!selectedProduct) return;
    const { error: e } = await supabase.rpc("set_store_variant", { p_id: variant.id, p_product_id: variant.product_id, p_size: variant.size, p_color: variant.color, p_sku: variant.sku, p_stock: variant.stock, p_price_override: variant.price_override, p_is_active: !variant.is_active });
    if (e) setError(e.message); else await loadVariants(selectedProduct.id);
  };

  const toggleProduct = async (product: Product) => {
    const { error: e } = await supabase.rpc("upsert_store_product", { p_id: product.id, p_category_id: product.category_id, p_name_ar: product.name_ar, p_name_en: product.name_en, p_slug: product.name_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"), p_description_ar: null, p_description_en: null, p_price: product.price, p_compare_at_price: product.compare_at_price, p_is_active: !product.is_active });
    if (e) setError(e.message); else await loadProducts();
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    setError("");

    const { error: rpcError } = await supabase.rpc("update_store_order_status", {
      p_order_id: orderId,
      p_status: status,
      p_note: null,
    });

    if (rpcError) {
      setError(rpcError.message || "تعذر تحديث حالة الطلب.");
    } else {
      await loadOrders();
    }

    setUpdating(null);
  };

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((order) => new Date(order.created_at).toDateString() === today);
  }, [orders]);

  const activeOrders = orders.filter((order) =>
    !["delivered", "cancelled"].includes(order.status)
  );

  const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-[#fffaf5]"><p className="font-bold">جارٍ تحميل لوحة التشغيل...</p></main>;
  }

  if (!authorized) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#fffaf5] p-6 text-center">
        <div className="card max-w-md p-8">
          <div className="text-sm font-black text-orange-600">ELGEWALIY OPERATIONS</div>
          <h1 className="mt-3 text-3xl font-black">الدخول للوحة التشغيل</h1>
          <p className="mt-3 text-zinc-500">سجّل الدخول بحساب موظف أو مدير مصرح له.</p>
          <a href="/auth" className="mt-6 inline-flex rounded-2xl bg-orange-500 px-6 py-3 font-black text-white">تسجيل الدخول</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div>
            <b className="text-2xl">الجويلي</b>
            <span className="mr-3 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">لوحة التشغيل</span>
          </div>
          <a href="/" className="font-black text-orange-600">المتجر ↗</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-7 flex gap-2 overflow-x-auto">
          <button onClick={() => setTab("orders")} className={`rounded-2xl px-5 py-3 font-black ${tab === "orders" ? "bg-orange-500 text-white" : "bg-white"}`}>الطلبات</button>
          <button onClick={() => setTab("products")} className={`rounded-2xl px-5 py-3 font-black ${tab === "products" ? "bg-orange-500 text-white" : "bg-white"}`}>المنتجات</button>
        </div>

        {tab === "orders" ? (
          <section>
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="card p-5"><span className="text-zinc-500">طلبات اليوم</span><b className="mt-2 block text-3xl">{todayOrders.length}</b></div>
              <div className="card p-5"><span className="text-zinc-500">طلبات نشطة</span><b className="mt-2 block text-3xl text-orange-500">{activeOrders.length}</b></div>
              <div className="card p-5"><span className="text-zinc-500">مبيعات اليوم</span><b className="mt-2 block text-3xl">{todaySales.toLocaleString("ar-EG")} ج.م</b></div>
            </div>

            {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

            <div className="card overflow-hidden">
              <div className="border-b p-5">
                <h1 className="text-xl font-black">متابعة الطلبات لحظيًا</h1>
                <p className="mt-1 text-sm text-zinc-500">أي طلب جديد أو تحديث حالة يظهر تلقائيًا.</p>
              </div>

              {orders.length === 0 ? (
                <div className="p-10 text-center text-zinc-500">لا توجد طلبات حتى الآن.</div>
              ) : (
                orders.map((order) => (
                  <article key={order.id} className="border-b p-5 last:border-0">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-lg">{order.order_number}</b>
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">{statusLabels[order.status] || order.status}</span>
                        </div>
                        <div className="mt-2 text-sm text-zinc-500">{order.customer_name} • {order.customer_phone}</div>
                        <div className="mt-1 text-sm text-zinc-400">{order.customer_address}</div>
                        <div className="mt-2 font-black">{Number(order.total).toLocaleString("ar-EG")} ج.م</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={(event) => updateStatus(order.id, event.target.value)}
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold disabled:opacity-50"
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {updating === order.id && <span className="text-xs font-bold text-zinc-400">جارٍ الحفظ...</span>}
                      </div>
                    </div>

                    {workflow.includes(order.status) && (
                      <div className="mt-5 grid grid-cols-6 gap-1">
                        {workflow.map((step) => {
                          const current = workflow.indexOf(order.status);
                          const stepIndex = workflow.indexOf(step);
                          return <span key={step} className={`h-1.5 rounded-full ${stepIndex <= current ? "bg-orange-500" : "bg-orange-100"}`} />;
                        })}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="card p-6"><div className="flex items-center justify-between gap-3"><h1 className="text-xl font-black">إدارة المنتجات</h1><button onClick={() => void addProduct()} className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-white">+ إضافة منتج</button></div><p className="mt-2 text-zinc-500">المنتجات الحالية: {products.length}</p></div><div className="card overflow-hidden">{products.map(p => <div key={p.id} className="border-b p-5 last:border-0"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><b>{p.name_ar}</b><div className="text-sm text-zinc-500">{p.name_en} • {Number(p.price).toLocaleString("ar-EG")} ج.م</div></div><div className="flex flex-wrap gap-2"><button onClick={() => void openVariants(p)} className="rounded-xl border border-orange-200 bg-white px-4 py-2 font-bold text-orange-700">المقاسات والألوان</button><button onClick={() => void toggleProduct(p)} className="rounded-xl bg-orange-50 px-4 py-2 font-bold text-orange-700">{p.is_active ? "نشط" : "مخفي"}</button></div></div></div>)}</div><div className="card p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">Variants</h2><p className="mt-1 text-sm text-zinc-500">{selectedProduct ? `${selectedProduct.name_ar} — ${variants.length} خيار` : "اختر منتجًا لإدارة المقاسات والألوان والمخزون."}</p></div>{selectedProduct && <button onClick={() => setSelectedProduct(null)} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold">إغلاق</button>}</div>{selectedProduct && <><div className="mb-4 rounded-2xl bg-orange-50 p-4"><div className="font-black text-orange-800">{editingVariant ? "تعديل الـVariant" : "إضافة Variant جديد"}</div><div className="mt-1 text-sm text-orange-700">{editingVariant ? "عدّل البيانات ثم اضغط حفظ التعديلات." : "أضف مقاسًا أو لونًا ومخزونًا جديدًا للمنتج."}</div></div><div className="grid gap-3 md:grid-cols-5"><input value={variantForm.size} onChange={e => setVariantForm(v => ({...v,size:e.target.value}))} placeholder="المقاس مثل 6-8" className="rounded-xl border p-3"/><input value={variantForm.color} onChange={e => setVariantForm(v => ({...v,color:e.target.value}))} placeholder="اللون مثل أسود" className="rounded-xl border p-3"/><input value={variantForm.sku} onChange={e => setVariantForm(v => ({...v,sku:e.target.value}))} placeholder="SKU" className="rounded-xl border p-3"/><input type="number" min="0" value={variantForm.stock} onChange={e => setVariantForm(v => ({...v,stock:e.target.value}))} placeholder="المخزون" className="rounded-xl border p-3"/><input type="number" min="0" value={variantForm.price} onChange={e => setVariantForm(v => ({...v,price:e.target.value}))} placeholder="سعر خاص اختياري" className="rounded-xl border p-3"/></div><button disabled={variantSaving} onClick={() => void saveVariant()} className="mt-3 rounded-xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50">{variantSaving ? "جارٍ الحفظ..." : editingVariant ? "حفظ التعديلات" : "إضافة Variant"}</button>{editingVariant && <button onClick={() => { setEditingVariant(null); setVariantForm({ size: "", color: "", sku: "", stock: "0", price: "" }); }} className="mr-2 rounded-xl bg-zinc-100 px-5 py-3 font-black">إلغاء التعديل</button>}<div className="mt-6 rounded-2xl border p-4"><h3 className="font-black">صور المنتج</h3><p className="mt-1 text-xs text-zinc-500">JPG / PNG / WebP — حد أقصى 5MB للصورة.</p><label className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-orange-200 p-4 text-center font-black text-orange-700"><input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingImages} onChange={e=>void uploadImages(e.target.files)}/>{uploadingImages?"جارٍ رفع الصور...":"إضافة صور"}</label>{images.length>0&&<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{images.map(image=><div key={image.id} className="relative overflow-hidden rounded-xl border"><img src={image.url} alt={image.alt_ar||""} className="aspect-square w-full object-cover"/><button onClick={()=>void deleteImage(image)} className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-black text-red-600">حذف</button></div>)}</div>}</div><div className="mt-6 divide-y rounded-2xl border">{variants.length === 0 ? <div className="p-6 text-center text-zinc-500">لا توجد Variants لهذا المنتج.</div> : variants.map(v => <div key={v.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2 text-sm"><span className="rounded-lg bg-zinc-100 px-3 py-1 font-bold">{v.size || "بدون مقاس"}</span><span className="rounded-lg bg-zinc-100 px-3 py-1 font-bold">{v.color || "بدون لون"}</span><span className="rounded-lg bg-zinc-100 px-3 py-1">SKU: {v.sku || "—"}</span><span className="rounded-lg bg-orange-50 px-3 py-1 font-bold text-orange-700">مخزون: {v.stock}</span>{v.price_override != null && <span className="rounded-lg bg-green-50 px-3 py-1 font-bold text-green-700">{Number(v.price_override).toLocaleString("ar-EG")} ج.م</span>}</div><div className="flex gap-2"><button onClick={() => startEditVariant(v)} className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-700">تعديل</button><button onClick={() => void toggleVariant(v)} className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold">{v.is_active ? "نشط" : "مخفي"}</button></div></div>)}</div></>}</div>
          </section>
        )}
      </div>
    </main>
  );
}
