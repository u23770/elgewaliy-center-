(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StorePromotionUtils = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function trimUpper(value) { return String(value == null ? '' : value).trim().toUpperCase(); }
  function normalizeIds(value) { return Array.isArray(value) ? value.filter(Boolean).map(String) : []; }
  function finiteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizePromotion(input) {
    const source = input || {};
    const type = source.type === 'fixed' ? 'fixed' : 'percentage';
    const scope = ['global', 'category', 'product'].includes(source.scope) ? source.scope : 'global';
    const value = Math.max(0, finiteNumber(source.value, 0));
    const maxDiscount = source.maxDiscount == null || source.maxDiscount === '' ? null : Math.max(0, finiteNumber(source.maxDiscount, 0));
    const minOrder = Math.max(0, finiteNumber(source.minOrder, 0));
    const usageLimit = source.usageLimit == null || source.usageLimit === '' ? null : Math.max(0, Math.floor(finiteNumber(source.usageLimit, 0)));
    const usedCount = Math.max(0, Math.floor(finiteNumber(source.usedCount, 0)));
    const priority = Math.floor(finiteNumber(source.priority, 0));
    const targetIds = normalizeIds(source.targetIds);
    const code = trimUpper(source.code);
    const title = source.title || { en: '', ar: '' };
    const safeValue = type === 'percentage' ? Math.min(value, 100) : value;
    return {
      id: source.id || ('promo-' + (code || scope + '-' + priority)),
      code,
      title: { en: String(title.en || source.titleEn || ''), ar: String(title.ar || source.titleAr || '') },
      type,
      scope,
      value: safeValue,
      maxDiscount,
      minOrder,
      usageLimit,
      usedCount,
      priority,
      targetIds,
      active: source.active !== false,
      startsAt: source.startsAt || null,
      endsAt: source.endsAt || null
    };
  }

  function withinSchedule(promotion, now) {
    const at = now instanceof Date ? now.getTime() : new Date(now || Date.now()).getTime();
    if (!Number.isFinite(at)) return false;
    if (promotion.startsAt && new Date(promotion.startsAt).getTime() > at) return false;
    if (promotion.endsAt && new Date(promotion.endsAt).getTime() <= at) return false;
    return true;
  }

  function targetsContext(promotion, context) {
    if (promotion.scope === 'global') return true;
    const key = promotion.scope === 'category' ? 'categoryIds' : 'productIds';
    const actual = normalizeIds(context && context[key]);
    if (!promotion.targetIds.length) return false;
    return promotion.targetIds.some((id) => actual.includes(id));
  }

  function promotionIsEligible(promotionInput, context) {
    const promotion = normalizePromotion(promotionInput);
    const ctx = context || {};
    const subtotal = Math.max(0, finiteNumber(ctx.subtotal, 0));
    if (!promotion.active || !(promotion.value > 0)) return false;
    if (!withinSchedule(promotion, ctx.now)) return false;
    if (promotion.minOrder > subtotal) return false;
    if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) return false;
    return targetsContext(promotion, ctx);
  }

  function calculatePromotionDiscount(promotionInput, eligibleSubtotal) {
    const promotion = normalizePromotion(promotionInput);
    const subtotal = Math.max(0, finiteNumber(eligibleSubtotal, 0));
    if (!(subtotal > 0)) return 0;
    let discount = promotion.type === 'percentage'
      ? subtotal * promotion.value / 100
      : Math.min(subtotal, promotion.value);
    if (promotion.maxDiscount != null) discount = Math.min(discount, promotion.maxDiscount);
    discount = Math.min(discount, subtotal);
    return Math.round(discount * 100) / 100;
  }

  function eligibleSubtotal(promotionInput, lines) {
    const promotion = normalizePromotion(promotionInput);
    const source = Array.isArray(lines) ? lines : [];
    if (promotion.scope === 'global') return source.reduce((sum, line) => sum + Math.max(0, finiteNumber(line.lineTotal, finiteNumber(line.price, 0) * finiteNumber(line.quantity, 0))), 0);
    const key = promotion.scope === 'category' ? 'categoryId' : 'productId';
    return source.reduce((sum, line) => {
      if (!promotion.targetIds.includes(String(line[key] || ''))) return sum;
      const lineTotal = finiteNumber(line.lineTotal, finiteNumber(line.price, 0) * finiteNumber(line.quantity, 0));
      return sum + Math.max(0, lineTotal);
    }, 0);
  }

  function chooseBestPromotion(promotions, context) {
    const ctx = context || {};
    const requireCode = ctx.requireCode === true;
    const requestedCode = trimUpper(ctx.code);
    const candidates = (promotions || []).map(normalizePromotion).filter((promotion) => {
      if (requireCode) {
        if (!requestedCode || promotion.code !== requestedCode) return false;
      } else if (requestedCode && promotion.code && promotion.code !== requestedCode) {
        return false;
      } else if (requestedCode && !promotion.code) {
        return false;
      } else if (!requestedCode && promotion.code) {
        return false;
      }
      return promotionIsEligible(promotion, ctx);
    });
    candidates.sort((a, b) => b.priority - a.priority || b.value - a.value || a.id.localeCompare(b.id));
    return candidates[0] || null;
  }

  return {
    normalizePromotion,
    promotionIsEligible,
    calculatePromotionDiscount,
    eligibleSubtotal,
    chooseBestPromotion
  };
});
