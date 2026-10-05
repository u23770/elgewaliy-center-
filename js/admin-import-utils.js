/* Pure spreadsheet normalization and product import planning.
 * Works in the browser and under Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StoreAdminImport = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FIELD_ALIASES = {
    nameEn: ['product name en', 'product name', 'name en', 'name', 'title en', 'title'],
    nameAr: ['product name ar', 'name ar', 'title ar', 'اسم المنتج عربي', 'اسم المنتج بالعربية', 'الاسم عربي', 'اسم المنتج'],
    descriptionEn: ['description en', 'description', 'details en', 'description english'],
    descriptionAr: ['description ar', 'الوصف عربي', 'الوصف بالعربية', 'الوصف'],
    category: ['category', 'category name', 'collection', 'department', 'القسم', 'التصنيف', 'الفئة'],
    price: ['price', 'regular price', 'base price', 'السعر', 'السعر الاساسي', 'السعر الأساسي'],
    salePrice: ['sale price', 'discounted price', 'offer price', 'سعر الخصم', 'السعر بعد الخصم', 'سعر العرض'],
    sku: ['sku', 'product sku', 'item code', 'product code', 'كود المنتج', 'كود'],
    slug: ['slug', 'product slug', 'الرابط'],
    stock: ['stock', 'quantity', 'qty', 'inventory', 'المخزون', 'الكمية'],
    variantSku: ['variant sku', 'option sku', 'variant code', 'كود المتغير', 'كود المقاس'],
    size: ['size', 'sizes', 'المقاس', 'مقاس', 'الحجم'],
    color: ['color', 'colour', 'اللون', 'لون'],
    colorEn: ['color en', 'colour en', 'color name en', 'colour name en', 'اللون انجليزي', 'اسم اللون انجليزي'],
    colorAr: ['color ar', 'colour ar', 'color name ar', 'colour name ar', 'اللون عربي', 'اسم اللون عربي'],
    colorHex: ['color hex', 'hex', 'colour hex', 'hex color', 'كود اللون'],
    variantPrice: ['variant price', 'option price', 'price override', 'سعر المتغير', 'سعر المقاس'],
    variantStock: ['variant stock', 'variant quantity', 'option stock', 'مخزون المتغير', 'مخزون المقاس'],
    image: ['image url', 'image', 'images', 'photo', 'photo url', 'product image', 'رابط الصورة', 'الصورة', 'صور'],
    active: ['active', 'enabled', 'visible', 'متاح', 'فعال', 'ظاهر'],
    featured: ['featured', 'highlight', 'مميز', 'منتج مميز']
  };

  const normal = (value) => String(value == null ? '' : value)
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFKC')
    .replace(/\p{M}/gu, '')
    .replace(/[()[\]{}:_\-/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  function normalizeHeader(value) {
    return normal(value);
  }

  function inferColumnMapping(headers) {
    const result = {};
    const list = Array.from(headers || []);
    Object.keys(FIELD_ALIASES).forEach((field) => {
      const aliases = FIELD_ALIASES[field].map(normal);
      let best = null;
      list.forEach((header, index) => {
        const key = normal(header);
        if (!key) return;
        const exact = aliases.indexOf(key);
        if (exact >= 0) {
          const score = 1000 - exact * 2 - index / 10000;
          if (!best || score > best.score) best = { header, score };
          return;
        }
        const fuzzyIndex = aliases.findIndex((alias) => alias && (key.includes(alias) || alias.includes(key)));
        if (fuzzyIndex >= 0) {
          const score = 100 - fuzzyIndex * 2 - Math.abs(key.length - aliases[fuzzyIndex].length);
          if (!best || score > best.score) best = { header, score };
        }
      });
      if (best) result[field] = best.header;
    });
    return result;
  }

  function splitList(value) {
    return String(value == null ? '' : value)
      .split(/[|,\n;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseBoolean(value) {
    if (value === true || value === false) return value;
    const v = normal(value);
    if (!v) return null;
    if (['true', '1', 'yes', 'y', 'on', 'active', 'enabled', 'visible', 'نعم', 'اه', 'أيوه', 'متاح', 'فعال', 'ظاهر'].includes(v)) return true;
    if (['false', '0', 'no', 'n', 'off', 'inactive', 'disabled', 'hidden', 'لا', 'لأ', 'غير متاح', 'غير فعال', 'مخفي'].includes(v)) return false;
    return null;
  }

  function slugify(value) {
    const raw = String(value == null ? '' : value).trim();
    const ascii = raw.normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    if (ascii) return ascii;
    const code = Array.from(raw).map((char) => char.codePointAt(0).toString(16)).join('');
    return 'product-' + (code || Date.now().toString(36)).slice(0, 48);
  }

  function valueFrom(row, mapping, key) {
    const header = mapping && mapping[key];
    return header ? row[header] : '';
  }

  function numberFrom(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const cleaned = String(value == null ? '' : value).replace(/[, ]/g, '');
    return cleaned === '' ? NaN : Number(cleaned);
  }

  function normalizeIdentity(value) {
    return normal(value).replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
  }

  function categoryMatch(input, category) {
    const candidates = [
      category.id, category.slug,
      category.name && category.name.en,
      category.name && category.name.ar,
      category.name_en, category.name_ar
    ].filter(Boolean).map(normalizeIdentity);
    return candidates.includes(normalizeIdentity(input));
  }

  function findCategoryId(value, categories) {
    const target = String(value == null ? '' : value).trim();
    if (!target) return '';
    const match = (categories || []).find((category) => categoryMatch(target, category));
    return match ? match.id : '';
  }

  function productIdentity(row, mapping) {
    const sku = String(valueFrom(row, mapping, 'sku') || '').trim();
    if (sku) return 'sku:' + normalizeIdentity(sku);
    const en = String(valueFrom(row, mapping, 'nameEn') || '').trim();
    const ar = String(valueFrom(row, mapping, 'nameAr') || '').trim();
    return 'name:' + normalizeIdentity(en || ar);
  }

  function existingMatch(product, existingProducts) {
    const sku = normalizeIdentity(product.sku);
    const en = normalizeIdentity(product.name.en);
    const ar = normalizeIdentity(product.name.ar);
    return (existingProducts || []).find((candidate) =>
      sku && normalizeIdentity(candidate.sku) === sku ||
      en && candidate.name && normalizeIdentity(candidate.name.en) === en ||
      ar && candidate.name && normalizeIdentity(candidate.name.ar) === ar
    ) || null;
  }

  function addUniqueCatalogSize(size, catalogAdds, existingSizes) {
    if (!size) return;
    const exists = (existingSizes || []).some((item) => normalizeIdentity(item.label) === normalizeIdentity(size));
    const pending = catalogAdds.sizes.some((item) => normalizeIdentity(item.label) === normalizeIdentity(size));
    if (!exists && !pending) catalogAdds.sizes.push({ label: size, order: catalogAdds.sizes.length * 10, active: true });
  }

  function addUniqueCatalogColor(color, catalogAdds, existingColors) {
    if (!color) return;
    const exists = (existingColors || []).some((item) =>
      normalizeIdentity(item.key || item.name?.en || item.name?.ar) === normalizeIdentity(color.key)
    );
    const pending = catalogAdds.colors.some((item) => normalizeIdentity(item.key) === normalizeIdentity(color.key));
    if (!exists && !pending) catalogAdds.colors.push(color);
  }

  function buildImportPlan(rows, mapping, options) {
    const opts = Object.assign({
      categories: [],
      existingProducts: [],
      existingSizes: [],
      existingColors: [],
      mode: 'add_update'
    }, options || {});
    const errors = [];
    const warnings = [];
    const groups = new Map();
    const catalogAdds = { sizes: [], colors: [] };

    Array.from(rows || []).forEach((row, index) => {
      const rowNumber = index + 2;
      if (!Object.values(row || {}).some((value) => String(value == null ? '' : value).trim() !== '')) return;
      const nameEn = String(valueFrom(row, mapping, 'nameEn') || '').trim();
      const nameAr = String(valueFrom(row, mapping, 'nameAr') || '').trim();
      const key = productIdentity(row, mapping);
      if (key.endsWith('name:')) {
        errors.push({ row: rowNumber, message: 'Product name is missing.' });
        return;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ row, rowNumber, nameEn, nameAr });
    });

    const items = [];
    const seenSkus = new Set();

    groups.forEach((group) => {
      const first = group[0].row;
      const firstRow = group[0].rowNumber;
      let valid = true;
      const nameEn = group.map((item) => item.nameEn).find(Boolean) || '';
      const nameAr = group.map((item) => item.nameAr).find(Boolean) || nameEn;

      if (nameEn.length < 2 && nameAr.length < 2) {
        errors.push({ row: firstRow, message: 'Product name must be at least 2 characters.' });
        return;
      }

      const price = numberFrom(valueFrom(first, mapping, 'price'));
      if (!(price > 0)) {
        errors.push({ row: firstRow, message: 'Price must be greater than 0.' });
        return;
      }

      const rawSale = valueFrom(first, mapping, 'salePrice');
      const salePrice = rawSale === '' || rawSale == null ? null : numberFrom(rawSale);
      if (salePrice != null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) {
        errors.push({ row: firstRow, message: 'Sale price must be lower than the regular price.' });
        return;
      }

      let sku = String(valueFrom(first, mapping, 'sku') || '').trim().toUpperCase();
      if (!sku) {
        sku = 'AUTO-' + slugify(nameEn || nameAr).toUpperCase() + '-' + firstRow;
        warnings.push({ row: firstRow, message: 'SKU was generated automatically: ' + sku });
      }
      if (seenSkus.has(sku)) {
        errors.push({ row: firstRow, message: 'Duplicate SKU inside the spreadsheet: ' + sku });
        return;
      }
      seenSkus.add(sku);

      const categoryValue = valueFrom(first, mapping, 'category');
      const categoryId = findCategoryId(categoryValue, opts.categories);
      if (String(categoryValue || '').trim() && !categoryId) {
        errors.push({ row: firstRow, message: 'Category was not found: ' + categoryValue });
        return;
      }

      const existing = existingMatch({ sku, name: { en: nameEn, ar: nameAr } }, opts.existingProducts);
      if (existing && opts.mode === 'add_new') {
        errors.push({ row: firstRow, message: 'Product already exists: ' + sku });
        return;
      }
      if (!existing && opts.mode === 'update_only') {
        errors.push({ row: firstRow, message: 'Product does not exist and update-only mode is enabled: ' + sku });
        return;
      }

      const product = {
        id: existing ? existing.id : '',
        name: { en: nameEn, ar: nameAr },
        description: {
          en: String(valueFrom(first, mapping, 'descriptionEn') || '').trim(),
          ar: String(valueFrom(first, mapping, 'descriptionAr') || '').trim()
        },
        categoryId,
        price,
        salePrice,
        sku,
        slug: String(valueFrom(first, mapping, 'slug') || '').trim() || slugify(nameEn || nameAr),
        active: parseBoolean(valueFrom(first, mapping, 'active')) ?? true,
        featured: parseBoolean(valueFrom(first, mapping, 'featured')) ?? false,
        stock: 0,
        images: [],
        variants: []
      };

      const variantKeys = new Set();
      let hasVariant = false;

      group.forEach(({ row, rowNumber }) => {
        splitList(valueFrom(row, mapping, 'image')).forEach((url) => {
          if (!product.images.includes(url)) product.images.push(url);
        });

        const size = String(valueFrom(row, mapping, 'size') || '').trim();
        const colorRaw = String(valueFrom(row, mapping, 'color') || '').trim();
        const colorEn = String(valueFrom(row, mapping, 'colorEn') || '').trim();
        const colorAr = String(valueFrom(row, mapping, 'colorAr') || '').trim();
        const colorHex = String(valueFrom(row, mapping, 'colorHex') || '').trim();
        const colorName = colorEn || colorAr || colorRaw;
        if (!size && !colorName) {
          const rawStock = valueFrom(row, mapping, 'stock');
          if (rawStock !== '' && rawStock != null) {
            const simpleStock = numberFrom(rawStock);
            if (Number.isFinite(simpleStock) && simpleStock >= 0) product.stock = Math.floor(simpleStock);
            else {
              valid = false;
              errors.push({ row: rowNumber, message: 'Stock must be a non-negative number.' });
            }
          }
          return;
        }

        hasVariant = true;
        const key = normalizeIdentity(size) + '|' + normalizeIdentity(colorRaw || colorEn || colorAr);
        if (variantKeys.has(key)) {
          valid = false;
          errors.push({ row: rowNumber, message: 'Duplicate variant for the product (same size/colour).' });
          return;
        }
        variantKeys.add(key);

        const variantStockRaw = valueFrom(row, mapping, 'variantStock');
        const stockRaw = variantStockRaw === '' || variantStockRaw == null ? valueFrom(row, mapping, 'stock') : variantStockRaw;
        const variantStock = stockRaw === '' || stockRaw == null ? 0 : numberFrom(stockRaw);
        if (!Number.isFinite(variantStock) || variantStock < 0) {
          valid = false;
          errors.push({ row: rowNumber, message: 'Variant stock must be a non-negative number.' });
          return;
        }

        const variantPriceRaw = valueFrom(row, mapping, 'variantPrice');
        const variantPrice = variantPriceRaw === '' || variantPriceRaw == null ? null : numberFrom(variantPriceRaw);
        if (variantPrice != null && (!Number.isFinite(variantPrice) || variantPrice < 0)) {
          valid = false;
          errors.push({ row: rowNumber, message: 'Variant price must be zero or greater.' });
          return;
        }

        const keyName = colorRaw || colorEn || colorAr;
        const colorKey = normalizeIdentity(keyName) || ('color-' + rowNumber);
        const color = colorName ? {
          key: colorKey,
          name: { en: colorEn || colorRaw || colorAr, ar: colorAr || colorRaw || colorEn },
          hex: /^#[0-9a-f]{6}$/i.test(colorHex) ? colorHex : '#777e60'
        } : null;

        const variant = {
          id: '',
          sku: String(valueFrom(row, mapping, 'variantSku') || '').trim().toUpperCase(),
          size,
          color,
          stock: Math.floor(variantStock),
          price: variantPrice,
          active: parseBoolean(valueFrom(row, mapping, 'active')) ?? true
        };

        if (!variant.sku) {
          const suffix = [size, colorKey].filter(Boolean).map(slugify).join('-').toUpperCase();
          variant.sku = (sku + (suffix ? '-' + suffix : '-' + rowNumber)).slice(0, 80);
        }

        product.variants.push(variant);
        addUniqueCatalogSize(size, catalogAdds, opts.existingSizes);
        addUniqueCatalogColor(color, catalogAdds, opts.existingColors);
      });

      if (!valid) return;
      if (hasVariant) product.stock = 0;
      if (existing) warnings.push({ row: firstRow, message: 'Existing product will be updated: ' + sku });
      items.push(product);
    });

    return {
      items,
      errors,
      warnings,
      catalogAdds,
      stats: {
        rows: Array.from(rows || []).filter((row) => Object.values(row || {}).some((value) => String(value == null ? '' : value).trim() !== '')).length,
        products: items.length,
        variants: items.reduce((sum, item) => sum + item.variants.length, 0),
        updates: items.filter((item) => Boolean(item.id)).length,
        creates: items.filter((item) => !item.id).length
      }
    };
  }

  return { normalizeHeader, inferColumnMapping, splitList, parseBoolean, buildImportPlan };
});
