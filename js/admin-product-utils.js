(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StoreAdminProduct = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function normalizeVariantSavePayload(variants) {
    return (variants || []).map(function (item) {
      return {
        id: item && item.id ? String(item.id) : null,
        sku: item && item.sku || '',
        size: item && item.size || null,
        color: item && item.color && item.color.name ? item.color.name.en || item.color.name.ar : item && item.color || null,
        price_override: item && item.price == null ? null : Number(item && item.price),
        stock: Math.max(0, Number(item && item.stock || 0)),
        is_active: item ? item.active !== false : true
      };
    });
  }

  return { normalizeVariantSavePayload };
});
