"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callAdmin } from "@/lib/admin-gateway";
import type { ProductImage } from "@/lib/product-images";

type Product = {
  id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  created_at: string;
};

type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type Variant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stock: number;
  price_override: number | null;
  is_active: boolean;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_method: string;
  maps_link: string | null;
  delivery_zone: string | null;
  delivery_subzone: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_ar: string;
  product_name_en: string;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  total: number;
};

type Dashboard = {
  products: Product[];
  categories: Category[];
  variants: Variant[];
  images: ProductImage[];
  orders: Order[];
  orderItems: OrderItem[];
  generatedAt: string;
};

const statuses = [
  ["new", "جديد"],
  ["accepted", "تم القبول"],
  ["preparing", "جاري التجهيز"],
  ["ready", "جاهز"],
  ["out_for_delivery", "خرج للتوصيل"],
  ["delivered", "تم التوصيل"],
  ["cancelled", "ملغي"],
] as const;

const emptyProductForm = {
  name_ar: "",
  name_en: "",
  slug: "",
  description_ar: "",
  description_en: "",
  price: "",
  compare_at_price: "",
  category_id: "",
};

const emptyCategoryForm = {
  name_ar: "",
  name_en: "",
  slug: "",
  image_url: "",
  sort_order: "0",
};

const emptyVariantForm = {
  size: "",
  color: "",
  sku: "",
  stock: "0",
  price_override: "",
};

function statusLabel(status: string) {
  return statuses.find(([value]) => value === status)?.[1] || status;
}

function statusTone(status: string) {
  if (status === "new") return "bg-orange-500 text-white";
  if (status === "accepted" || status === "preparing") return "bg-amber-100 text-amber-800";
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "out_for_delivery") return "bg-sky-100 text-sky-800";
  if (status === "delivered") return "bg-zinc-100 text-zinc-700";
  return "bg-red-100 text-red-700";
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("ar-EG");
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export default function Admin() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<"overview" | "orders" | "products" | "categories">("overview");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const seenOrdersRef = useRef<Set<string> | null>(null);

  const products = data?.products || [];
  const categories = data?.categories || [];
  const variants = data?.variants || [];
  const images = data?.images || [];
  const orders = data?.orders || [];
  const orderItems = data?.orderItems || [];

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;

  const selectedVariants = useMemo(
    () => variants.filter((variant) => variant.product_id === selectedProductId),
    [variants, selectedProductId],
  );

  const selectedImages = useMemo(
    () =>
      images
        .filter((image) => image.product_id === selectedProductId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [images, selectedProductId],
  );

  const selectedOrderItems = useMemo(
    () => orderItems.filter((item) => item.order_id === selectedOrderId),
    [orderItems, selectedOrderId],
  );

  const activeOrders = orders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status),
  );

  const todayOrders = orders.filter(
    (order) =>
      new Date(order.created_at).toDateString() === new Date().toDateString(),
  );

  const todaySales = todayOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );

  const lowStockCount = variants.filter(
    (variant) => variant.is_active && variant.stock <= 2,
  ).length;

  const loadDashboard = useCallback(
    async (accessToken: string, silent = false) => {
      if (!accessToken) return;

      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const next = await callAdmin<Dashboard>(accessToken, {
          action: "dashboard",
        });

        if (seenOrdersRef.current === null) {
          seenOrdersRef.current = new Set(next.orders.map((order) => order.id));
        } else {
          const fresh = next.orders.filter(
            (order) =>
              !seenOrdersRef.current?.has(order.id) && order.status === "new",
          );
          if (fresh.length) {
            setNewOrderCount((count) => count + fresh.length);
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate?.(180);
            }
          }
          next.orders.forEach((order) => seenOrdersRef.current?.add(order.id));
        }

        setData(next);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "تعذر الاتصال بلوحة الإدارة.";
        setError(message);
        if (message.includes("رمز لوحة الإدارة غير صحيح")) {
          sessionStorage.removeItem("elgewaliy-admin-token");
          setToken("");
          setData(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const saved = sessionStorage.getItem("elgewaliy-admin-token") || "";
    if (saved) {
      setToken(saved);
      void loadDashboard(saved);
    } else {
      setLoading(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      void loadDashboard(token, true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadDashboard, token]);

  useEffect(() => {
    document.title =
      newOrderCount > 0
        ? "(" + newOrderCount + ") Elgewaliy Admin"
        : "Elgewaliy Admin";
  }, [newOrderCount]);

  async function connect() {
    const nextToken = tokenInput.trim();
    if (!nextToken) {
      setError("اكتب رمز لوحة الإدارة.");
      return;
    }

    setConnecting(true);
    setError("");

    try {
      const dashboard = await callAdmin<Dashboard>(nextToken, {
        action: "dashboard",
      });
      sessionStorage.setItem("elgewaliy-admin-token", nextToken);
      setToken(nextToken);
      setData(dashboard);
      seenOrdersRef.current = new Set(dashboard.orders.map((order) => order.id));
      setTokenInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر فتح لوحة الإدارة.");
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("elgewaliy-admin-token");
    setToken("");
    setData(null);
    setNewOrderCount(0);
    setError("");
  }

  async function runAction(action: string, payload: Record<string, unknown> = {}) {
    if (!token) return;
    setError("");
    try {
      await callAdmin(token, { action, ...payload });
      await loadDashboard(token, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تنفيذ العملية.");
    }
  }

  function startProduct(product?: Product) {
    if (product) {
      setEditingProductId(product.id);
      setProductForm({
        name_ar: product.name_ar,
        name_en: product.name_en,
        slug: product.slug,
        description_ar: product.description_ar || "",
        description_en: product.description_en || "",
        price: String(product.price),
        compare_at_price:
          product.compare_at_price == null
            ? ""
            : String(product.compare_at_price),
        category_id: product.category_id || "",
      });
    } else {
      setEditingProductId(null);
      setProductForm({
        ...emptyProductForm,
        category_id: categories[0]?.id || "",
      });
    }
  }

  async function saveProduct() {
    const price = Number(productForm.price);
    const compare =
      productForm.compare_at_price.trim() === ""
        ? null
        : Number(productForm.compare_at_price);

    if (
      !productForm.name_ar.trim() ||
      !productForm.name_en.trim() ||
      !productForm.slug.trim() ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("راجع اسم المنتج والـSlug والسعر.");
      return;
    }

    setSaving(true);
    await runAction("save_product", {
      id: editingProductId,
      name_ar: productForm.name_ar,
      name_en: productForm.name_en,
      slug: productForm.slug.toLowerCase(),
      description_ar: productForm.description_ar,
      description_en: productForm.description_en,
      price,
      compare_at_price: compare,
      category_id: productForm.category_id || null,
      is_active: true,
    });
    setSaving(false);
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  }

  function startCategory(category?: Category) {
    if (category) {
      setEditingCategoryId(category.id);
      setCategoryForm({
        name_ar: category.name_ar,
        name_en: category.name_en,
        slug: category.slug,
        image_url: category.image_url || "",
        sort_order: String(category.sort_order),
      });
    } else {
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
    }
  }

  async function saveCategory() {
    if (
      !categoryForm.name_ar.trim() ||
      !categoryForm.name_en.trim() ||
      !categoryForm.slug.trim()
    ) {
      setError("راجع بيانات القسم.");
      return;
    }

    setSaving(true);
    await runAction("save_category", {
      id: editingCategoryId,
      name_ar: categoryForm.name_ar,
      name_en: categoryForm.name_en,
      slug: categoryForm.slug.toLowerCase(),
      image_url: categoryForm.image_url,
      sort_order: Number(categoryForm.sort_order) || 0,
      is_active: true,
    });
    setSaving(false);
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  }

  function startVariant(variant?: Variant) {
    if (variant) {
      setEditingVariantId(variant.id);
      setVariantForm({
        size: variant.size || "",
        color: variant.color || "",
        sku: variant.sku || "",
        stock: String(variant.stock),
        price_override:
          variant.price_override == null
            ? ""
            : String(variant.price_override),
      });
    } else {
      setEditingVariantId(null);
      setVariantForm(emptyVariantForm);
    }
  }

  async function saveVariant() {
    if (!selectedProductId) return;

    const stock = Math.max(0, Math.trunc(Number(variantForm.stock) || 0));
    const override =
      variantForm.price_override.trim() === ""
        ? null
        : Number(variantForm.price_override);

    if (
      !Number.isFinite(stock) ||
      stock < 0 ||
      (override !== null && (!Number.isFinite(override) || override < 0))
    ) {
      setError("راجع المخزون والسعر الخاص.");
      return;
    }

    setSaving(true);
    await runAction("save_variant", {
      id: editingVariantId,
      product_id: selectedProductId,
      size: variantForm.size,
      color: variantForm.color,
      sku: variantForm.sku,
      stock,
      price_override: override,
      is_active: true,
    });
    setSaving(false);
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
  }

  async function uploadImages(fileList: FileList | null) {
    if (!selectedProductId || !fileList?.length) return;

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(fileList)) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        ) {
          throw new Error(
            "الصورة يجب أن تكون JPG أو PNG أو WebP وبحد أقصى 5MB.",
          );
        }

        const base64 = await fileToBase64(file);
        await callAdmin(token, {
          action: "upload_image",
          product_id: selectedProductId,
          file_name: file.name,
          mime_type: file.type,
          data_base64: base64,
          alt_ar: selectedProduct?.name_ar || "صورة منتج",
          alt_en: selectedProduct?.name_en || "Product image",
        });
      }

      await loadDashboard(token, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر رفع الصور.");
    } finally {
      setUploading(false);
    }
  }

  async function moveImage(image: ProductImage, direction: "up" | "down") {
    if (!selectedProductId) return;

    const ordered = [...selectedImages];
    const index = ordered.findIndex((item) => item.id === image.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ordered.length) return;

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    await runAction("reorder_images", {
      product_id: selectedProductId,
      image_ids: ordered.map((item) => item.id),
    });
  }

  if (!token) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#17120e] px-4 py-10 text-zinc-900"
      >
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-lg place-items-center">
          <div className="w-full overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-orange-500 to-amber-300 p-8 text-white">
              <div className="text-xs font-black tracking-[0.24em]">
                ELGEWALIY / OPERATIONS
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                لوحة التشغيل
              </h1>
              <p className="mt-2 max-w-sm text-sm font-semibold text-white/80">
                إدارة المنتجات والصور والمخزون والطلبات من مكان منفصل عن حسابات العملاء.
              </p>
            </div>
            <div className="p-8">
              <label className="text-sm font-black">رمز لوحة الإدارة</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void connect();
                }}
                placeholder="أدخل الرمز"
                autoComplete="off"
                className="mt-2 h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}
              <button
                onClick={() => void connect()}
                disabled={connecting}
                className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-zinc-950 font-black text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:opacity-50"
              >
                {connecting ? "جارٍ فتح اللوحة..." : "فتح لوحة الإدارة"}
              </button>
              <a
                href="/"
                className="mt-4 block text-center text-sm font-black text-zinc-400 hover:text-orange-600"
              >
                العودة إلى المتجر
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !data) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#fffaf5] grid place-items-center">
        <div className="text-center">
          <div className="mx-auto size-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="mt-4 font-black">جارٍ تجهيز لوحة التشغيل...</p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f4ef] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-lg font-black text-white">
              ج
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black">الجويلي</div>
              <div className="text-[10px] font-black tracking-[0.18em] text-orange-600">
                CONTROL CENTER
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
              متصل
            </span>
            <span className="text-xs font-bold text-zinc-400">
              تحديث كل 5 ثواني
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black hover:bg-orange-50"
            >
              المتجر ↗
            </a>
            <button
              onClick={logout}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black hover:border-red-200 hover:text-red-600"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:grid-cols-[220px_1fr] md:px-7">
        <aside className="md:sticky md:top-[89px] md:h-[calc(100vh-110px)]">
          <nav className="rounded-3xl border border-black/5 bg-white p-2 shadow-sm">
            {[
              ["overview", "نظرة عامة", "⌂"],
              ["orders", "الطلبات", "↗"],
              ["products", "المنتجات", "▦"],
              ["categories", "الأقسام", "◈"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key as typeof tab);
                  if (key === "orders") setNewOrderCount(0);
                }}
                className={
                  "mb-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition " +
                  (tab === key
                    ? "bg-zinc-950 text-white shadow-lg"
                    : "text-zinc-500 hover:bg-orange-50 hover:text-zinc-950")
                }
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-xl bg-black/5 text-xs">
                    {icon}
                  </span>
                  {label}
                </span>
                {key === "orders" && newOrderCount > 0 && (
                  <span className="grid min-w-7 place-items-center rounded-full bg-orange-500 px-2 py-1 text-[10px] text-white">
                    {newOrderCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-3 hidden rounded-3xl bg-zinc-950 p-5 text-white md:block">
            <div className="text-[10px] font-black tracking-[0.2em] text-white/40">
              LIVE
            </div>
            <div className="mt-2 text-3xl font-black">{activeOrders.length}</div>
            <div className="mt-1 text-xs font-bold text-white/55">
              طلب نشط الآن
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-orange-400" />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {newOrderCount > 0 && (
            <button
              onClick={() => {
                setTab("orders");
                setNewOrderCount(0);
              }}
              className="mb-4 flex w-full items-center justify-between rounded-3xl bg-orange-500 px-5 py-4 text-right text-white shadow-lg shadow-orange-200"
            >
              <span>
                <b className="block text-sm">في طلبات جديدة.</b>
                <span className="mt-1 block text-xs font-bold text-white/75">
                  {newOrderCount} طلب جديد ظهر منذ آخر تحديث.
                </span>
              </span>
              <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-black">
                فتح الطلبات
              </span>
            </button>
          )}

          {error && (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-3xl bg-red-50 p-4 text-sm font-bold text-red-700">
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="rounded-xl bg-white px-3 py-1 text-xs"
              >
                إغلاق
              </button>
            </div>
          )}

          {tab === "overview" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 rounded-[30px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950 p-6 text-white md:flex-row md:items-end md:justify-between md:p-8">
                <div>
                  <div className="text-xs font-black tracking-[0.18em] text-orange-300">
                    ELGEWALIY / TODAY
                  </div>
                  <h1 className="mt-2 text-3xl font-black md:text-5xl">
                    مركز التشغيل
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/60">
                    الطلبات بتتحدث تلقائيًا، والمخزون والصور والمنتجات كلها تحت إيدك.
                  </p>
                </div>
                <button
                  onClick={() => void loadDashboard(token, true)}
                  disabled={refreshing}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-zinc-950 hover:bg-orange-50 disabled:opacity-50"
                >
                  {refreshing ? "جارٍ التحديث..." : "تحديث الآن"}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["طلبات اليوم", todayOrders.length, "طلبات"],
                  ["طلبات نشطة", activeOrders.length, "مفتوح الآن"],
                  ["مبيعات اليوم", formatMoney(todaySales), "ج.م"],
                  ["مخزون منخفض", lowStockCount, "Variant"],
                ].map(([label, value, meta]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
                  >
                    <div className="text-xs font-bold text-zinc-400">{label}</div>
                    <div className="mt-3 text-3xl font-black">{value}</div>
                    <div className="mt-1 text-xs font-bold text-orange-600">
                      {meta}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
                <div className="overflow-hidden rounded-3xl border border-black/5 bg-white">
                  <div className="flex items-center justify-between border-b border-zinc-100 p-5">
                    <div>
                      <h2 className="font-black">آخر الطلبات</h2>
                      <p className="mt-1 text-xs font-bold text-zinc-400">
                        أحدث 6 طلبات
                      </p>
                    </div>
                    <button
                      onClick={() => setTab("orders")}
                      className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700"
                    >
                      كل الطلبات
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {orders.slice(0, 6).map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setTab("orders");
                        }}
                        className="flex w-full items-center justify-between gap-4 p-4 text-right hover:bg-orange-50/60"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <b className="truncate text-sm">{order.order_number}</b>
                            <span
                              className={
                                "rounded-full px-2 py-1 text-[9px] font-black " +
                                statusTone(order.status)
                              }
                            >
                              {statusLabel(order.status)}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-xs font-bold text-zinc-400">
                            {order.customer_name} • {order.customer_phone}
                          </div>
                        </div>
                        <b className="shrink-0 text-sm">
                          {formatMoney(Number(order.total))} ج.م
                        </b>
                      </button>
                    ))}
                    {!orders.length && (
                      <div className="p-8 text-center text-sm font-bold text-zinc-400">
                        لا توجد طلبات حتى الآن.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-black/5 bg-white p-5">
                  <div className="text-xs font-black tracking-[0.18em] text-orange-600">
                    CATALOG
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTab("products")}
                      className="rounded-2xl bg-zinc-50 p-5 text-right hover:bg-orange-50"
                    >
                      <b className="text-2xl">{products.length}</b>
                      <span className="mt-1 block text-xs font-bold text-zinc-400">
                        منتج
                      </span>
                    </button>
                    <button
                      onClick={() => setTab("categories")}
                      className="rounded-2xl bg-zinc-50 p-5 text-right hover:bg-orange-50"
                    >
                      <b className="text-2xl">{categories.length}</b>
                      <span className="mt-1 block text-xs font-bold text-zinc-400">
                        قسم
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 rounded-2xl bg-orange-50 p-5">
                    <div className="text-xs font-bold text-orange-700">
                      الصور الحقيقية
                    </div>
                    <div className="mt-2 text-2xl font-black">
                      {images.length}
                    </div>
                    <div className="mt-1 text-xs font-bold text-orange-700/70">
                      صورة مربوطة بمنتجاتك
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "orders" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-black tracking-[0.18em] text-orange-600">
                    ORDERS / LIVE
                  </div>
                  <h1 className="mt-2 text-3xl font-black">الطلبات</h1>
                  <p className="mt-1 text-sm font-bold text-zinc-400">
                    الطلبات بتظهر هنا تلقائيًا، وتقدر تغيّر حالتها من نفس المكان.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700">
                    {activeOrders.length} نشط
                  </span>
                  <button
                    onClick={() => void loadDashboard(token, true)}
                    className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
                  >
                    تحديث
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {!orders.length && (
                  <div className="rounded-3xl border border-black/5 bg-white p-12 text-center text-sm font-bold text-zinc-400">
                    لا توجد طلبات حتى الآن.
                  </div>
                )}

                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
                  >
                    <button
                      onClick={() =>
                        setSelectedOrderId((current) =>
                          current === order.id ? null : order.id,
                        )
                      }
                      className="w-full p-5 text-right"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-lg">{order.order_number}</b>
                            <span
                              className={
                                "rounded-full px-3 py-1 text-[10px] font-black " +
                                statusTone(order.status)
                              }
                            >
                              {statusLabel(order.status)}
                            </span>
                            {order.status === "new" && (
                              <span className="size-2 animate-pulse rounded-full bg-orange-500" />
                            )}
                          </div>
                          <div className="mt-2 text-sm font-bold text-zinc-500">
                            {order.customer_name} • {order.customer_phone}
                          </div>
                          <div className="mt-1 text-xs font-bold text-zinc-400">
                            {order.customer_address}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-5 lg:justify-end">
                          <div className="text-left">
                            <div className="text-xs font-bold text-zinc-400">
                              {new Date(order.created_at).toLocaleString("ar-EG")}
                            </div>
                            <b className="mt-1 block text-xl">
                              {formatMoney(Number(order.total))} ج.م
                            </b>
                          </div>
                          <span className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-500">
                            {orderItems.filter((item) => item.order_id === order.id).length} صنف
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="border-t border-zinc-100 p-4">
                      <div className="grid gap-2 sm:grid-cols-4">
                        {statuses.map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => void runAction("update_order_status", {
                              order_id: order.id,
                              status: value,
                            })}
                            disabled={order.status === value}
                            className={
                              "rounded-2xl px-3 py-3 text-xs font-black transition disabled:cursor-default disabled:opacity-100 " +
                              (order.status === value
                                ? statusTone(value) + " ring-2 ring-black/5"
                                : "bg-zinc-50 text-zinc-500 hover:bg-orange-50 hover:text-orange-700")
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedOrderId === order.id && (
                      <div className="border-t border-zinc-100 bg-[#fffaf5] p-5">
                        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
                          <div>
                            <div className="text-xs font-black tracking-[0.18em] text-orange-600">
                              ORDER ITEMS
                            </div>
                            <div className="mt-3 space-y-2">
                              {selectedOrderItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4"
                                >
                                  <div className="min-w-0">
                                    <b className="block truncate text-sm">
                                      {item.product_name_ar}
                                    </b>
                                    <div className="mt-1 text-xs font-bold text-zinc-400">
                                      {item.quantity} × {formatMoney(Number(item.unit_price))} ج.م
                                      {item.size ? " • " + item.size : ""}
                                      {item.color ? " • " + item.color : ""}
                                    </div>
                                  </div>
                                  <b className="shrink-0">
                                    {formatMoney(Number(item.total))} ج.م
                                  </b>
                                </div>
                              ))}
                              {!selectedOrderItems.length && (
                                <div className="rounded-2xl bg-white p-6 text-center text-xs font-bold text-zinc-400">
                                  تفاصيل الأصناف غير متاحة.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl bg-zinc-950 p-5 text-white">
                            <div className="text-xs font-black tracking-[0.18em] text-orange-300">
                              CUSTOMER
                            </div>
                            <div className="mt-4 text-lg font-black">
                              {selectedOrder?.customer_name}
                            </div>
                            <a
                              href={"tel:" + selectedOrder?.customer_phone}
                              className="mt-1 block text-sm font-bold text-orange-300"
                            >
                              {selectedOrder?.customer_phone}
                            </a>
                            <div className="mt-4 text-sm font-semibold leading-7 text-white/55">
                              {selectedOrder?.customer_address}
                            </div>
                            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                              <span className="text-sm font-bold text-white/45">
                                الإجمالي
                              </span>
                              <b className="text-2xl">
                                {formatMoney(Number(selectedOrder?.total || 0))} ج.م
                              </b>
                            </div>
                            {selectedOrder?.maps_link && (
                              <a
                                href={selectedOrder.maps_link}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 block rounded-2xl bg-white px-4 py-3 text-center text-xs font-black text-zinc-950"
                              >
                                فتح الموقع على الخريطة
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {tab === "products" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-black tracking-[0.18em] text-orange-600">
                    CATALOG / PRODUCTS
                  </div>
                  <h1 className="mt-2 text-3xl font-black">المنتجات</h1>
                  <p className="mt-1 text-sm font-bold text-zinc-400">
                    البيانات، السعر، المقاسات، المخزون والصور من هنا.
                  </p>
                </div>
                <button
                  onClick={() => startProduct()}
                  className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white"
                >
                  + منتج جديد
                </button>
              </div>

              {(editingProductId !== null || productForm.name_ar) && (
                <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black tracking-[0.18em] text-orange-700">
                        PRODUCT EDITOR
                      </div>
                      <h2 className="mt-1 text-xl font-black">
                        {editingProductId ? "تعديل المنتج" : "إضافة منتج"}
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        setEditingProductId(null);
                        setProductForm(emptyProductForm);
                      }}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-black"
                    >
                      إغلاق
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <input
                      value={productForm.name_ar}
                      onChange={(e) =>
                        setProductForm((v) => ({ ...v, name_ar: e.target.value }))
                      }
                      placeholder="اسم المنتج بالعربي"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4 outline-none"
                    />
                    <input
                      value={productForm.name_en}
                      onChange={(e) =>
                        setProductForm((v) => ({ ...v, name_en: e.target.value }))
                      }
                      placeholder="Product name"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4 outline-none"
                    />
                    <input
                      value={productForm.slug}
                      onChange={(e) =>
                        setProductForm((v) => ({ ...v, slug: e.target.value }))
                      }
                      placeholder="slug"
                      dir="ltr"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4 outline-none"
                    />
                    <select
                      value={productForm.category_id}
                      onChange={(e) =>
                        setProductForm((v) => ({ ...v, category_id: e.target.value }))
                      }
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4 font-bold outline-none"
                    >
                      <option value="">بدون قسم</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name_ar}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm((v) => ({ ...v, price: e.target.value }))
                      }
                      placeholder="السعر"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4 outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      value={productForm.compare_at_price}
                      onChange={(e) =>
                        setProductForm((v) => ({
                          ...v,
                          compare_at_price: e.target.value,
                        }))
                      }
                      placeholder="السعر قبل الخصم - اختياري"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4 outline-none"
                    />
                    <textarea
                      value={productForm.description_ar}
                      onChange={(e) =>
                        setProductForm((v) => ({
                          ...v,
                          description_ar: e.target.value,
                        }))
                      }
                      placeholder="الوصف بالعربي"
                      className="min-h-28 rounded-2xl border border-orange-100 bg-white p-4 outline-none md:col-span-2"
                    />
                    <textarea
                      value={productForm.description_en}
                      onChange={(e) =>
                        setProductForm((v) => ({
                          ...v,
                          description_en: e.target.value,
                        }))
                      }
                      placeholder="English description"
                      className="min-h-28 rounded-2xl border border-orange-100 bg-white p-4 outline-none md:col-span-2"
                    />
                  </div>

                  <button
                    onClick={() => void saveProduct()}
                    disabled={saving}
                    className="mt-4 rounded-2xl bg-orange-500 px-6 py-3 font-black text-white disabled:opacity-50"
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ المنتج"}
                  </button>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-2">
                {products.map((product) => {
                  const mainImage = images
                    .filter((image) => image.product_id === product.id)
                    .sort((a, b) => a.sort_order - b.sort_order)[0];

                  return (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="size-28 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                          {mainImage ? (
                            <img
                              src={mainImage.url}
                              alt={mainImage.alt_ar || product.name_ar}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-xs font-black text-orange-300">
                              بدون صورة
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[10px] font-black tracking-[0.15em] text-orange-600">
                                {categories.find((category) => category.id === product.category_id)?.name_en || "KIDSWEAR"}
                              </span>
                              <h2 className="mt-1 truncate text-lg font-black">
                                {product.name_ar}
                              </h2>
                              <div className="mt-1 truncate text-xs font-bold text-zinc-400">
                                {product.name_en}
                              </div>
                            </div>
                            <button
                              onClick={() => void runAction("toggle_product", { id: product.id })}
                              className={
                                "rounded-full px-3 py-2 text-[10px] font-black " +
                                (product.is_active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-500")
                              }
                            >
                              {product.is_active ? "نشط" : "مخفي"}
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div>
                              <b className="text-xl text-orange-600">
                                {formatMoney(Number(product.price))} ج.م
                              </b>
                              {product.compare_at_price && (
                                <del className="mr-2 text-xs font-bold text-zinc-300">
                                  {formatMoney(Number(product.compare_at_price))} ج.م
                                </del>
                              )}
                            </div>
                            <div className="text-xs font-bold text-zinc-400">
                              {variants.filter((variant) => variant.product_id === product.id).length} خيارات
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => startProduct(product)}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black hover:border-orange-200 hover:text-orange-600"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => setSelectedProductId(product.id)}
                              className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700"
                            >
                              إدارة الصور والـVariants
                            </button>
                          </div>
                        </div>
                      </div>

                      {selectedProductId === product.id && (
                        <div className="border-t border-zinc-100 bg-[#fffaf5] p-4">
                          <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
                            <div>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-black tracking-[0.15em] text-orange-600">
                                    IMAGES
                                  </div>
                                  <h3 className="mt-1 font-black">صور المنتج</h3>
                                </div>
                                <label className="cursor-pointer rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white">
                                  {uploading ? "جارٍ الرفع..." : "+ صور"}
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={(e) => void uploadImages(e.target.files)}
                                  />
                                </label>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {selectedImages.map((image, index) => (
                                  <div
                                    key={image.id}
                                    className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                                  >
                                    <img
                                      src={image.url}
                                      alt={image.alt_ar || selectedProduct?.name_ar || ""}
                                      className="aspect-square w-full object-cover"
                                    />
                                    <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
                                      <span className="rounded-lg bg-white/90 px-2 py-1 text-[9px] font-black">
                                        {index === 0 ? "رئيسية" : "#" + (index + 1)}
                                      </span>
                                      <button
                                        onClick={() =>
                                          void runAction("delete_image", {
                                            id: image.id,
                                          })
                                        }
                                        className="rounded-lg bg-white/90 px-2 py-1 text-[9px] font-black text-red-600"
                                      >
                                        حذف
                                      </button>
                                    </div>
                                    <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                                      <button
                                        disabled={index === 0}
                                        onClick={() => void moveImage(image, "up")}
                                        className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-black disabled:opacity-30"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        disabled={index === selectedImages.length - 1}
                                        onClick={() => void moveImage(image, "down")}
                                        className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-black disabled:opacity-30"
                                      >
                                        ↓
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {!selectedImages.length && (
                                <div className="mt-3 rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center text-xs font-bold text-zinc-400">
                                  ارفع أول صورة حقيقية للمنتج.
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-black tracking-[0.15em] text-orange-600">
                                    VARIANTS
                                  </div>
                                  <h3 className="mt-1 font-black">المقاسات والألوان</h3>
                                </div>
                                <button
                                  onClick={() => startVariant()}
                                  className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white"
                                >
                                  + Variant
                                </button>
                              </div>

                              <div className="mt-3 space-y-2">
                                {(editingVariantId !== null || variantForm.size || variantForm.color) && (
                                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <input
                                        value={variantForm.size}
                                        onChange={(e) =>
                                          setVariantForm((v) => ({ ...v, size: e.target.value }))
                                        }
                                        placeholder="المقاس"
                                        className="h-11 rounded-xl border border-orange-100 bg-white px-3 text-sm outline-none"
                                      />
                                      <input
                                        value={variantForm.color}
                                        onChange={(e) =>
                                          setVariantForm((v) => ({ ...v, color: e.target.value }))
                                        }
                                        placeholder="اللون"
                                        className="h-11 rounded-xl border border-orange-100 bg-white px-3 text-sm outline-none"
                                      />
                                      <input
                                        value={variantForm.sku}
                                        onChange={(e) =>
                                          setVariantForm((v) => ({ ...v, sku: e.target.value }))
                                        }
                                        placeholder="SKU"
                                        className="h-11 rounded-xl border border-orange-100 bg-white px-3 text-sm outline-none"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={variantForm.stock}
                                        onChange={(e) =>
                                          setVariantForm((v) => ({ ...v, stock: e.target.value }))
                                        }
                                        placeholder="المخزون"
                                        className="h-11 rounded-xl border border-orange-100 bg-white px-3 text-sm outline-none"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={variantForm.price_override}
                                        onChange={(e) =>
                                          setVariantForm((v) => ({
                                            ...v,
                                            price_override: e.target.value,
                                          }))
                                        }
                                        placeholder="سعر خاص اختياري"
                                        className="h-11 rounded-xl border border-orange-100 bg-white px-3 text-sm outline-none sm:col-span-2"
                                      />
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                      <button
                                        onClick={() => void saveVariant()}
                                        disabled={saving}
                                        className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                                      >
                                        {saving ? "جارٍ..." : "حفظ"}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingVariantId(null);
                                          setVariantForm(emptyVariantForm);
                                        }}
                                        className="rounded-xl bg-white px-4 py-2 text-xs font-black"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {selectedVariants.map((variant) => (
                                  <div
                                    key={variant.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
                                  >
                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-black">
                                        {variant.size || "بدون مقاس"}
                                      </span>
                                      <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-black">
                                        {variant.color || "بدون لون"}
                                      </span>
                                      <span
                                        className={
                                          "rounded-lg px-2 py-1 text-[10px] font-black " +
                                          (variant.stock <= 2
                                            ? "bg-red-50 text-red-600"
                                            : "bg-emerald-50 text-emerald-700")
                                        }
                                      >
                                        مخزون {variant.stock}
                                      </span>
                                      {variant.price_override != null && (
                                        <span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-700">
                                          {formatMoney(Number(variant.price_override))} ج.م
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => startVariant(variant)}
                                        className="rounded-lg bg-zinc-100 px-2 py-2 text-[10px] font-black"
                                      >
                                        تعديل
                                      </button>
                                      <button
                                        onClick={() =>
                                          void runAction("toggle_variant", {
                                            id: variant.id,
                                          })
                                        }
                                        className="rounded-lg bg-zinc-100 px-2 py-2 text-[10px] font-black"
                                      >
                                        {variant.is_active ? "نشط" : "مخفي"}
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {!selectedVariants.length && (
                                  <div className="rounded-2xl bg-white p-7 text-center text-xs font-bold text-zinc-400">
                                    أضف أول مقاس/لون للمنتج.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {tab === "categories" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-black tracking-[0.18em] text-orange-600">
                    CATALOG / CATEGORIES
                  </div>
                  <h1 className="mt-2 text-3xl font-black">الأقسام</h1>
                  <p className="mt-1 text-sm font-bold text-zinc-400">
                    أضف الأقسام وعدّل ترتيبها وحالة ظهورها في المتجر.
                  </p>
                </div>
                <button
                  onClick={() => startCategory()}
                  className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white"
                >
                  + قسم جديد
                </button>
              </div>

              {(editingCategoryId !== null || categoryForm.name_ar) && (
                <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={categoryForm.name_ar}
                      onChange={(e) =>
                        setCategoryForm((v) => ({ ...v, name_ar: e.target.value }))
                      }
                      placeholder="اسم القسم بالعربي"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4"
                    />
                    <input
                      value={categoryForm.name_en}
                      onChange={(e) =>
                        setCategoryForm((v) => ({ ...v, name_en: e.target.value }))
                      }
                      placeholder="Category name"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4"
                    />
                    <input
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm((v) => ({ ...v, slug: e.target.value }))
                      }
                      placeholder="slug"
                      dir="ltr"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4"
                    />
                    <input
                      value={categoryForm.image_url}
                      onChange={(e) =>
                        setCategoryForm((v) => ({ ...v, image_url: e.target.value }))
                      }
                      placeholder="رابط صورة اختياري"
                      dir="ltr"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4"
                    />
                    <input
                      type="number"
                      min="0"
                      value={categoryForm.sort_order}
                      onChange={(e) =>
                        setCategoryForm((v) => ({
                          ...v,
                          sort_order: e.target.value,
                        }))
                      }
                      placeholder="الترتيب"
                      className="h-12 rounded-2xl border border-orange-100 bg-white px-4"
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => void saveCategory()}
                      disabled={saving}
                      className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      {saving ? "جارٍ..." : "حفظ القسم"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm(emptyCategoryForm);
                      }}
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-black"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <article
                    key={category.id}
                    className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-orange-600">
                          #{category.sort_order}
                        </div>
                        <h2 className="mt-2 text-lg font-black">
                          {category.name_ar}
                        </h2>
                        <div className="mt-1 text-xs font-bold text-zinc-400">
                          {category.name_en}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          void runAction("toggle_category", { id: category.id })
                        }
                        className={
                          "rounded-full px-3 py-2 text-[10px] font-black " +
                          (category.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500")
                        }
                      >
                        {category.is_active ? "نشط" : "مخفي"}
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400">
                        /{category.slug}
                      </span>
                      <button
                        onClick={() => startCategory(category)}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black"
                      >
                        تعديل
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
