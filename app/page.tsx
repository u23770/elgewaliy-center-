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
 const [open,setOpen]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem("elgewaliy-cart");if(saved)setCart(JSON.parse(saved))}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("elgewaliy-cart",JSON.stringify(cart))}catch{}},[cart]);
 useEffect(()=>{(async()=>{const [{data:p},{data:c}]=await Promise.all([supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false}),supabase.from("categories").select("id,name_ar,name_en,slug").eq("is_active",true).order("sort_order")]);if(p?.length)setProducts(p as Product[]);if(c?.length)setCategories(c as Category[])})()},[]);
 const filtered=useMemo(()=>products.filter(p=>(cat==="all"||p.category_id===cat)&&(p.name_ar.includes(q)||p.name_en.toLowerCase().includes(q.toLowerCase()))),[products,q,cat]);
 const total=cart.reduce((s,p)=>s+p.price,0);
 const add=(p:Product)=>setCart(c=>[...c,p]);
 return <main>
  <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/90 backdrop-blur-xl">
   <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5">
    <a href="#" className="group flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-200 group-hover:rotate-3">ج</span>
      <span><b className="block text-lg tracking-tight">الجويلي</b><small className="text-[10px] font-bold tracking-[.25em] text-orange-500">ELGEWALIY</small></span>
    </a>
    <nav className="hidden items-center gap-8 text-sm font-bold md:flex"><a className="hover:text-orange-600" href="#products">المتجر</a><a className="hover:text-orange-600" href="#about">ليه الجويلي؟</a><a className="hover:text-orange-600" href="/track">تتبع الطلب</a><a className="hover:text-orange-600" href="/admin">الإدارة</a></nav>
    <button onClick={()=>setOpen(true)} className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-zinc-200 hover:bg-orange-500">السلة <span className="mr-1 text-orange-300">({cart.length})</span></button>
   </div>
  </header>

  <section className="relative overflow-hidden">
   <div className="absolute -right-32 -top-24 size-80 rounded-full bg-orange-200/50 blur-3xl"/>
   <div className="absolute -left-32 bottom-0 size-80 rounded-full bg-amber-200/40 blur-3xl"/>
   <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-20">
    <div className="reveal">
      <span className="inline-flex rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-black text-orange-700 shadow-sm">تشكيلة أطفال مختارة بعناية</span>
      <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight md:text-7xl">لبس يليق<br/><span className="text-orange-500">بكل لحظة.</span></h1>
      <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 md:text-lg">اختار من تشكيلتنا للأولاد والبنات، شوف التفاصيل والمقاسات، وحط طلبك في دقائق.</p>
      <div className="mt-8 flex flex-wrap gap-3"><a href="#products" className="rounded-2xl bg-orange-500 px-7 py-4 font-black text-white shadow-xl shadow-orange-200 hover:-translate-y-0.5">ابدأ التسوق</a><a href="#about" className="rounded-2xl border border-zinc-200 bg-white px-7 py-4 font-black hover:border-orange-300 hover:text-orange-600">اكتشف الجويلي</a></div>
      <div className="mt-8 flex gap-6 text-sm text-zinc-500"><span><b className="block text-lg text-zinc-900">مقاسات متنوعة</b>للأطفال</span><span><b className="block text-lg text-zinc-900">طلب أونلاين</b>بسهولة</span></div>
    </div>
    <div className="reveal relative" style={{animationDelay:".12s"}}>
      <div className="shimmer relative min-h-[390px] overflow-hidden rounded-[38px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-200 p-7 text-white shadow-2xl shadow-orange-200">
       <div className="absolute right-[-50px] top-[-50px] size-52 rounded-full border-[35px] border-white/15"/>
       <div className="absolute bottom-[-70px] left-[-40px] size-64 rounded-full bg-white/10"/>
       <div className="relative flex h-full min-h-[335px] flex-col justify-between">
        <div className="flex items-center justify-between"><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">NEW SEASON</span><span className="text-sm font-bold">2026</span></div>
        <div className="float text-center"><div className="text-[110px] leading-none drop-shadow-2xl">👕</div><h2 className="mt-5 text-4xl font-black">ستايل صغير<br/>بتفاصيل كبيرة</h2></div>
        <div className="flex items-end justify-between"><p className="max-w-[220px] text-sm leading-6 text-white/80">قطع يومية مريحة وشكلها حلو.</p><span className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-orange-600">تسوق الآن ↗</span></div>
       </div>
      </div>
    </div>
   </div>
  </section>

  <section id="products" className="mx-auto max-w-7xl px-4 py-14 md:py-20">
   <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
    <div><span className="text-sm font-black text-orange-500">SHOP / 01</span><h2 className="mt-1 text-3xl font-black md:text-4xl">اختار اللي يعجبك</h2><p className="mt-2 text-zinc-500">كل اللي تحتاجه في مكان واحد.</p></div>
    <div className="relative w-full md:w-80"><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pr-11 pl-4 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"/></div>
   </div>
   <div className="mb-8 flex gap-2 overflow-x-auto pb-2">{["all",...categories.map(c=>c.id)].map((id,i)=>{const label=id==="all"?"الكل":categories.find(c=>c.id===id)?.name_ar;return <button key={id} onClick={()=>setCat(id)} className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-black transition ${cat===id?"border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-100":"border-zinc-200 bg-white text-zinc-600 hover:border-orange-300 hover:text-orange-600"}`}>{label}</button>})}</div>
   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((p,i)=><article key={p.id} className="card group overflow-hidden reveal" style={{animationDelay:`${i*.06}s`}}>
    <div className="relative aspect-[4/4.3] overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100"><div className="absolute right-4 top-4 z-10 rounded-full bg-white/85 px-3 py-1 text-xs font-black text-orange-600 backdrop-blur">جديد</div><div className="grid h-full place-items-center text-8xl transition duration-500 group-hover:scale-110">🧒</div></div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-black">{p.name_ar}</h3>{p.compare_at_price&&<span className="text-xs text-zinc-400 line-through">{p.compare_at_price} ج.م</span>}</div><p className="mt-2 min-h-10 text-sm leading-6 text-zinc-500">{p.description_ar}</p><div className="mt-5 flex items-center justify-between"><b className="text-xl text-orange-600">{p.price} <small className="text-xs">ج.م</small></b><button onClick={()=>add(p)} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white hover:bg-orange-500">أضف +</button></div></div>
   </article>)}</div>
  </section>

  <section id="about" className="mx-auto max-w-7xl px-4 pb-16 md:pb-24"><div className="overflow-hidden rounded-[34px] bg-zinc-950 p-7 text-white md:p-10"><div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><span className="text-sm font-black text-orange-400">WHY ELGEWALIY / 02</span><h2 className="mt-3 text-3xl font-black md:text-5xl">تجربة شراء<br/><span className="text-orange-400">بسيطة وسريعة.</span></h2></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/5 p-5"><b className="text-orange-400">01</b><h3 className="mt-4 font-black">اختيار واضح</h3><p className="mt-2 text-sm leading-6 text-white/55">بحث وتصنيفات تساعدك توصل للي عايزه.</p></div><div className="rounded-2xl bg-white/5 p-5"><b className="text-orange-400">02</b><h3 className="mt-4 font-black">طلب سريع</h3><p className="mt-2 text-sm leading-6 text-white/55">السلة والـCheckout في خطوات قليلة.</p></div><div className="rounded-2xl bg-white/5 p-5"><b className="text-orange-400">03</b><h3 className="mt-4 font-black">تتبع مستمر</h3><p className="mt-2 text-sm leading-6 text-white/55">تابع حالة طلبك بسهولة.</p></div></div></div></div></section>
  <footer className="border-t border-orange-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between"><span>© {new Date().getFullYear()} الجويلي — Elgewaliy</span><span>ملابس أطفال • أولاد • بنات</span></div></footer>

  {open&&<div className="fixed inset-0 z-50 bg-zinc-950/50 p-3 backdrop-blur-sm" onClick={()=>setOpen(false)}><aside onClick={e=>e.stopPropagation()} className="ml-auto h-full max-w-md overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl reveal"><div className="flex items-center justify-between"><div><span className="text-xs font-black text-orange-500">YOUR CART</span><h2 className="mt-1 text-2xl font-black">السلة</h2></div><button onClick={()=>setOpen(false)} className="grid size-10 place-items-center rounded-full bg-zinc-100 hover:bg-orange-100">✕</button></div>{cart.length===0?<p className="py-20 text-center text-zinc-500">السلة فاضية</p>:<><div className="mt-6 space-y-3">{cart.map((p,i)=><div key={i} className="flex items-center justify-between rounded-2xl bg-orange-50 p-4"><div><b>{p.name_ar}</b><div className="mt-1 text-sm text-zinc-500">{p.price} ج.م</div></div><button onClick={()=>setCart(c=>c.filter((_,idx)=>idx!==i))} className="text-xs font-bold text-zinc-400 hover:text-red-500">حذف</button></div>)}</div><div className="mt-6 flex justify-between border-t pt-5 font-black"><span>الإجمالي</span><span className="text-orange-600">{total} ج.م</span></div><a href="/checkout" className="mt-5 block rounded-2xl bg-orange-500 py-4 text-center font-black text-white shadow-lg shadow-orange-200 hover:-translate-y-0.5">إتمام الطلب ↗</a></>}</aside></div>}
 </main>
}
