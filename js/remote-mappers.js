(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StoreRemoteMappers = factory(root.Store);
})(typeof window !== 'undefined' ? window : globalThis, function (Store) {
  'use strict';

  function number(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
  function colorObject(value) {
    const text = String(value || '').trim();
    return text ? { key: text.toLowerCase().replace(/\s+/g, '-'), name: { en: text, ar: text }, hex: Store && Store.safeColor ? Store.safeColor('') : '#777e60' } : null;
  }

  function mapRemoteProduct(row) {
    const compareAt = row.compare_at_price == null ? null : number(row.compare_at_price, 0);
    const basePrice = number(row.price, 0);
    const variants = (row.product_variants || []).map(function (variant) {
      const color = colorObject(variant.color);
      return {
        id: variant.id,
        sku: variant.sku || '',
        size: variant.size || '',
        color: color,
        stock: Math.max(0, number(variant.stock, 0)),
        price: variant.price_override == null ? null : number(variant.price_override, 0),
        active: variant.is_active !== false
      };
    });
    return {
      id: row.id,
      slug: row.slug,
      name: { en: row.name_en, ar: row.name_ar },
      description: { en: row.description_en || '', ar: row.description_ar || '' },
      categoryId: row.category_id || '',
      images: (row.product_images || []).sort(function (a, b) { return number(a.sort_order) - number(b.sort_order); }).map(function (image) { return image.url; }),
      price: compareAt != null && compareAt > basePrice ? compareAt : basePrice,
      salePrice: compareAt != null && compareAt > basePrice ? basePrice : null,
      sku: row.sku || '',
      active: row.is_active !== false,
      featured: Boolean(row.is_featured),
      stock: Math.max(0, number(row.stock_quantity, 0)),
      variants: variants
    };
  }

  function mapRemotePromotion(row) {
    return {
      id: row.id,
      code: row.code || '',
      title: { en: row.title_en || '', ar: row.title_ar || '' },
      type: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
      value: number(row.discount_value),
      scope: row.scope || 'global',
      targetIds: Array.isArray(row.target_ids) ? row.target_ids : [],
      minOrder: number(row.min_order_amount),
      maxDiscount: row.max_discount == null ? null : number(row.max_discount),
      usageLimit: row.usage_limit == null ? null : number(row.usage_limit),
      usedCount: number(row.used_count),
      priority: Math.floor(number(row.priority)),
      active: row.is_active !== false,
      startsAt: row.starts_at || '',
      endsAt: row.ends_at || ''
    };
  }

  function mapRemoteOrder(row) {
    const lines = (row.order_items || []).map(function (item) {
      return {
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id || '',
        name: { en: item.product_name_en || '', ar: item.product_name_ar || '' },
        image: '',
        sku: '',
        size: item.size || '',
        color: colorObject(item.color),
        quantity: number(item.quantity),
        price: number(item.unit_price),
        lineTotal: number(item.total)
      };
    });
    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.customer_id || '',
      customer: { name: row.customer_name, email: '', phone: row.customer_phone },
      address: { governorate: '', area: '', address: row.customer_address || '', notes: row.notes || '' },
      paymentMethod: row.payment_method,
      status: row.status,
      subtotal: number(row.subtotal),
      discount: number(row.discount),
      promotionCode: row.promotion_code || '',
      deliveryFee: number(row.delivery_fee),
      total: number(row.total),
      items: lines,
      createdAt: row.created_at,
      events: (row.order_events || []).map(function (event) { return { status: event.status, at: event.created_at, note: event.note || '' }; })
    };
  }

  return { mapRemoteProduct, mapRemotePromotion, mapRemoteOrder };
});
