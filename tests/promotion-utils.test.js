const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePromotion,
  promotionIsEligible,
  calculatePromotionDiscount,
  chooseBestPromotion,
} = require('../js/promotion-utils');

test('normalizes and caps percentage discounts', () => {
  const promotion = normalizePromotion({
    code: ' summer10 ',
    type: 'percentage',
    value: 10,
    maxDiscount: 80
  });
  assert.equal(promotion.code, 'SUMMER10');
  assert.equal(calculatePromotionDiscount(promotion, 1000), 80);
  assert.equal(calculatePromotionDiscount(promotion, 500), 50);
});

test('rejects promotions below the minimum order amount', () => {
  const promotion = normalizePromotion({ code: 'SAVE50', type: 'fixed', value: 50, minOrder: 500 });
  assert.equal(promotionIsEligible(promotion, { subtotal: 499 }), false);
  assert.equal(promotionIsEligible(promotion, { subtotal: 500 }), true);
});

test('supports global, category and product targeting', () => {
  const base = { type: 'percentage', value: 20, active: true };
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, scope: 'global' }), { subtotal: 100 }), true);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, scope: 'category', targetIds: ['cat-1'] }), { subtotal: 100, categoryIds: ['cat-1'] }), true);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, scope: 'category', targetIds: ['cat-1'] }), { subtotal: 100, categoryIds: ['cat-2'] }), false);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, scope: 'product', targetIds: ['prod-1'] }), { subtotal: 100, productIds: ['prod-2'] }), false);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, scope: 'product', targetIds: ['prod-1'] }), { subtotal: 100, productIds: ['prod-1'] }), true);
});

test('blocks expired, future, inactive and exhausted promotions', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  const base = { code: 'SALE', type: 'percentage', value: 10, active: true };
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, endsAt: '2026-10-04T12:00:00Z' }), { subtotal: 100, now }), false);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, startsAt: '2026-10-06T12:00:00Z' }), { subtotal: 100, now }), false);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, active: false }), { subtotal: 100, now }), false);
  assert.equal(promotionIsEligible(normalizePromotion({ ...base, usageLimit: 3, usedCount: 3 }), { subtotal: 100, now }), false);
});

test('applies percentage and fixed discounts without exceeding subtotal', () => {
  assert.equal(calculatePromotionDiscount(normalizePromotion({ type: 'percentage', value: 25 }), 800), 200);
  assert.equal(calculatePromotionDiscount(normalizePromotion({ type: 'fixed', value: 1000 }), 800), 800);
});

test('selects the highest-priority eligible automatic promotion', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  const low = normalizePromotion({ type: 'percentage', value: 20, priority: 5, scope: 'global', active: true });
  const high = normalizePromotion({ type: 'fixed', value: 250, priority: 10, scope: 'global', active: true });
  const result = chooseBestPromotion([low, high], { subtotal: 1000, now, requireCode: false });
  assert.equal(result.id, high.id);
});
