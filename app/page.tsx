"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";

const fallbackProducts:Product[]=[
{id:"1",name_ar:"تيشيرت أطفال قطن",name_en:"Kids Cotton T-Shirt",slug:"kids-cotton-tshirt",description_ar:"تيشيرت مريح مناسب للاستخدام اليومي",description_en:"Comfortable everyday cotton t-shirt",price:249,compare_at_price:299,category_id:null},
{id:"2",name_ar:"تريننج أولادي",name_en:"Boys Tracksuit",slug:"boys-tracksuit",description_ar:"تريننج عملي ومريح للأطفال",description_en:"Comfortable practical tracksuit",price:499,compare_at_price:599,category_id:null},
{id:"3",name_ar:"فستان بناتي",name_en:"Girls Dress",slug:"girls-dress",description_ar:"فستان أنيق للأطفال",description_en:"Cute everyday girls dress",price:399,compare_at_price:449,category_id:null},
{id:"4",name_ar:"طقم أطفال صيفي",name_en:"Kids Summer Set",slug:"kids-summer-set",description_ar:"طقم صيفي خفيف ومريح",description_en:"Lightweight summer set",price:349,compare_at_price:399,category_id:null}
];

export default function Home(){
 const [products,setProducts]=useState<Product[]>(fallbackProducts);
 const [categories,setCategories]=useState<Category[]>([]);
 const [q,setQ]=useState("");
 const [cat,setCat]=useState("all");
 const [cart,setCart]=useState<Product[]>([]);
 useEffect(()=>{try{const saved=localStorage.getItem("elgewaliy-cart");if(saved)setCart(JSON.parse(saved))}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("elgewaliy-cart",JSON.stringify(cart))}catch{}},[cart]);
 const [open,setOpen]=useState(false);

 useEffect(()=>{(async()=>{
   const [{data:p},{data:c}]=await Promise.all([
     supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false}),
     supabase.from("categories").select("id,name_ar,name_en,slug").eq("is_active",true).order("sort_order")
   ]);
   if(p?.length)setProducts(p as Product[]);
   if(c?.length)setCategories(c as Category[]);
 })()},[]);

 const filtered=useMemo(()=>products.filter(p=>(cat==="all"||p.category_id===cat)&&
   (p.name_ar.includes(q)||p.name_en.toLowerCase().includes(q.toLowerCase()))),[products,q,cat]);

 const add=(p:Product)=>setCart(c=>[...c,p]);
 return <main>
   <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <a href="#" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-orange-500 text-xl font-black text-white">ج</span><span><b className="block text-lg">الجويلي</b><small className="text-zinc-500">ELGEWALIY</small></span></a>
      <nav className="hidden gap-7 text-sm font-bold md:flex"><a href="#products">المنتجات</a><a href="#about">عن الجويلي</a><a href="/track">تتبع طلبك</a><a href="/admin">الإدارة</a></nav>
      <button onClick={()=>setOpen(true)} className="rounded-full bg-orange-500 px-4 py-2 font-bold text-white">السلة ({cart.length})</button>
    </div>
   </header>
   <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
    <div><span className="inline-block rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">ملابس أطفال • أولاد • بنات</span>
      <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">ستايل أطفالك<br/><span className="text-orange-500">يبدأ من الجويلي</span></h1>
      <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">اختار المقاس واللون، اطلب بسهولة، وتابع طلبك من لحظة التأكيد حتى التوصيل.</p>
      <a href="#products" className="mt-7 inline-block rounded-2xl bg-orange-500 px-7 py-4 font-black text-white shadow-lg shadow-orange-200">تسوق الآن</a>
    </div>
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-200 p-8 text-white shadow-2xl">
      <div className="absolute -left-10 -top-10 size-40 rounded-full bg-white/20"/>
      <div className="relative"><div className="text-8xl">👕</div><h2 className="mt-8 text-3xl font-black">اختيارات جديدة</h2><p className="mt-2 text-white/85">تشكيلة متجددة للعائلة كلها.</p></div>
    </div>
   </section>
   <section id="products" className="mx-auto max-w-7xl px-4 py-8">
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-3xl font-black">منتجاتنا</h2><p className="mt-1 text-zinc-500">اختار اللي يناسبك</p></div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-2xl border border-orange-100 bg-white px-5 py-3 outline-none focus:border-orange-400 md:w-80"/>
    </div>
    <div className="mb-7 flex gap-2 overflow-x-auto pb-2"><button onClick={()=>setCat("all")} className={`whitespace-nowrap rounded-full px-5 py-2 font-bold ${cat==="all"?"bg-orange-500 text-white":"bg-white text-zinc-600"}`}>الكل</button>{categories.map(c=><button key={c.id} onClick={()=>setCat(c.id)} className={`whitespace-nowrap rounded-full px-5 py-2 font-bold ${cat===c.id?"bg-orange-500 text-white":"bg-white text-zinc-600"}`}>{c.name_ar}</button>)}</div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filtered.map(p=><article key={p.id} className="card overflow-hidden"><div className="grid aspect-square place-items-center bg-gradient-to-br from-orange-50 to-amber-100 text-8xl">🧒</div><div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-black">{p.name_ar}</h3>{p.compare_at_price&&<span className="text-xs text-zinc-400 line-through">{p.compare_at_price} ج.م</span>}</div><p className="mt-2 min-h-10 text-sm text-zinc-500">{p.description_ar}</p><div className="mt-4 flex items-center justify-between"><b className="text-xl text-orange-600">{p.price} ج.م</b><button onClick={()=>add(p)} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">أضف للسلة</button></div></div></article>)}</div>
   </section>
   <section id="about" className="mx-auto max-w-7xl px-4 py-16"><div className="card grid gap-6 p-7 md:grid-cols-3"><div><b className="text-orange-500">01</b><h3 className="mt-2 text-xl font-black">اختيار سهل</h3><p className="mt-2 text-zinc-500">بحث وفلاتر ومقاسات واضحة.</p></div><div><b className="text-orange-500">02</b><h3 className="mt-2 text-xl font-black">طلب سريع</h3><p className="mt-2 text-zinc-500">السلة والطلب في خطوات بسيطة.</p></div><div><b className="text-orange-500">03</b><h3 className="mt-2 text-xl font-black">تتبع الطلب</h3><p className="mt-2 text-zinc-500">اعرف حالة طلبك في أي وقت.</p></div></div></section>
   <footer className="border-t border-orange-100 bg-white py-8 text-center text-sm text-zinc-500">© {new Date().getFullYear()} الجويلي — Elgewaliy</footer>
   {open&&<div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={()=>setOpen(false)}><aside onClick={e=>e.stopPropagation()} className="ml-auto h-full max-w-md overflow-y-auto rounded-3xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">السلة</h2><button onClick={()=>setOpen(false)}>✕</button></div>{cart.length===0?<p className="py-16 text-center text-zinc-500">السلة فاضية</p>:<><div className="mt-6 space-y-3">{cart.map((p,i)=><div key={i} className="rounded-2xl bg-orange-50 p-4"><b>{p.name_ar}</b><div className="mt-1 text-orange-600">{p.price} ج.م</div></div>)}</div><a href="/checkout" className="mt-6 block rounded-2xl bg-orange-500 py-4 text-center font-black text-white">إتمام الطلب</a></>}</aside></div>}
 </main>
}
