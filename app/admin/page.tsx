"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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

      await loadOrders();
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
  }, [loadOrders]);

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
          <section className="card p-6">
            <h1 className="text-xl font-black">إدارة المنتجات</h1>
            <p className="mt-2 text-zinc-500">إدارة المنتجات والمقاسات والألوان والمخزون ستكون المرحلة التالية من لوحة التشغيل.</p>
            <a href="/" className="mt-5 inline-flex rounded-2xl bg-orange-500 px-6 py-3 font-black text-white">عرض المتجر</a>
          </section>
        )}
      </div>
    </main>
  );
}
