const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inferColumnMapping,
  buildImportPlan,
  normalizeHeader,
  splitList,
  parseBoolean,
} = require('../js/admin-import-utils');

test('normalizes common spreadsheet headers', () => {
  assert.equal(normalizeHeader(' Product Name (AR) '), 'product name ar');
  assert.equal(normalizeHeader('اسم المنتج'), 'اسم المنتج');
  assert.equal(normalizeHeader('\ufeffSKU'), 'sku');
});

test('infers Arabic and English product columns', () => {
  const mapping = inferColumnMapping([
    'Product Name', 'اسم المنتج', 'Category', 'السعر', 'Sale Price',
    'SKU', 'Color', 'اللون', 'Size', 'المقاس', 'Stock', 'Variant SKU',
    'Variant Stock', 'Image URL'
  ]);
  assert.equal(mapping.nameEn, 'Product Name');
  assert.equal(mapping.nameAr, 'اسم المنتج');
  assert.equal(mapping.category, 'Category');
  assert.equal(mapping.price, 'السعر');
  assert.equal(mapping.salePrice, 'Sale Price');
  assert.equal(mapping.sku, 'SKU');
  assert.equal(mapping.color, 'Color');
  assert.equal(mapping.size, 'المقاس');
  assert.equal(mapping.stock, 'Stock');
  assert.equal(mapping.variantSku, 'Variant SKU');
  assert.equal(mapping.variantStock, 'Variant Stock');
  assert.equal(mapping.image, 'Image URL');
});

test('groups repeated spreadsheet rows into one product with variants', () => {
  const rows = [
    { Name: 'Classic Tee', 'الاسم': 'تيشيرت كلاسيك', Category: 'Men', Price: '450', SKU: 'TEE-01', Color: 'Black', Size: 'M', 'Variant Stock': '4', 'Image URL': 'a.jpg' },
    { Name: 'Classic Tee', 'الاسم': 'تيشيرت كلاسيك', Category: 'Men', Price: '450', SKU: 'TEE-01', Color: 'Black', Size: 'L', 'Variant Stock': '3', 'Image URL': 'b.jpg' },
    { Name: 'Classic Tee', 'الاسم': 'تيشيرت كلاسيك', Category: 'Men', Price: '450', SKU: 'TEE-01', Color: 'White', Size: 'M', 'Variant Stock': '2', 'Image URL': 'a.jpg' },
  ];
  const mapping = {
    nameEn: 'Name', nameAr: 'الاسم', category: 'Category', price: 'Price',
    salePrice: null, sku: 'SKU', color: 'Color', size: 'Size',
    stock: null, variantSku: null, variantStock: 'Variant Stock',
    image: 'Image URL'
  };
  const result = buildImportPlan(rows, mapping, {
    categories: [{ id: 'cat-1', slug: 'men', name: { en: 'Men', ar: 'رجالي' } }],
    existingProducts: [],
    mode: 'add_update'
  });
  assert.equal(result.errors.length, 0);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].variants.length, 3);
  assert.equal(result.items[0].categoryId, 'cat-1');
  assert.deepEqual(result.items[0].images.sort(), ['a.jpg', 'b.jpg']);
});

test('flags duplicate variants instead of silently merging them', () => {
  const rows = [
    { Name: 'Tee', Category: 'Men', Price: '300', SKU: 'T-1', Color: 'Black', Size: 'M', Stock: '2' },
    { Name: 'Tee', Category: 'Men', Price: '300', SKU: 'T-1', Color: 'Black', Size: 'M', Stock: '3' },
  ];
  const mapping = { nameEn: 'Name', category: 'Category', price: 'Price', sku: 'SKU', color: 'Color', size: 'Size', stock: 'Stock' };
  const result = buildImportPlan(rows, mapping, {
    categories: [{ id: 'cat-1', slug: 'men', name: { en: 'Men', ar: 'رجالي' } }],
    existingProducts: [],
    mode: 'add_update'
  });
  assert.ok(result.errors.some((x) => /duplicate variant/i.test(x.message)));
  assert.equal(result.items.length, 0);
});

test('respects explicit add-new mode for an existing SKU', () => {
  const rows = [{ Name: 'Tee', Category: 'Men', Price: '300', SKU: 'T-1', Stock: '7' }];
  const mapping = { nameEn: 'Name', category: 'Category', price: 'Price', sku: 'SKU', stock: 'Stock' };
  const result = buildImportPlan(rows, mapping, {
    categories: [{ id: 'cat-1', slug: 'men', name: { en: 'Men', ar: 'رجالي' } }],
    existingProducts: [{ id: 'p-1', sku: 'T-1', name: { en: 'Old Tee', ar: 'تي' } }],
    mode: 'add_new'
  });
  assert.ok(result.errors.some((x) => /already exists/i.test(x.message)));
  assert.equal(result.items.length, 0);
});

test('maps an existing SKU to update in add-update mode', () => {
  const rows = [{ Name: 'Tee', Category: 'Men', Price: '320', SKU: 'T-1', Stock: '8' }];
  const mapping = { nameEn: 'Name', category: 'Category', price: 'Price', sku: 'SKU', stock: 'Stock' };
  const result = buildImportPlan(rows, mapping, {
    categories: [{ id: 'cat-1', slug: 'men', name: { en: 'Men', ar: 'رجالي' } }],
    existingProducts: [{ id: 'p-1', sku: 'T-1', name: { en: 'Old Tee', ar: 'تي' } }],
    mode: 'add_update'
  });
  assert.equal(result.errors.length, 0);
  assert.equal(result.items[0].id, 'p-1');
  assert.equal(result.items[0].price, 320);
});

test('rejects invalid sale prices', () => {
  const rows = [{ Name: 'Tee', Category: 'Men', Price: '300', Sale: '350', SKU: 'T-1', Stock: '2' }];
  const mapping = { nameEn: 'Name', category: 'Category', price: 'Price', salePrice: 'Sale', sku: 'SKU', stock: 'Stock' };
  const result = buildImportPlan(rows, mapping, {
    categories: [{ id: 'cat-1', slug: 'men', name: { en: 'Men', ar: 'رجالي' } }],
    existingProducts: [],
    mode: 'add_update'
  });
  assert.ok(result.errors.some((x) => /sale price/i.test(x.message)));
});

test('supports comma/pipe/line-separated lists and boolean parsing', () => {
  assert.deepEqual(splitList('a.jpg, b.jpg|c.jpg\nd.jpg'), ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  assert.equal(parseBoolean('yes'), true);
  assert.equal(parseBoolean('لا'), false);
  assert.equal(parseBoolean('something'), null);
});

test('generates a unique safe slug for Arabic-only product names', () => {
  const rows = [{ 'اسم المنتج': 'تيشيرت شباب', 'السعر': '400' }];
  const mapping = { nameAr: 'اسم المنتج', price: 'السعر' };
  const result = buildImportPlan(rows, mapping, { categories: [], existingProducts: [], mode: 'add_update' });
  assert.equal(result.errors.length, 0);
  assert.match(result.items[0].slug, /^product-[0-9a-f]+$/);
});
