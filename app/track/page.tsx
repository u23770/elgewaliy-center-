"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const labels: Record<string,string> = {
  new: "تم استلام الطلب",
  accepted: "تم قبول الطلب",
  preparing: "جاري التجهيز",
  ready: "الطلب جاهز",
  out_for_delivery: "خرج للتوصيل",
  shipped: "خرج للتوصيل",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const orderParam = () => new URLSearchParams(window.location.search);

export default function Track() {
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  async function load(orderId = id, trackingToken = token) {
    if (!orderId || !trackingToken) return;
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_guest_store_order", {
      p_order_id: orderId,
      p_tracking_token: trackingToken,
    });
    if (rpcError || !data?.order) {
      setError("بيانات التتبع غير صحيحة أو انتهت صلاحيتها.");
      return;
    }
    setOrder(data);
  }

  useEffect(() => {
    const params = orderParam();
    const orderNumber = params.get("order");
    const queryToken = params.get("token");
    if (orderNumber && queryToken) {
      setToken(queryToken);
      supabase.from("orders").select("id").eq("order_number", orderNumber).maybeSingle().then(({data}) => {
        if (data?.id) {
          setId(data.id);
          load(data.id, queryToken);
        }
      });
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem("elgewaliy-active-order") || "null");
        if (saved?.orderId && saved?.trackingToken) {
          setId(saved.orderNumber || "");
          setToken(saved.trackingToken);
        }
      } catch {}
    }
  }, []);

  const status = order?.order?.status as string | undefined;
  const progress = ["new","accepted","preparing","ready","out_for_delivery","delivered"].indexOf(status || "");

  return (
    <main className="min-h-screen bg-orange-50 p-4">
      <div className="mx-auto max-w-xl py-16">
        <a href="/" className="text-orange-600">← العودة للمتجر</a>
        <div className="card mt-5 p-7">
          <h1 className="text-3xl font-black">تتبع طلبك</h1>
          <p className="mt-2 text-zinc-500">استخدم رقم الطلب ورمز التتبع الخاص بطلبك.</p>
          <input value={id} onChange={e => setId(e.target.value)} placeholder="معرّف الطلب" className="mt-6 w-full rounded-2xl border p-4" />
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="رمز التتبع" className="mt-3 w-full rounded-2xl border p-4" />
          <button onClick={() => load()} className="mt-3 w-full rounded-2xl bg-orange-500 py-4 font-black text-white">تتبع الطلب</button>

          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {order?.order && (
            <div className="mt-7 rounded-2xl bg-orange-50 p-5">
              <div className="text-sm text-zinc-500">الطلب {order.order.order_number}</div>
              <div className="mt-2 text-2xl font-black text-orange-600">{labels[status || ""] || status}</div>
              <div className="mt-4 h-2 rounded-full bg-orange-100">
                <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${Math.max(0, progress) / 5 * 100}%` }} />
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-500">
                {order.events?.map((event:any) => <div key={event.id}>• {labels[event.status] || event.status}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
