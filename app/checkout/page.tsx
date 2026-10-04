"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/lib/cart";

export default function Checkout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [done, setDone] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => cart.reduce((s, p) => s + p.price * p.quantity, 0), [cart]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("elgewaliy-cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCart(Array.isArray(parsed) ? parsed : []);
      }
    } catch {}
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setName((data.user.user_metadata?.name as string) || "");
    });
  }, []);

  async function submit() {
    if (!name.trim() || !phone.trim() || !address.trim() || cart.length === 0) return;
    setLoading(true);
    setDone("");

    const { data: { user } } = await supabase.auth.getUser();

    let customerId: string | null = null;
    if (user) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      } else {
        const { data: customer, error } = await supabase
          .from("customers")
          .insert({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            email: user.email ?? null,
            auth_user_id: user.id,
          })
          .select("id")
          .single();

        if (error || !customer) {
          setDone("تعذر حفظ بيانات العميل حاليًا. حاول مرة أخرى.");
          setLoading(false);
          return;
        }
        customerId = customer.id;
      }
    }

    const { data, error } = await supabase.rpc("create_store_order", {
      p_customer_id: customerId,
      p_customer_name: name.trim(),
      p_customer_phone: phone.trim(),
      p_customer_address: address.trim(),
      p_notes: "",
      p_payment_method: paymentMethod,
      p_maps_link: "",
      p_delivery_zone: "",
      p_delivery_subzone: "",
      p_items: cart.map(item => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        quantity: item.quantity
      })),
    });

    if (error || !data) {
      setDone(error?.message || "تعذر إنشاء الطلب حاليًا. حاول مرة أخرى.");
      setLoading(false);
      return;
    }

    const result = data as {
      order_number: string;
      tracking_token: string;
    };

    localStorage.removeItem("elgewaliy-cart");
    localStorage.setItem(
      "elgewaliy-active-order",
      JSON.stringify({ orderId: result.id, orderNumber: result.order_number, trackingToken: result.tracking_token })
    );
    setCart([]);
    setDone(result.order_number);
    setTrackingToken(result.tracking_token);
    setLoading(false);
  }

  if (done.startsWith("EGW-")) {
    return (
      <main className="min-h-screen bg-[#fffaf5] p-4">
        <div className="mx-auto max-w-xl py-20">
          <div className="auth-card text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-orange-100 text-3xl text-orange-600">✓</div>
            <h1 className="mt-5 text-3xl font-black">تم استلام طلبك</h1>
            <p className="mt-3 text-zinc-500">رقم الطلب</p>
            <b className="mt-1 block text-2xl text-orange-600">{done}</b>
            <p className="mt-3 text-sm text-zinc-500">احتفظ ببيانات التتبع لمتابعة حالة الطلب.</p>
            <div className="mt-7 grid gap-3">
              <a href={"/track?order=" + encodeURIComponent(done) + "&token=" + encodeURIComponent(trackingToken)} className="rounded-2xl bg-orange-500 px-7 py-4 font-black text-white">تتبع الطلب</a>
              <a href="/" className="rounded-2xl border border-zinc-200 px-7 py-4 font-black">العودة للمتجر</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] p-4">
      <div className="mx-auto max-w-3xl py-8 md:py-14">
        <a href="/" className="text-sm font-black text-orange-600">← العودة للمتجر</a>
        <div className="mt-5 grid gap-5 md:grid-cols-[1.1fr_.9fr]">
          <section className="auth-card">
            <span className="section-kicker">CHECKOUT / 01</span>
            <h1 className="mt-2 text-3xl font-black">إتمام الطلب</h1>
            <p className="mt-2 text-zinc-500">بيانات بسيطة عشان نوصّل طلبك.</p>
            <div className="mt-7 grid gap-4">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" className="auth-input" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف" className="auth-input" />
              <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="العنوان بالتفصيل" className="auth-input min-h-32" />
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="auth-input">
                <option value="cash">الدفع عند الاستلام - كاش</option>
                <option value="card_on_delivery">الدفع عند الاستلام - كارت</option>
              </select>
              {done && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{done}</p>}
              <button disabled={loading || !cart.length || !name || !phone || !address} onClick={submit} className="rounded-2xl bg-orange-500 py-4 font-black text-white shadow-lg shadow-orange-200 disabled:opacity-40">
                {loading ? "جارٍ تأكيد الطلب..." : "تأكيد الطلب"}
              </button>
            </div>
          </section>

          <aside className="auth-card h-fit">
            <span className="section-kicker">ORDER / 02</span>
            <h2 className="mt-2 text-2xl font-black">ملخص الطلب</h2>
            <div className="mt-6 space-y-3">
              {cart.map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl bg-orange-50 p-4">
                  <div>
                    <b className="text-sm">{item.name_ar}</b>
                    <p className="mt-1 text-xs text-zinc-500">{item.quantity} × {item.price} ج.م {item.size && ("• " + item.size)}</p>
                  </div>
                  <b>{item.price * item.quantity} ج.م</b>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t pt-5 text-lg font-black">
              <span>الإجمالي</span>
              <span className="text-orange-600">{total} ج.م</span>
            </div>
            <a href="/auth" className="mt-5 block text-center text-xs font-bold text-zinc-400">عندك حساب؟ سجل دخولك</a>
          </aside>
        </div>
      </div>
    </main>
  );
}
