"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";
import { addCartItem, cartCount, cartTotal, removeCartItem, updateCartQuantity, type CartItem } from "@/lib/cart";
import { selectVariant, uniqueOptions, type VariantLike } from "@/lib/product-variants";
import { getProductImage } from "@/lib/product-media";
import { filterProducts, getVariantPrice } from "@/lib/storefront";

type Variant = VariantLike & { product_id: string };
type ProductImage = { id: string; product_id: string; url: string; alt_ar: string | null; alt_en: string | null; sort_order: number };

const fallbackProducts: Product[] = [
  { id: "demo-1", name_ar: "تيشيرت قطن أساسي", name_en: "Essential Cotton T-Shirt", slug: "essential-cotton-tshirt", description_ar: "خامة مريحة للاستخدام اليومي.", description_en: "Soft everyday cotton tee.", price: 249, compare_at_price: 299, category_id: null },
  { id: "demo-2", name_ar: "تريننج أطفال", name_en: "Kids Tracksuit", slug: "kids-tracksuit", description_ar: "طقم عملي للحركة والخروجات.", description_en: "An easy everyday set.", price: 499, compare_at_price: 599, category_id: null },
  { id: "demo-3", name_ar: "فستان بناتي", name_en: "Girls Dress", slug: "girls-dress", description_ar: "تصميم خفيف للمناسبات واللبس اليومي.", description_en: "A light dress for everyday moments.", price: 399, compare_at_price: 449, category_id: null },
  { id: "demo-4", name_ar: "طقم صيفي", name_en: "Summer Set", slug: "summer-set", description_ar: "قطعتان بتنسيق سهل ومريح.", description_en: "A light two-piece outfit.", price: 349, compare_at_price: 399, category_id: null },
];

function Icon({ name, size = 18 }: { name: "user" | "bag" | "menu" | "close" | "search" | "arrow" | "plus" | "minus" | "check" | "spark" | "truck" | "shield"; size?: number }) {
  const paths: Record<string, ReactNode> = {
    user: <><circle cx="12" cy="8" r="3" /><path d="M5.5 19c.8-3.1 2.8-4.7 6.5-4.7s5.7 1.6 6.5 4.7" /></>,
    bag: <><path d="M6 8.5h12l1 11.5H5L6 8.5Z" /><path d="M9 8.5V6a3 3 0 0 1 6 0v2.5" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    search: <><circle cx="10.7" cy="10.7" r="6.1" /><path d="m15.5 15.5 4.4 4.4" /></>,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    truck: <><path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.7-3 8.2-7 10-4-1.8-7-5.3-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function money(n: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n) + " ج.م";
}

function firstAvailable(variants: Variant[]) {
  return variants.find((v) => v.stock > 0) ?? variants[0] ?? null;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<Record<string, Variant[]>>({});
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState("");
  const [added, setAdded] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("elgewaliy-cart");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setCart(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("elgewaliy-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [p, c, v, m] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("id,name_ar,name_en,slug").eq("is_active", true).order("sort_order"),
        supabase.from("product_variants").select("id,product_id,size,color,stock,price_override").eq("is_active", true),
        supabase.from("product_images").select("id,product_id,url,alt_ar,alt_en,sort_order").order("sort_order"),
      ]);
      if (!active) return;
      if (p.data?.length) setProducts(p.data as Product[]);
      if (c.data) setCategories(c.data as Category[]);
      if (v.data) {
        const grouped: Record<string, Variant[]> = {};
        for (const row of v.data as Variant[]) (grouped[row.product_id] ??= []).push(row);
        setVariants(grouped);
      }
      if (m.data) {
        const grouped: Record<string, ProductImage[]> = {};
        for (const row of m.data as ProductImage[]) (grouped[row.product_id] ??= []).push(row);
        setImages(grouped);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleProducts = useMemo(() => filterProducts(products, category, query), [products, category, query]);
  const total = cartTotal(cart);
  const count = cartCount(cart);
  const hero = products[0] ?? fallbackProducts[0];
  const heroImage = getProductImage(hero.slug, images[hero.id] ?? []);

  function openProduct(product: Product) {
    const list = variants[product.id] ?? [];
    const picked = firstAvailable(list);
    setSelected(product);
    setSize(picked?.size ?? null);
    setColor(picked?.color ?? null);
    setQty(1);
  }

  function add(product: Product, chosenSize: string | null, chosenColor: string | null, quantity = 1) {
    const list = variants[product.id] ?? [];
    const variant = selectVariant(list, chosenSize, chosenColor);
    if (list.length && !variant) { setToast("اختار مقاس ولون متاحين"); return false; }
    if (variant && variant.stock < quantity) { setToast("الكمية المطلوبة مش متاحة"); return false; }

    const item: CartItem = {
      key: product.id + "-" + (variant?.id ?? "base"),
      productId: product.id,
      variantId: variant?.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      price: getVariantPrice(product.price, variant),
      compare_at_price: product.compare_at_price,
      size: variant?.size ?? chosenSize,
      color: variant?.color ?? chosenColor,
      quantity,
    };

    setCart((current) => addCartItem(current, item));
    setAdded(item.key);
    setToast("اتضافت للسلة");
    window.setTimeout(() => setAdded(""), 900);
    return true;
  }

  function addSelected() {
    if (!selected) return;
    if (add(selected, size, color, qty)) {
      setSelected(null);
      setCartOpen(true);
    }
  }

  const selectedVariant = selected ? selectVariant(variants[selected.id] ?? [], size, color) : null;
  const selectedOptions = selected ? uniqueOptions(variants[selected.id] ?? []) : { sizes: [], colors: [] };

  return (
    <main className="storefront" dir="rtl">
      <div className="announcement"><span>الجويلي أونلاين — اختار القطعة والمقاس واللون من مكان واحد.</span><a href="#catalog">شوف التشكيلة <Icon name="arrow" size={14} /></a></div>

      <header className="site-header">
        <div className="nav-shell">
          <a href="#" className="brand" onClick={() => setMobileOpen(false)}><span className="brand-mark">ج</span><span><strong>الجويلي</strong><small>ELGEWALIY FASHION CENTER</small></span></a>
          <nav className="desktop-nav"><a href="#catalog">التشكيلة</a><a href="#experience">تجربة الشراء</a><a href="/track">تتبع الطلب</a></nav>
          <div className="nav-actions"><a className="icon-button account" href="/auth" aria-label="حسابي"><Icon name="user" /></a><button className={"icon-button cart " + (added ? "bump" : "")} onClick={() => setCartOpen(true)} aria-label="السلة"><Icon name="bag" />{count ? <span className="cart-badge">{count}</span> : null}</button><button className="icon-button menu-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="القائمة"><Icon name={mobileOpen ? "close" : "menu"} /></button></div>
        </div>
        {mobileOpen && <div className="mobile-nav"><a href="#catalog" onClick={() => setMobileOpen(false)}>التشكيلة</a><a href="#experience" onClick={() => setMobileOpen(false)}>تجربة الشراء</a><a href="/track">تتبع الطلب</a><a href="/auth">حسابي</a></div>}
      </header>

      <section className="hero">
        <div className="hero-glow one" /><div className="hero-glow two" />
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Icon name="spark" size={13} /> موسم جديد / New Season</span>
            <h1>لبس على<br /><em>مزاجه.</em></h1>
            <p>تصفح التشكيلة، افتح القطعة، اختار المقاس واللون، وبعدها كمل طلبك في خطوات بسيطة مع متابعة للطلب.</p>
            <div className="hero-actions"><a className="primary" href="#catalog">ابدأ التسوق <Icon name="arrow" /></a><a className="secondary" href="/auth">حسابي</a></div>
            <div className="hero-notes"><span><b>01</b> خيارات واضحة</span><span><b>02</b> سلة محفوظة</span><span><b>03</b> تتبع للطلب</span></div>
          </div>

          <div className="hero-card">
            <div className="hero-card-top"><span>ELGEWALIY</span><span>FASHION / 2026</span></div>
            <div className="hero-image">
              {heroImage ? <img src={heroImage} alt={hero.name_ar} /> : <div className="placeholder"><strong>الجويلي</strong><small>صور المنتج تظهر هنا</small></div>}
              <div className="hero-image-overlay" />
              <div className="hero-caption"><span>NEW DROP</span><strong>قطع مختارة للصغار.</strong></div>
              <i className="float-tag left">اختيار سريع</i><i className="float-tag right">صور حقيقية</i>
            </div>
            <div className="hero-card-bottom"><span>Kidswear essentials</span><i /><span>01 / 04</span></div>
          </div>
        </div>
      </section>

      <section className="trust">
        <div><b>01</b><strong>اختيار واضح</strong><small>المقاس واللون قبل الإضافة</small></div>
        <div><b>02</b><strong>السلة محفوظة</strong><small>ترجع تكمل من نفس الجهاز</small></div>
        <div><b>03</b><strong>متابعة مستمرة</strong><small>حدّث حالة طلبك أول بأول</small></div>
      </section>

      <section id="catalog" className="catalog">
        <div className="section-head">
          <div><span className="label">SHOP / 01</span><h2>التشكيلة</h2><p>اختار قسم، ابحث باسم القطعة، أو افتح العرض السريع.</p></div>
          <label className="search"><Icon name="search" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قطعة..." />{query && <button onClick={() => setQuery("")} aria-label="مسح"><Icon name="close" size={14} /></button>}</label>
        </div>

        <div className="categories"><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>الكل</button>{categories.map((c) => <button key={c.id} className={category === c.id ? "active" : ""} onClick={() => setCategory(c.id)}>{c.name_ar}</button>)}</div>

        {visibleProducts.length ? <div className="product-grid">
          {visibleProducts.map((product, index) => {
            const list = variants[product.id] ?? [];
            const picked = firstAvailable(list);
            const image = getProductImage(product.slug, images[product.id] ?? []);
            const key = product.id + "-" + (picked?.id ?? "base");
            return <article key={product.id} className="product-card" style={{ animationDelay: String(index * 40) + "ms" }} onClick={() => openProduct(product)}>
              <div className="media"><div className="badges"><span>NEW</span>{picked && picked.stock > 0 && picked.stock <= 2 ? <em>آخر قطع</em> : null}</div>{image ? <img src={image} alt={images[product.id]?.[0]?.alt_ar || product.name_ar} loading="lazy" decoding="async" /> : <div className="placeholder"><strong>الجويلي</strong><small>صورة المنتج</small></div>}<button className="quick" onClick={(e) => { e.stopPropagation(); openProduct(product); }}>عرض سريع <Icon name="arrow" size={13} /></button></div>
              <div className="card-body"><div className="card-meta"><span>ELGEWALIY</span><small>{product.name_en}</small></div><h3>{product.name_ar}</h3><p>{product.description_ar || "قطعة مختارة من تشكيلة الجويلي."}</p><div className="price"><strong>{money(getVariantPrice(product.price, picked))}</strong>{product.compare_at_price ? <del>{money(Number(product.compare_at_price))}</del> : null}</div><div className="card-footer"><span>{picked ? (picked.stock > 0 ? "متوفر" : "غير متوفر") : "اختار الخيارات"}</span><button className={added === key ? "added" : ""} onClick={(e) => { e.stopPropagation(); add(product, picked?.size ?? null, picked?.color ?? null); }} aria-label="إضافة للسلة"><Icon name={added === key ? "check" : "plus"} size={16} /></button></div></div>
            </article>;
          })}
        </div> : <div className="empty"><Icon name="search" size={30} /><h3>مش لاقيين القطعة دي</h3><p>جرّب بحث تاني أو ارجع لكل التشكيلة.</p><button onClick={() => { setQuery(""); setCategory("all"); }}>رجوع للتشكيلة</button></div>}
      </section>

      <section id="experience" className="experience">
        <div className="experience-panel">
          <div><span className="label light">ELGEWALIY / 02</span><h2>شراء أبسط،<br />من غير زحمة.</h2><p>تجربة مرتبة من صفحة المنتج للسلة ثم تأكيد الطلب والتتبع، ومصممة لبيع الملابس بمقاسات وألوان حقيقية.</p><a href="#catalog">ارجع للتشكيلة <Icon name="arrow" size={14} /></a></div>
          <div className="experience-grid">
            <article><Icon name="spark" size={20} /><strong>خيارات القطعة</strong><small>اختيار المقاس واللون قبل الإضافة.</small></article>
            <article><Icon name="bag" size={20} /><strong>سلة جانبية</strong><small>تعديل الكميات والإجمالي فورًا.</small></article>
            <article><Icon name="truck" size={20} /><strong>Checkout مرتب</strong><small>بيانات الاستلام وطريقة الدفع في خطوات.</small></article>
            <article><Icon name="shield" size={20} /><strong>تتبع الطلب</strong><small>رقم طلب ورمز خاص لكل عملية شراء.</small></article>
          </div>
        </div>
      </section>

      <footer className="footer"><div><strong>الجويلي</strong><span>ELGEWALIY FASHION CENTER</span></div><p>تجربة التسوق الإلكترونية — 2026</p><nav><a href="/auth">حسابي</a><a href="/track">تتبع</a><a href="#catalog">التشكيلة</a></nav></footer>

      {selected && <div className="modal" role="dialog" aria-modal="true" aria-label="تفاصيل المنتج">
        <button className="modal-backdrop" onClick={() => setSelected(null)} aria-label="إغلاق" />
        <div className="modal-card">
          <button className="modal-close" onClick={() => setSelected(null)} aria-label="إغلاق"><Icon name="close" /></button>
          <div className="modal-media">{getProductImage(selected.slug, images[selected.id] ?? []) ? <img src={getProductImage(selected.slug, images[selected.id] ?? [])!} alt={selected.name_ar} /> : <div className="placeholder"><strong>الجويلي</strong></div>}</div>
          <div className="modal-content">
            <span className="label">PRODUCT / DETAIL</span><h2>{selected.name_ar}</h2><p className="en">{selected.name_en}</p><strong className="modal-price">{money(getVariantPrice(selected.price, selectedVariant))}</strong><p className="description">{selected.description_ar || "قطعة مختارة من تشكيلة الجويلي."}</p>
            {selectedOptions.sizes.length > 0 && <div className="choice"><div><strong>المقاس</strong><span>{size || "اختار"}</span></div><div className="choice-row">{uniqueOptions(variants[selected.id] ?? []).sizes.map((s) => { const ok = (variants[selected.id] ?? []).some(v => v.size === s && (color == null || v.color === color) && v.stock > 0); return <button key={s} disabled={!ok} className={size === s ? "selected" : ""} onClick={() => ok && setSize(s)}>{s}</button>; })}</div></div>}
            {selectedOptions.colors.length > 0 && <div className="choice"><div><strong>اللون</strong><span>{color || "اختار"}</span></div><div className="choice-row">{uniqueOptions(variants[selected.id] ?? []).colors.map((c) => { const ok = (variants[selected.id] ?? []).some(v => v.color === c && (size == null || v.size === size) && v.stock > 0); return <button key={c} disabled={!ok} className={color === c ? "selected" : ""} onClick={() => ok && setColor(c)}>{c}</button>; })}</div></div>}
            <div className="qty"><button onClick={() => setQty(v => Math.max(1, v - 1))}><Icon name="minus" size={15} /></button><strong>{qty}</strong><button disabled={!!selectedVariant && qty >= selectedVariant.stock} onClick={() => setQty(v => v + 1)}><Icon name="plus" size={15} /></button></div>
            <button className="modal-add" disabled={(variants[selected.id] ?? []).length > 0 && (!selectedVariant || selectedVariant.stock < 1)} onClick={addSelected}>أضف للسلة <Icon name="bag" size={16} /></button>
            <a className="modal-link" href={"/product/" + selected.slug}>فتح صفحة المنتج الكاملة <Icon name="arrow" size={13} /></a>
          </div>
        </div>
      </div>}

      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-hidden={!cartOpen}>
        <button className="drawer-backdrop" onClick={() => setCartOpen(false)} aria-label="إغلاق" />
        <div className="drawer">
          <div className="drawer-head"><div><span>YOUR BAG / 03</span><h2>السلة</h2></div><button onClick={() => setCartOpen(false)} aria-label="إغلاق"><Icon name="close" /></button></div>
          <div className="drawer-list">{cart.length ? cart.map((item) => <div className="cart-item" key={item.key}><div><strong>{item.name_ar}</strong><small>{[item.size ? "المقاس: " + item.size : "", item.color ? "اللون: " + item.color : ""].filter(Boolean).join(" • ")}</small><b>{money(item.price)}</b></div><div className="cart-controls"><button onClick={() => setCart(c => updateCartQuantity(c, item.key, item.quantity - 1))}><Icon name="minus" size={12} /></button><span>{item.quantity}</span><button onClick={() => setCart(c => updateCartQuantity(c, item.key, item.quantity + 1))}><Icon name="plus" size={12} /></button><button className="remove" onClick={() => setCart(c => removeCartItem(c, item.key))}><Icon name="close" size={12} /></button></div></div>) : <div className="drawer-empty"><Icon name="bag" size={38} /><h3>السلة فاضية</h3><p>اختار منتجات من التشكيلة وهتظهر هنا.</p><button onClick={() => { setCartOpen(false); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }}>ابدأ التسوق</button></div>}</div>
          {cart.length > 0 && <div className="drawer-bottom"><div><span>الإجمالي</span><strong>{money(total)}</strong></div><a href="/checkout" onClick={() => setCartOpen(false)}>إتمام الطلب <Icon name="arrow" size={15} /></a></div>}
        </div>
      </aside>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
