const test = require('node:test');
const assert = require('node:assert/strict');
const { mapRemoteProduct, mapRemotePromotion, mapRemoteOrder } = require('../js/remote-mappers');

test('maps the live Supabase product schema including compare-at price and variants', () => {
  const product = mapRemoteProduct({
    id: 'p1',
    slug: 'shirt',
    name_en: 'Shirt',
    name_ar: 'قميص',
    description_en: 'desc',
    description_ar: 'وصف',
    category_id: 'c1',
    price: 300,
    compare_at_price: 350,
    is_active: true,
    product_images: [{ id: 'i1', product_id: 'p1', url: '/shirt.jpg', alt_en: '', alt_ar: '', sort_order: 0 }],
    product_variants: [{ id: 'v1', product_id: 'p1', size: 'M', color: 'Black', sku: 'SH-M-B', stock: 4, price_override: 320, is_active: true }]
  });
  assert.equal(product.salePrice, 300);
  assert.equal(product.price, 350);
  assert.equal(product.images[0], '/shirt.jpg');
  assert.equal(product.variants[0].size, 'M');
  assert.equal(product.variants[0].color.name.en, 'Black');
  assert.equal(product.variants[0].stock, 4);
  assert.equal(product.variants[0].price, 320);
});

test('maps live promotions with new targeting and usage fields', () => {
  const promo = mapRemotePromotion({
    id: 'p1',
    code: 'SAVE10',
    title_en: 'Save 10%',
    title_ar: 'خصم 10%',
    discount_type: 'percentage',
    discount_value: 10,
    scope: 'category',
    target_ids: ['c1'],
    min_order_amount: 500,
    max_discount: 100,
    usage_limit: 20,
    used_count: 3,
    priority: 5,
    is_active: true,
    starts_at: null,
    ends_at: null
  });
  assert.equal(promo.scope, 'category');
  assert.deepEqual(promo.targetIds, ['c1']);
  assert.equal(promo.minOrder, 500);
  assert.equal(promo.usageLimit, 20);
  assert.equal(promo.usedCount, 3);
});

test('maps live orders from normalized order_items columns', () => {
  const order = mapRemoteOrder({
    id: 'o1',
    order_number: 'EG-1',
    customer_id: 'c1',
    customer_name: 'Customer',
    customer_phone: '01000000000',
    customer_address: 'Cairo',
    payment_method: 'cash_on_delivery',
    status: 'pending',
    subtotal: 600,
    discount: 60,
    promotion_code: 'SAVE10',
    delivery_fee: 60,
    total: 600,
    created_at: '2026-10-05T10:00:00Z',
    order_items: [{
      id: 'oi1',
      product_id: 'p1',
      variant_id: 'v1',
      product_name_en: 'Shirt',
      product_name_ar: 'قميص',
      size: 'M',
      color: 'Black',
      unit_price: 300,
      quantity: 2,
      total: 600
    }],
    order_events: [{ status: 'pending', created_at: '2026-10-05T10:00:00Z', note: '' }]
  });
  assert.equal(order.discount, 60);
  assert.equal(order.promotionCode, 'SAVE10');
  assert.equal(order.items[0].lineTotal, 600);
  assert.equal(order.items[0].color.name.en, 'Black');
});
