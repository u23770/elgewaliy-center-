"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";
import { addCartItem, cartCount, cartTotal, removeCartItem, updateCartQuantity, type CartItem } from "@/lib/cart";

type Variant = { id:string; product_id:string; size:string|null; color:string|null; stock:number; price_override:number|null };
type ProductWithVariants = Product & { product_variants?: Variant[] };

const fallbackProducts:Product[]=[
{id:"1",name_ar:"تيشيرت أطفال قطن",name_en:"Kids Cotton T-Shirt",slug:"kids-cotton-tshirt",description_ar:"تيشيرت مريح مناسب للاستخدام اليومي",description_en:"Comfortable everyday cotton t-shirt",price:249,compare_at_price:299,category_id:null},
{id:"2",name_ar:"تريننج أولادي",name_en:"Boys Tracksuit",slug:"boys-tracksuit",description_ar:"تريننج عملي ومريح للأطفال",description_en:"Comfortable practical tracksuit",price:499,compare_at_price:599,category_id:null},
{id:"3",name_ar:"فستان بناتي",name_en:"Girls Dress",slug:"girls-dress",description_ar:"فستان أنيق للأطفال",description_en:"Cute everyday girls dress",price:399,compare_at_price:449,category_id:null},
{id:"4",name_ar:"طقم أطفال صيفي",name_en:"Kids Summer Set",slug:"kids-summer-set",description_ar:"طقم صيفي خفيف ومريح",description_en:"Lightweight summer set",price:349,compare_at_price:399,category_id:null}
];

const Icon=({children}:{children:React.ReactNode})=><span className="inline-flex">{children}</span>;

export default function Home(){
 const [products,setProducts]=useState<Product[]>(fallbackProducts);
 const [categories,setCategories]=useState<Category[]>([]);
 const [variants,setVariants]=useState<Record<string,Variant[]>>({});
 const [q,setQ]=useState("");
 const [cat,setCat]=useState("all");
 const [cart,setCart]=useState<CartItem[]>([]);
 const [cartOpen,setCartOpen]=useState(false);
 const [selected,setSelected]=useState<ProductWithVariants|null>(null);
 const [selectedSize,setSelectedSize]=useState<string|null>(null);
 const [selectedColor,setSelectedColor]=useState<string|null>(null);
 const [qty,setQty]=useState(1);
 const [toast,setToast]=useState("");

 useEffect(()=>{try{const saved=localStorage.getItem("elgewaliy-cart");if(saved){const parsed=JSON.parse(saved);setCart(Array.isArray(parsed)?parsed:[])}}catch{}},[]);
 useEffect(()=>{localStorage.setItem("elgewaliy-cart",JSON.stringify(cart))},[cart]);
 useEffect(()=>{(async()=>{const results=await Promise.all([
   supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false}),
   supabase.from("categories").select("id,name_ar,name_en,slug").eq("is_active",true).order("sort_order"),
   supabase.from("product_variants").select("id,product_id,size,color,stock,price_override").eq("is_active",true)
 ]);const p=results[0].data,c=results[1].data,v=results[2].data;if(p?.length)setProducts(p as Product[]);if(c?.length)setCategories(c as Category[]);if(v){const grouped:Record<string,Variant[]>={};(v as Variant[]).forEach(item=>{if(!grouped[item.product_id])grouped[item.product_id]=[];grouped[item.product_id].push(item)});setVariants(grouped)}})()},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2400);return()=>clearTimeout(t)},[toast]);

 const filtered=useMemo(()=>products.filter(p=>(cat==="all"||p.category_id===cat)&&(p.name_ar.includes(q)||p.name_en.toLowerCase().includes(q.toLowerCase()))),[products,q,cat]);
 const total=cartTotal(cart), count=cartCount(cart);

 function openProduct(p:Product){const vs=variants[p.id]??[];setSelected({...p,product_variants:vs});setSelectedSize(vs[0]?.size??null);setSelectedColor(vs[0]?.color??null);setQty(1)}
 function addSelected(){
   if(!selected)return;
   const vs=selected.product_variants??[];
   const variant=vs.find(v=>(!selectedSize||v.size===selectedSize)&&(!selectedColor||v.color===selectedColor))??vs[0];
   if(vs.length&&!variant){setToast("اختار المقاس واللون الأول");return}
   if(variant&&variant.stock<=0){setToast("المقاس ده غير متاح حاليًا");return}
   const price=Number(variant?.price_override??selected.price);
   const item={key:selected.id+"-"+(variant?.id??"base"),productId:selected.id,variantId:variant?.id,name_ar:selected.name_ar,name_en:selected.name_en,price,compare_at_price:selected.compare_at_price,size:variant?.size??selectedSize,color:variant?.color??selectedColor};
   setCart(c=>addCartItem(c,{...item,quantity:qty}));setSelected(null);setCartOpen(true);setToast("اتضافت للسلة ✨");
 }

 return <main className="min-h-screen bg-[#fffaf5]">
  <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/85 backdrop-blur-2xl">
   <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
    <a href="#" className="group flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-200 transition group-hover:-rotate-3 group-hover:scale-105">ج</span><span><b className="block text-lg tracking-tight">الجويلي</b><small className="text-[10px] font-bold tracking-[.28em] text-orange-500">ELGEWALIY</small></span></a>
    <nav className="hidden items-center gap-7 text-sm font-bold md:flex"><a href="#products" className="hover:text-orange-600">المتجر</a><a href="#about" className="hover:text-orange-600">ليه الجويلي؟</a><a href="/track" className="hover:text-orange-600">تتبع الطلب</a></nav>
    <div className="flex items-center gap-2"><a href="/auth" className="hidden size-10 place-items-center rounded-full bg-zinc-100 hover:bg-orange-100 sm:grid">👤</a><button onClick={()=>setCartOpen(true)} className="relative grid size-11 place-items-center rounded-full bg-zinc-950 text-white shadow-lg shadow-zinc-200 transition hover:-translate-y-0.5 hover:bg-orange-500">🛍️{count>0&&<span className="cart-badge absolute -right-1 -top-1">{count}</span>}</button></div>
   </div>
  </header>

  <section className="relative overflow-hidden"><div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/>
   <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.02fr_.98fr] md:items-center md:py-20">
    <div className="reveal"><span className="eyebrow">تشكيلة أطفال مختارة بعناية</span><h1 className="mt-6 text-5xl font-black leading-[1.04] tracking-tight md:text-7xl">لبس يليق<br/><span className="text-orange-500">بكل لحظة.</span></h1><p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 md:text-lg">اختار القطعة، شوف المقاس واللون، وأكمل طلبك في تجربة مصممة تكون سهلة من أول نقرة لحد الاستلام.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#products" className="magnetic rounded-2xl bg-orange-500 px-7 py-4 font-black text-white shadow-xl shadow-orange-200">ابدأ التسوق</a><a href="/auth" className="rounded-2xl border border-zinc-200 bg-white px-7 py-4 font-black hover:border-orange-300 hover:text-orange-600">حسابي ↗</a></div><div className="mt-8 flex gap-7 text-sm text-zinc-500"><span><b className="block text-lg text-zinc-900">مقاسات متنوعة</b>للأطفال</span><span><b className="block text-lg text-zinc-900">اختيار آمن</b>قبل الدفع</span></div></div>
    <div className="reveal relative" style={{animationDelay:".12s"}}><div className="hero-fashion-card"><div className="relative flex min-h-[410px] flex-col justify-between p-7 text-white"><div className="flex items-center justify-between"><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">NEW SEASON</span><span className="text-sm font-bold">2026</span></div><div className="relative mx-auto w-full max-w-sm"><div className="fashion-shirt mx-auto"><div className="shirt-collar"/><div className="shirt-seam"/></div><div className="absolute -right-2 top-8 rounded-2xl bg-white px-4 py-3 text-xs font-black text-zinc-900 shadow-xl rotate-3">راحة طول اليوم</div><div className="absolute -left-3 bottom-8 rounded-2xl bg-zinc-950/90 px-4 py-3 text-xs font-black text-white shadow-xl -rotate-3">اختار مقاسك</div></div><div className="flex items-end justify-between"><p className="max-w-[230px] text-sm leading-6 text-white/80">قطع يومية مريحة وشكلها حلو.</p><span className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-orange-600">تسوق الآن ↗</span></div></div></div></div>
   </div>
  </section>

  <section id="products" className="mx-auto max-w-7xl px-4 py-14 md:py-20"><div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><span className="section-kicker">SHOP / 01</span><h2 className="mt-1 text-3xl font-black md:text-4xl">اختار اللي يعجبك</h2><p className="mt-2 text-zinc-500">اضغط على أي قطعة عشان تختار المقاس واللون قبل الإضافة.</p></div><div className="relative w-full md:w-80"><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pr-11 pl-4 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"/></div></div>
   <div className="mb-8 flex gap-2 overflow-x-auto pb-2">{["all",...categories.map(c=>c.id)].map(id=><button key={id} onClick={()=>setCat(id)} className={cat===id?"category-pill active":"category-pill"}>{id==="all"?"الكل":categories.find(c=>c.id===id)?.name_ar}</button>)}</div>
   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((p,i)=><article key={p.id} className="product-card reveal" style={{animationDelay:(i*.06)+"s"}} onClick={()=>openProduct(p)}><div className="product-visual"><span className="product-tag">جديد</span><div className="product-shape"><div className="product-sleeve left"/><div className="product-sleeve right"/><div className="product-neck"/></div><div className="product-float-label">عرض سريع ↗</div></div><div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-black">{p.name_ar}</h3>{p.compare_at_price&&<span className="text-xs text-zinc-400 line-through">{p.compare_at_price} ج.م</span>}</div><p className="mt-2 min-h-10 text-sm leading-6 text-zinc-500">{p.description_ar}</p><div className="mt-5 flex items-center justify-between"><b className="text-xl text-orange-600">{p.price} <small className="text-xs">ج.م</small></b><button onClick={e=>{e.stopPropagation();openProduct(p)}} className="add-button">اختار +</button></div></div></article>)}</div>
  </section>

  <section id="about" className="mx-auto max-w-7xl px-4 pb-16 md:pb-24"><div className="overflow-hidden rounded-[34px] bg-zinc-950 p-7 text-white md:p-10"><div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><span className="section-kicker text-orange-400">WHY ELGEWALIY / 02</span><h2 className="mt-3 text-3xl font-black md:text-5xl">تجربة شراء<br/><span className="text-orange-400">بسيطة وسريعة.</span></h2></div><div className="grid gap-3 sm:grid-cols-3">{[["01","اختيار واضح","بحث وتصنيفات تساعدك توصل للي عايزه."],["02","اختيار المقاس","المقاس واللون جزء من نفس تجربة المنتج."],["03","تتبع مستمر","حسابك يفضل معاك لمتابعة طلباتك."]].map(([n,t,d])=><div key={n} className="rounded-2xl bg-white/5 p-5 transition hover:-translate-y-1 hover:bg-white/10"><b className="text-orange-400">{n}</b><h3 className="mt-4 font-black">{t}</h3><p className="mt-2 text-sm leading-6 text-white/55">{d}</p></div>)}</div></div></div></section>
  <footer className="border-t border-orange-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between"><span>© {new Date().getFullYear()} الجويلي — Elgewaliy</span><span>ملابس أطفال • أولاد • بنات</span></div></footer>

  {cartOpen&&<div className="fixed inset-0 z-50 bg-zinc-950/55 p-3 backdrop-blur-md" onClick={()=>setCartOpen(false)}><aside onClick={e=>e.stopPropagation()} className="cart-panel"><div className="flex items-center justify-between"><div><span className="section-kicker">YOUR CART</span><h2 className="mt-1 text-2xl font-black">السلة</h2></div><button onClick={()=>setCartOpen(false)} className="grid size-10 place-items-center rounded-full bg-zinc-100 hover:bg-orange-100">✕</button></div>{cart.length===0?<div className="flex h-[70vh] flex-col items-center justify-center text-center"><div className="grid size-20 place-items-center rounded-full bg-orange-50 text-orange-500 text-3xl">🛍️</div><h3 className="mt-5 text-xl font-black">السلة لسه فاضية</h3><p className="mt-2 text-sm text-zinc-500">اختار قطعة، المقاس واللون، وابدأ.</p></div>:<><div className="mt-6 space-y-3">{cart.map(item=><div key={item.key} className="cart-item"><div className="cart-thumb"><div className="mini-shirt"/></div><div className="min-w-0 flex-1"><b className="block truncate">{item.name_ar}</b><span className="text-xs text-zinc-500">{item.size&&("المقاس "+item.size+" ")}{item.color&&("• "+item.color)}</span><div className="mt-2 font-black text-orange-600">{item.price} ج.م</div></div><div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1"><button onClick={()=>setCart(c=>updateCartQuantity(c,item.key,item.quantity-1))} className="grid size-7 place-items-center rounded-lg bg-white">−</button><span className="min-w-5 text-center text-sm font-black">{item.quantity}</span><button onClick={()=>setCart(c=>updateCartQuantity(c,item.key,item.quantity+1))} className="grid size-7 place-items-center rounded-lg bg-white">+</button></div><button onClick={()=>setCart(c=>removeCartItem(c,item.key))} className="text-xs text-zinc-400 hover:text-red-500">حذف</button></div>)}</div><div className="mt-auto border-t pt-5"><div className="flex justify-between font-black"><span>الإجمالي</span><span className="text-xl text-orange-600">{total} ج.م</span></div><a href="/checkout" className="mt-5 block rounded-2xl bg-orange-500 py-4 text-center font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5">إتمام الطلب ↗</a></div></>}</aside></div>}

  {selected&&<div className="fixed inset-0 z-[60] grid place-items-end bg-zinc-950/55 p-3 backdrop-blur-md md:place-items-center" onClick={()=>setSelected(null)}><section onClick={e=>e.stopPropagation()} className="quick-view reveal"><button onClick={()=>setSelected(null)} className="absolute left-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/90 shadow">✕</button><div className="grid md:grid-cols-2"><div className="quick-visual"><div className="product-shape large"><div className="product-sleeve left"/><div className="product-sleeve right"/><div className="product-neck"/></div></div><div className="p-7 md:p-9"><span className="section-kicker">PRODUCT / DETAILS</span><h2 className="mt-2 text-3xl font-black">{selected.name_ar}</h2><p className="mt-3 leading-7 text-zinc-500">{selected.description_ar}</p><div className="mt-5 text-2xl font-black text-orange-600">{selected.price} ج.م</div>{(selected.product_variants??[]).length>0?<><div className="mt-7"><div className="mb-3 text-sm font-black">المقاس</div><div className="flex flex-wrap gap-2">{Array.from(new Set((selected.product_variants??[]).map(v=>v.size).filter(Boolean))).map(size=><button key={size} onClick={()=>setSelectedSize(size)} className={selectedSize===size?"choice active":"choice"}>{size}</button>)}</div></div><div className="mt-5"><div className="mb-3 text-sm font-black">اللون</div><div className="flex flex-wrap gap-2">{Array.from(new Set((selected.product_variants??[]).map(v=>v.color).filter(Boolean))).map(color=><button key={color} onClick={()=>setSelectedColor(color)} className={selectedColor===color?"choice active":"choice"}>{color}</button>)}</div></div></>:<p className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-orange-700">اختيارات المقاس واللون ستظهر هنا بمجرد إضافتها للمنتج.</p>}<div className="mt-6 flex items-center gap-2"><div className="flex items-center rounded-2xl bg-zinc-100 p-1"><button onClick={()=>setQty(Math.max(1,qty-1))} className="grid size-10 place-items-center rounded-xl bg-white">−</button><span className="w-10 text-center font-black">{qty}</span><button onClick={()=>setQty(qty+1)} className="grid size-10 place-items-center rounded-xl bg-white">+</button></div><button onClick={addSelected} className="flex-1 rounded-2xl bg-orange-500 py-3.5 font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5">أضف للسلة</button></div></div></div></section></div>}
  {toast&&<div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white shadow-2xl toast-pop">{toast}</div>}
 </main>
}
