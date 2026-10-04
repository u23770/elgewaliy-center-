import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const supabaseSecret =
  secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const adminClient = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const allowedStatuses = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "shipped",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashAccessCode(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function authorize(request: Request) {
  const accessCode = request.headers.get("x-admin-token")?.trim() || "";
  if (accessCode.length < 24) return false;

  const tokenHash = await hashAccessCode(accessCode);
  const { data, error } = await adminClient
    .from("admin_access_tokens")
    .select("id")
    .eq("token_hash", tokenHash)
    .eq("enabled", true)
    .maybeSingle();

  return !error && !!data;
}

function textValue(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function slugValue(value: unknown) {
  return textValue(value, 160).toLowerCase();
}

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

function fromBase64(value: string) {
  const binary = atob(value);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  return index === -1
    ? null
    : decodeURIComponent(url.slice(index + marker.length));
}

async function dashboard() {
  const [products, categories, variants, images, orders, items] =
    await Promise.all([
      adminClient
        .from("products")
        .select(
          "id,category_id,name_ar,name_en,slug,description_ar,description_en,price,compare_at_price,is_active,created_at,updated_at",
        )
        .order("created_at", { ascending: false }),
      adminClient
        .from("categories")
        .select(
          "id,name_ar,name_en,slug,image_url,sort_order,is_active,created_at",
        )
        .order("sort_order"),
      adminClient
        .from("product_variants")
        .select("id,product_id,size,color,sku,stock,price_override,is_active")
        .order("product_id")
        .order("size"),
      adminClient
        .from("product_images")
        .select("id,product_id,url,alt_ar,alt_en,sort_order")
        .order("product_id")
        .order("sort_order"),
      adminClient
        .from("orders")
        .select(
          "id,order_number,customer_id,customer_name,customer_phone,customer_address,subtotal,delivery_fee,total,status,notes,created_at,updated_at,payment_method,maps_link,delivery_zone,delivery_subzone",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      adminClient
        .from("order_items")
        .select(
          "id,order_id,product_id,variant_id,product_name_ar,product_name_en,size,color,unit_price,quantity,total",
        )
        .order("order_id"),
    ]);

  const failure = [products, categories, variants, images, orders, items].find(
    (result) => result.error,
  );
  if (failure?.error) throw failure.error;

  return {
    products: products.data || [],
    categories: categories.data || [],
    variants: variants.data || [],
    images: images.data || [],
    orders: orders.data || [],
    orderItems: items.data || [],
    generatedAt: new Date().toISOString(),
  };
}

async function handleAction(action: string, body: Record<string, unknown>) {
  if (action === "dashboard") return dashboard();

  if (action === "update_order_status") {
    const orderId = textValue(body.order_id, 80);
    const status = textValue(body.status, 40);
    const note = textValue(body.note, 500) || null;

    if (!orderId || !allowedStatuses.includes(status)) {
      throw new Error("بيانات حالة الطلب غير صحيحة.");
    }

    const { data, error } = await adminClient
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select("id,order_number,status,updated_at")
      .single();

    if (error) throw error;

    const { error: eventError } = await adminClient
      .from("order_events")
      .insert({ order_id: orderId, status, note });

    if (eventError) throw eventError;

    return { order: data };
  }

  if (action === "save_product") {
    const id = textValue(body.id, 80);
    const nameAr = textValue(body.name_ar, 160);
    const nameEn = textValue(body.name_en, 160);
    const slug = slugValue(body.slug);
    const price = numberValue(body.price);
    const compare =
      body.compare_at_price === null || body.compare_at_price === ""
        ? null
        : numberValue(body.compare_at_price);

    if (!nameAr || !nameEn || !slug) {
      throw new Error("اسم المنتج والاسم الإنجليزي والـSlug مطلوبين.");
    }

    const { data, error } = await adminClient
      .from("products")
      .upsert({
        ...(id ? { id } : {}),
        category_id: textValue(body.category_id, 80) || null,
        name_ar: nameAr,
        name_en: nameEn,
        slug,
        description_ar: textValue(body.description_ar, 1000) || null,
        description_en: textValue(body.description_en, 1000) || null,
        price,
        compare_at_price: compare,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .select(
        "id,category_id,name_ar,name_en,slug,description_ar,description_en,price,compare_at_price,is_active,created_at,updated_at",
      )
      .single();

    if (error) throw error;
    return { product: data };
  }

  if (action === "toggle_product") {
    const id = textValue(body.id, 80);
    if (!id) throw new Error("معرّف المنتج مطلوب.");

    const { data: current, error: readError } = await adminClient
      .from("products")
      .select("is_active")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    const { error } = await adminClient
      .from("products")
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  }

  if (action === "save_category") {
    const id = textValue(body.id, 80);
    const nameAr = textValue(body.name_ar, 160);
    const nameEn = textValue(body.name_en, 160);
    const slug = slugValue(body.slug);

    if (!nameAr || !nameEn || !slug) {
      throw new Error("اسم القسم والـSlug مطلوبين.");
    }

    const { data, error } = await adminClient
      .from("categories")
      .upsert({
        ...(id ? { id } : {}),
        name_ar: nameAr,
        name_en: nameEn,
        slug,
        image_url: textValue(body.image_url, 500) || null,
        sort_order: Math.max(
          0,
          Math.trunc(Number(body.sort_order) || 0),
        ),
        is_active: body.is_active !== false,
      })
      .select(
        "id,name_ar,name_en,slug,image_url,sort_order,is_active,created_at",
      )
      .single();

    if (error) throw error;
    return { category: data };
  }

  if (action === "toggle_category") {
    const id = textValue(body.id, 80);
    if (!id) throw new Error("معرّف القسم مطلوب.");

    const { data: current, error: readError } = await adminClient
      .from("categories")
      .select("is_active")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    const { error } = await adminClient
      .from("categories")
      .update({ is_active: !current.is_active })
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  }

  if (action === "save_variant") {
    const id = textValue(body.id, 80);
    const productId = textValue(body.product_id, 80);
    const stock = Math.max(0, Math.trunc(Number(body.stock) || 0));
    const price =
      body.price_override === null || body.price_override === ""
        ? null
        : numberValue(body.price_override);

    if (!productId) throw new Error("المنتج مطلوب.");

    const { data, error } = await adminClient
      .from("product_variants")
      .upsert({
        ...(id ? { id } : {}),
        product_id: productId,
        size: textValue(body.size, 80) || null,
        color: textValue(body.color, 80) || null,
        sku: textValue(body.sku, 100) || null,
        stock,
        price_override: price,
        is_active: body.is_active !== false,
      })
      .select(
        "id,product_id,size,color,sku,stock,price_override,is_active",
      )
      .single();

    if (error) throw error;
    return { variant: data };
  }

  if (action === "toggle_variant") {
    const id = textValue(body.id, 80);
    if (!id) throw new Error("معرّف الاختيار مطلوب.");

    const { data: current, error: readError } = await adminClient
      .from("product_variants")
      .select("is_active")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    const { error } = await adminClient
      .from("product_variants")
      .update({ is_active: !current.is_active })
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  }

  if (action === "upload_image") {
    const productId = textValue(body.product_id, 80);
    const fileName = textValue(body.file_name, 180);
    const mimeType = textValue(body.mime_type, 80);
    const base64 = textValue(body.data_base64, 8_000_000);
    const allowedMime = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    if (!productId || !fileName || !allowedMime.has(mimeType) || !base64) {
      throw new Error("بيانات الصورة غير صحيحة.");
    }

    const bytes = fromBase64(base64);
    if (bytes.byteLength > 5 * 1024 * 1024) {
      throw new Error("حجم الصورة يجب ألا يتجاوز 5MB.");
    }

    const path =
      productId + "/" + crypto.randomUUID() + "-" + safeFileName(fileName);

    const { error: uploadError } = await adminClient.storage
      .from("product-images")
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: publicData } = adminClient.storage
      .from("product-images")
      .getPublicUrl(path);

    const { data: latest, error: latestError } = await adminClient
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) throw latestError;

    const { data, error } = await adminClient
      .from("product_images")
      .insert({
        product_id: productId,
        url: publicData.publicUrl,
        alt_ar: textValue(body.alt_ar, 200) || null,
        alt_en: textValue(body.alt_en, 200) || null,
        sort_order: (latest?.sort_order ?? -1) + 1,
      })
      .select("id,product_id,url,alt_ar,alt_en,sort_order")
      .single();

    if (error) {
      await adminClient.storage.from("product-images").remove([path]);
      throw error;
    }

    return { image: data };
  }

  if (action === "delete_image") {
    const id = textValue(body.id, 80);
    if (!id) throw new Error("معرّف الصورة مطلوب.");

    const { data: image, error: readError } = await adminClient
      .from("product_images")
      .select("id,url")
      .eq("id", id)
      .single();

    if (readError) throw readError;

    const path = storagePathFromPublicUrl(image.url);
    if (path) {
      const { error: storageError } = await adminClient.storage
        .from("product-images")
        .remove([path]);
      if (storageError) throw storageError;
    }

    const { error } = await adminClient
      .from("product_images")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return { ok: true };
  }

  if (action === "reorder_images") {
    const productId = textValue(body.product_id, 80);
    const imageIds = Array.isArray(body.image_ids)
      ? body.image_ids.map((id) => textValue(id, 80)).filter(Boolean)
      : [];

    if (!productId || !imageIds.length) {
      throw new Error("ترتيب الصور غير صحيح.");
    }

    const { data: rows, error: rowsError } = await adminClient
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .in("id", imageIds);

    if (rowsError) throw rowsError;
    if ((rows || []).length !== imageIds.length) {
      throw new Error("بعض الصور لا تنتمي لهذا المنتج.");
    }

    for (let index = 0; index < imageIds.length; index += 1) {
      const { error } = await adminClient
        .from("product_images")
        .update({ sort_order: index })
        .eq("id", imageIds[index]);
      if (error) throw error;
    }

    return { ok: true };
  }

  throw new Error("عملية غير معروفة.");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!(await authorize(request))) {
      return json({ error: "رمز لوحة الإدارة غير صحيح." }, 401);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const result = await handleAction(action, body);

    return json({ ok: true, ...result });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تنفيذ العملية.",
      },
      400,
    );
  }
});
