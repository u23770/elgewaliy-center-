"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export default function Checkout(){
  const [cart,setCart]=useState<Product[]>([]);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [address,setAddress]=useState("");
  const [done,setDone]=useState("");
  const total=useMemo(()=>cart.reduce((s,p)=>s+p.price,0),[cart]);

  useEffect(()=>{try{const saved=localStorage.getItem("elgewaliy-cart");if(saved)setCart(JSON.parse(saved))}catch{}},[]);

  async function submit(){
    if(!name.trim()||!phone.trim()||!address.trim()||cart.length===0)return;
    const code=`EGW-${Date.now().toString().slice(-6)}`;
    const {data:customer}=await supabase.from("customers").insert({name:name.trim(),phone:phone.trim(),address:address.trim()}).select("id").single();
    if(customer){
      const {error}=await supabase.from("orders").insert({order_number:code,customer_id:customer.id,total_amount:total,status:"new",shipping_address:address.trim()});
      if(error){setDone("تعذر حفظ الطلب حاليًا. حاول مرة أخرى.");return}
    }
    localStorage.removeItem("elgewaliy-cart");setCart([]);setDone(code);
  }

  if(done && done.startsWith("EGW-")) return <main className="min-h-screen bg-orange-50 p-4"><div className="mx-auto max-w-xl py-20"><div className="card p-8 text-center"><div className="text-6xl">✓</div><h1 className="mt-5 text-3xl font-black">تم استلام طلبك</h1><p className="mt-3 text-zinc-500">رقم الطلب</p><b className="mt-1 block text-2xl text-orange-600">{done}</b><a href={`/track?order=${done}`} className="mt-7 inline-block rounded-2xl bg-orange-500 px-7 py-3 font-black text-white">تتبع الطلب</a></div></div></main>;

  return <main className="min-h-screen bg-orange-50 p-4"><div className="mx-auto max-w-2xl py-10"><a href="/" className="text-orange-600">← العودة للمتجر</a><div className="card mt-5 p-7"><h1 className="text-3xl font-black">إتمام الطلب</h1><p className="mt-2 text-zinc-500">{cart.length} منتج • {total} ج.م</p><div className="mt-7 grid gap-4"><input value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم" className="rounded-2xl border p-4"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="رقم الهاتف" className="rounded-2xl border p-4"/><textarea value={address} onChange={e=>setAddress(e.target.value)} placeholder="العنوان" className="min-h-28 rounded-2xl border p-4"/></div>{done&&!done.startsWith("EGW-")&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{done}</p>}<button disabled={!cart.length||!name||!phone||!address} onClick={submit} className="mt-6 w-full rounded-2xl bg-orange-500 py-4 font-black text-white disabled:opacity-40">تأكيد الطلب • {total} ج.م</button></div></div></main>
}
