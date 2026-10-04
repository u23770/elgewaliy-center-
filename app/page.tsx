"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";
import {
  addCartItem,
  cartCount,
  cartTotal,
  removeCartItem,
  updateCartQuantity,
  type CartItem,
} from "@/lib/cart";
import { selectVariant, uniqueOptions, type VariantLike } from "@/lib/product-variants";

type Variant = VariantLike & {
  product_id: string;
};

type ProductWithVariants = Product & { product_variants?: Variant[] };

type ProductImage = { id: string; product_id: string; url: string; alt_ar: string | null; alt_en: string | null; sort_order: number };

type Choice = {
  size: string | null;
  color: string | null;
};

const fallbackProducts: Product[] = [
  {
    id: "1",
    name_ar: "تيشيرت أطفال قطن",
    name_en: "Kids Cotton T-Shirt",
    slug: "kids-cotton-tshirt",
    description_ar: "تيشيرت مريح مناسب للاستخدام اليومي",
    description_en: "Comfortable everyday cotton t-shirt",
    price: 249,
    compare_at_price: 299,
    category_id: null,
  },
  {
    id: "2",
    name_ar: "تريننج أولادي",
    name_en: "Boys Tracksuit",
    slug: "boys-tracksuit",
    description_ar: "تريننج عملي ومريح للأطفال",
    description_en: "Comfortable practical tracksuit",
    price: 499,
    compare_at_price: 599,
    category_id: null,
  },
  {
    id: "3",
    name_ar: "فستان بناتي",
    name_en: "Girls Dress",
    slug: "girls-dress",
    description_ar: "فستان أنيق للأطفال",
    description_en: "Cute everyday girls dress",
    price: 399,
    compare_at_price: 449,
    category_id: null,
  },
  {
    id: "4",
    name_ar: "طقم أطفال صيفي",
    name_en: "Kids Summer Set",
    slug: "kids-summer-set",
    description_ar: "طقم صيفي خفيف ومريح",
    description_en: "Lightweight summer set",
    price: 349,
    compare_at_price: 399,
    category_id: null,
  },
];

function Icon({
  name,
  size = 18,
}: {
  name: "user" | "bag" | "menu" | "close" | "search" | "arrow" | "plus" | "minus" | "trash" | "check";
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c.7-3 2.7-4.6 6.5-4.6s5.8 1.6 6.5 4.6" /></>,
    bag: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4 4" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    trash: <><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6 7l1 13h10l1-13" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function getChoice(product: Product, variants: Record<string, Variant[]>, choices: Record<string, Choice>) {
  const vs = variants[product.id] ?? [];
  const options = uniqueOptions(vs);
  const current = choices[product.id] ?? {
    size: options.sizes[0] ?? null,
    color: options.colors[0] ?? null,
  };

  return {
    variant: selectVariant(vs, current.size, current.color) ?? vs[0] ?? null,
    options,
    current,
  };
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<Record<string, Variant[]>>({});
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selected, setSelected] = useState<ProductWithVariants | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState("");
  const [addedKey, setAddedKey] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("elgewaliy-cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCart(Array.isArray(parsed) ? parsed : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("elgewaliy-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    (async () => {
      const [productsResult, categoriesResult, variantsResult, imagesResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("id,name_ar,name_en,slug")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("product_variants")
          .select("id,product_id,size,color,stock,price_override")
          .eq("is_active", true),
        supabase
          .from("product_images")
          .select("id,product_id,url,alt_ar,alt_en,sort_order")
          .order("sort_order"),
      ]);

      if (productsResult.data?.length) setProducts(productsResult.data as Product[]);
      if (categoriesResult.data?.length) setCategories(categoriesResult.data as Category[]);
      if (imagesResult.data) {
        const groupedImages: Record<string, ProductImage[]> = {};
        (imagesResult.data as ProductImage[]).forEach((image) => {
          if (!groupedImages[image.product_id]) groupedImages[image.product_id] = [];
          groupedImages[image.product_id].push(image);
        });
        setProductImages(groupedImages);
      }

      if (variantsResult.data) {
        const grouped: Record<string, Variant[]> = {};
        (variantsResult.data as Variant[]).forEach((item) => {
          if (!grouped[item.product_id]) grouped[item.product_id] = [];
          grouped[item.product_id].push(item);
        });
        setVariants(grouped);

        const initial: Record<string, Choice> = {};
        Object.entries(grouped).forEach(([productId, list]) => {
          const { sizes, colors } = uniqueOptions(list);
          initial[productId] = { size: sizes[0] ?? null, color: colors[0] ?? null };
        });
        setChoices(initial);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!addedKey) return;
    const timer = setTimeout(() => setAddedKey(""), 1100);
    return () => clearTimeout(timer);
  }, [addedKey]);

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (cat === "all" || product.category_id === cat) &&
          (product.name_ar.includes(q) || product.name_en.toLowerCase().includes(q.toLowerCase())),
      ),
    [products, q, cat],
  );

  const total = cartTotal(cart);
  const count = cartCount(cart);

  function openProduct(product: Product) {
    const vs = variants[product.id] ?? [];
    const options = uniqueOptions(vs);
    const current = choices[product.id] ?? {
      size: options.sizes[0] ?? null,
      color: options.colors[0] ?? null,
    };

    setSelected({
      ...product,
      product_variants: vs,
    });
    setSelectedSize(current.size);
    setSelectedColor(current.color);
    setQty(1);
  }

  function addProduct(
    product: Product,
    size: string | null,
    color: string | null,
    quantity = 1,
  ) {
    const vs = variants[product.id] ?? [];
    const variant = selectVariant(vs, size, color) ?? vs[0] ?? null;

    if (vs.length > 0 && !variant) {
      setToast("اختار المقاس واللون المناسب الأول");
      return;
    }

    if (variant && variant.stock <= 0) {
      setToast("الاختيار ده غير متاح حاليًا");
      return;
    }

    const price = Number(variant?.price_override ?? product.price);
    const key = product.id + "-" + (variant?.id ?? "base");
    const item: Omit<CartItem, "quantity"> = {
      key,
      productId: product.id,
      variantId: variant?.id,
      name_ar: product.name_ar,
      name_en: product.name_en,
      price,
      compare_at_price: product.compare_at_price,
      size: variant?.size ?? size,
      color: variant?.color ?? color,
    };

    setCart((current) => addCartItem(current, { ...item, quantity }));
    setAddedKey(key);
    setToast("اتضافت للسلة");
  }

  function addSelected() {
    if (!selected) return;
    addProduct(selected, selectedSize, selectedColor, qty);
    setSelected(null);
    setCartOpen(true);
  }

  return (
    <main className="store-shell" dir="rtl">
      <div className="announcement-bar">
        <span>تجربة أبسط لاختيار اللبس المناسب للأطفال</span>
        <a href="#products">اكتشف التشكيلة <Icon name="arrow" size={14} /></a>
      </div>

      <header className="site-header">
        <div className="nav-wrap">
          <a href="#" className="brand-lockup" onClick={() => setMobileMenu(false)}>
            <span className="brand-mark">ج</span>
            <span>
              <b>الجويلي</b>
              <small>ELGEWALIY</small>
            </span>
          </a>

          <nav className="main-nav">
            <a href="#products">المتجر</a>
            <a href="#about">ليه الجويلي؟</a>
            <a href="/track">تتبع الطلب</a>
          </nav>

          <div className="nav-actions">
            <a href="/auth" className="icon-action account-action" aria-label="حسابي">
              <Icon name="user" />
            </a>
            <button
              className={"icon-action cart-action" + (addedKey ? " cart-bump" : "")}
              onClick={() => setCartOpen(true)}
              aria-label="السلة"
            >
              <Icon name="bag" />
              {count > 0 && <span className="cart-badge">{count}</span>}
            </button>
            <button
              className="icon-action mobile-menu-button"
              aria-label="القائمة"
              onClick={() => setMobileMenu((open) => !open)}
            >
              <Icon name={mobileMenu ? "close" : "menu"} />
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="mobile-nav">
            <a href="#products" onClick={() => setMobileMenu(false)}>المتجر</a>
            <a href="#about" onClick={() => setMobileMenu(false)}>ليه الجويلي؟</a>
            <a href="/track">تتبع الطلب</a>
            <a href="/auth">تسجيل الدخول / حسابي</a>
          </div>
        )}
      </header>

      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow">KIDSWEAR / NEW SEASON</span>
            <h1>لبس يليق<br /><em>بكل لحظة.</em></h1>
            <p>
              اختار القطعة، حدد المقاس واللون، وشوف طلبك بوضوح قبل ما تكمل.
              تجربة خفيفة وسريعة معمولة للبيت والموبايل.
            </p>

            <div className="hero-actions">
              <a href="#products" className="primary-cta">ابدأ التسوق <Icon name="arrow" /></a>
              <a href="/auth" className="secondary-cta">حسابي</a>
            </div>

            <div className="hero-microcopy">
              <span><b>01</b> مقاسات وألوان</span>
              <span><b>02</b> سلة واضحة</span>
              <span><b>03</b> متابعة للطلب</span>
            </div>
          </div>

          <div className="hero-art reveal" style={{ animationDelay: ".12s" }}>
            <div className="hero-art-top">
              <span>ELGEWALIY</span>
              <span>06 — 26</span>
            </div>

            <div className="hero-poster">
              <div className="poster-shape poster-shape-back" />
              <div className="poster-shape poster-shape-main">
                <div className="poster-collar" />
                <div className="poster-label">PLAY / MOVE / GROW</div>
              </div>
              <span className="floating-note note-one">مريح طول اليوم</span>
              <span className="floating-note note-two">اختار مقاسك</span>
            </div>

            <div className="hero-art-bottom">
              <span>Kidswear essentials</span>
              <span className="hero-scroll-dot" />
              <span>01 / 04</span>
            </div>
          </div>
        </div>
      </section>

      <section className="benefits-strip" aria-label="مميزات المتجر">
        <div><span>01</span><b>اختيار واضح</b><small>المقاس واللون قبل الإضافة</small></div>
        <div><span>02</span><b>حسابك محفوظ</b><small>طلباتك في مكان واحد</small></div>
        <div><span>03</span><b>تجربة موبايل</b><small>سريعة وسلسة من أول نقرة</small></div>
      </section>

      <section id="products" className="catalog-section">
        <div className="section-head">
          <div>
            <span className="section-kicker">SHOP / 01</span>
            <h2>اختار القطعة</h2>
            <p>حدد المقاس واللون مباشرة من الكارت أو افتح العرض الكامل.</p>
          </div>

          <div className="search-box">
            <Icon name="search" size={17} />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ابحث عن منتج..." />
            {q && <button aria-label="مسح البحث" onClick={() => setQ("")}><Icon name="close" size={15} /></button>}
          </div>
        </div>

        <div className="category-row">
          {["all", ...categories.map((category) => category.id)].map((id) => (
            <button
              key={id}
              onClick={() => setCat(id)}
              className={"category-pill" + (cat === id ? " active" : "")}
            >
              {id === "all" ? "الكل" : categories.find((category) => category.id === id)?.name_ar}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filtered.map((product, index) => {
            const state = getChoice(product, variants, choices);
            const key = product.id + "-" + (state.variant?.id ?? "base");

            return (
              <article
                key={product.id}
                className="product-card reveal"
                style={{ animationDelay: index * 0.055 + "s" }}
                onClick={() => openProduct(product)}
              >
                <div className="product-media">
                  <div className="media-meta">
                    <span className="new-chip">NEW</span>
                    {state.variant?.stock !== undefined && state.variant.stock <= 2 && state.variant.stock > 0 && (
                      <span className="stock-chip">آخر قطع</span>
                    )}
                  </div>

                  <div className="product-stage">
                    {productImages[product.id]?.[0] ? (
                      <img className="product-real-image" src={productImages[product.id][0].url} alt={productImages[product.id][0].alt_ar || product.name_ar} loading="lazy" />
                    ) : null}
                    <div className={productImages[product.id]?.[0] ? "hanger image-hanger" : "hanger"} />
                    <div className="product-shape">
                      <span className="shirt-neck" />
                      <span className="shirt-seam" />
                    </div>
                    <span className="visual-copy">ELGEWALIY</span>
                  </div>

                  <button
                    className="quick-view-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openProduct(product);
                    }}
                  >
                    عرض التفاصيل <Icon name="arrow" size={14} />
                  </button>
                </div>

                <div className="product-content">
                  <div className="product-heading">
                    <div>
                      <span className="product-type">KIDSWEAR</span>
                      <h3>{product.name_ar}</h3>
                    </div>
                    <button
                      className={"mini-add" + (addedKey === key ? " is-added" : "")}
                      onClick={(event) => {
                        event.stopPropagation();
                        addProduct(product, state.current.size, state.current.color);
                      }}
                    >
                      {addedKey === key ? <Icon name="check" size={17} /> : <Icon name="plus" size={17} />}
                    </button>
                  </div>

                  <p>{product.description_ar}</p>

                  <div className="price-row">
                    <strong>{Number(state.variant?.price_override ?? product.price)} <small>ج.م</small></strong>
                    {product.compare_at_price && <del>{product.compare_at_price} ج.م</del>}
                  </div>

                  {state.options.sizes.length > 0 && (
                    <div className="selector-line">
                      <span>المقاس</span>
                      <div className="selector-options">
                        {state.options.sizes.slice(0, 4).map((size) => (
                          <button
                            key={size}
                            onClick={(event) => {
                              event.stopPropagation();
                              setChoices((current) => ({
                                ...current,
                                [product.id]: { ...state.current, size },
                              }));
                            }}
                            className={state.current.size === size ? "size-chip active" : "size-chip"}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {state.options.colors.length > 0 && (
                    <div className="selector-line color-line">
                      <span>اللون</span>
                      <div className="color-options">
                        {state.options.colors.slice(0, 4).map((color) => (
                          <button
                            key={color}
                            title={color}
                            aria-label={color}
                            onClick={(event) => {
                              event.stopPropagation();
                              setChoices((current) => ({
                                ...current,
                                [product.id]: { ...state.current, color },
                              }));
                            }}
                            className={state.current.color === color ? "color-dot active" : "color-dot"}
                          >
                            <i />
                          </button>
                        ))}
                        <span className="color-label">{state.current.color}</span>
                      </div>
                    </div>
                  )}

                  <button
                    className={"card-add-cta" + (addedKey === key ? " is-added" : "")}
                    onClick={(event) => {
                      event.stopPropagation();
                      addProduct(product, state.current.size, state.current.color);
                    }}
                  >
                    {addedKey === key ? "اتضافت للسلة" : "أضف للسلة"}
                    <Icon name={addedKey === key ? "check" : "arrow"} size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="empty-results">
            <span>⌕</span>
            <h3>مفيش نتائج بالمواصفات دي</h3>
            <p>جرّب كلمة بحث مختلفة أو ارجع للتصنيف كله.</p>
            <button onClick={() => { setQ(""); setCat("all"); }}>عرض كل المنتجات</button>
          </div>
        )}
      </section>

      <section id="about" className="brand-section">
        <div className="brand-panel">
          <div className="brand-copy">
            <span className="section-kicker light">WHY ELGEWALIY / 02</span>
            <h2>التفاصيل الصغيرة<br />هي اللي بتفرق.</h2>
            <p>
              من اختيار المنتج للمقاس واللون، لحد السلة والحساب، كل خطوة هنا هدفها
              تقلل الحيرة وتخلي تجربة الشراء مريحة.
            </p>
            <a href="/auth" className="brand-link">ادخل حسابك <Icon name="arrow" size={15} /></a>
          </div>

          <div className="brand-features">
            {[
              ["01", "المقاس في نفس الكارت", "مش محتاج تفتح صفحة ثانية عشان تختار الأساسيات."],
              ["02", "السلة مش مجرد رقم", "تشوف القطع والاختيارات والكميات في drawer واضح."],
              ["03", "حسابك معاك", "سجل دخولك وراجع بياناتك وطلباتك من مكان واحد."],
            ].map(([number, title, description]) => (
              <div className="feature-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <span className="footer-mark">ج</span>
          <div>
            <b>الجويلي</b>
            <small>Kidswear essentials</small>
          </div>
        </div>
        <span>© {new Date().getFullYear()} Elgewaliy</span>
      </footer>

      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <span className="section-kicker">YOUR BAG</span>
                <h2>السلة <small>{count} قطعة</small></h2>
              </div>
              <button className="close-button" onClick={() => setCartOpen(false)} aria-label="إغلاق">
                <Icon name="close" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="empty-bag"><Icon name="bag" size={28} /></div>
                <h3>السلة لسه فاضية</h3>
                <p>اختار قطعة والمقاس واللون، وهتظهر هنا بشكل مرتب.</p>
                <button onClick={() => setCartOpen(false)}>ارجع للمتجر</button>
              </div>
            ) : (
              <>
                <div className="cart-list">
                  {cart.map((item) => (
                    <div className="cart-row" key={item.key}>
                      <div className="cart-thumb">
                        <div className="mini-shirt" />
                      </div>

                      <div className="cart-info">
                        <span>{item.name_ar}</span>
                        <small>
                          {item.size ? "المقاس " + item.size : ""}
                          {item.size && item.color ? " • " : ""}
                          {item.color ?? ""}
                        </small>
                        <strong>{item.price} ج.م</strong>
                      </div>

                      <div className="quantity-control">
                        <button
                          onClick={() => setCart((current) => updateCartQuantity(current, item.key, item.quantity - 1))}
                          aria-label="إنقاص الكمية"
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => setCart((current) => updateCartQuantity(current, item.key, item.quantity + 1))}
                          aria-label="زيادة الكمية"
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>

                      <button
                        className="remove-button"
                        onClick={() => setCart((current) => removeCartItem(current, item.key))}
                        aria-label="حذف المنتج"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="drawer-summary">
                  <div className="summary-line"><span>الإجمالي</span><strong>{total} ج.م</strong></div>
                  <a href="/checkout" className="checkout-button">إتمام الطلب <Icon name="arrow" /></a>
                  <small>راجع المقاس واللون قبل تأكيد الطلب.</small>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {selected && (
        <div className="overlay modal-overlay" onClick={() => setSelected(null)}>
          <section className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="إغلاق">
              <Icon name="close" />
            </button>

            <div className="modal-visual">
              <span className="modal-sup">ELGEWALIY / 2026</span>
              <div className="product-shape large">
                <span className="shirt-neck" />
                <span className="shirt-seam" />
              </div>
              <span className="modal-vertical">KIDSWEAR ESSENTIALS</span>
            </div>

            <div className="modal-content">
              <span className="product-type">PRODUCT / DETAILS</span>
              <h2>{selected.name_ar}</h2>
              <p>{selected.description_ar}</p>

              {(() => {
                const options = uniqueOptions(selected.product_variants ?? []);
                const selectedVariant =
                  selectVariant(selected.product_variants ?? [], selectedSize, selectedColor) ??
                  selected.product_variants?.[0] ??
                  null;

                return (
                  <>
                    <div className="modal-price">
                      {Number(selectedVariant?.price_override ?? selected.price)} <small>ج.م</small>
                    </div>

                    {options.sizes.length > 0 && (
                      <div className="modal-selector">
                        <div><b>المقاس</b><span>{selectedSize}</span></div>
                        <div className="modal-options">
                          {options.sizes.map((size) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSize(size)}
                              className={selectedSize === size ? "size-chip active" : "size-chip"}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {options.colors.length > 0 && (
                      <div className="modal-selector">
                        <div><b>اللون</b><span>{selectedColor}</span></div>
                        <div className="modal-colors">
                          {options.colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={selectedColor === color ? "color-pill active" : "color-pill"}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedVariant?.stock !== undefined && (
                      <div className="availability">
                        <span className={selectedVariant.stock > 0 ? "available-dot" : "unavailable-dot"} />
                        {selectedVariant.stock > 0 ? "متاح دلوقتي" : "غير متاح حاليًا"}
                      </div>
                    )}

                    <div className="modal-bottom">
                      <div className="quantity-control big">
                        <button onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" /></button>
                        <span>{qty}</span>
                        <button onClick={() => setQty(qty + 1)}><Icon name="plus" /></button>
                      </div>
                      <button className="modal-add" onClick={addSelected}>
                        أضف للسلة <Icon name="arrow" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span className="toast-check"><Icon name="check" size={15} /></span>
          <div>
            <b>{toast}</b>
            <small>تم تحديث السلة</small>
          </div>
          <button onClick={() => setCartOpen(true)}>عرض السلة</button>
        </div>
      )}

      {count > 0 && !cartOpen && (
        <button className="mobile-cart-bar" onClick={() => setCartOpen(true)}>
          <span><Icon name="bag" size={17} /> {count} قطعة</span>
          <strong>{total} ج.م</strong>
          <i><Icon name="arrow" size={16} /></i>
        </button>
      )}
    </main>
  );
}
