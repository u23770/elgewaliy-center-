(function (Store) {
  const allowedStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  const remoteMappers = (typeof window !== 'undefined' && window.StoreRemoteMappers) || null;
  function slugify(value) { return String(value || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece-' + Date.now().toString(36); }
  function currentData() { return Store.storage.state(); }
  function saveData(mutator) { return Store.storage.updateState(mutator); }
  function findCategory(categoryId, data) { return data.categories.find(function (item) { return item.id === categoryId || item.slug === categoryId; }); }
  function productText(product) { return [product.name && product.name.en, product.name && product.name.ar, product.sku, product.description && product.description.en, product.description && product.description.ar].join(' ').toLowerCase(); }
  function activeVariants(product) { return (product.variants || []).filter(function (variant) { return variant.active !== false; }); }
  function effectivePrice(product, variant) { return Number(variant && variant.price || product.salePrice || product.price || 0); }
  function availableStock(product, variant) { return variant ? Math.max(0, Number(variant.stock || 0)) : Math.max(0, Number(product.stock || 0)); }
  function normalizePhone(value) { return String(value || '').replace(/\D/g, '').slice(-10); }
  function mapCategory(row) { return { id: row.id, slug: row.slug, name: { en: row.name_en, ar: row.name_ar }, description: { en: row.description_en || '', ar: row.description_ar || '' }, image: row.image_url || '', parentId: row.parent_id || '', active: row.is_active !== false, order: row.sort_order || 0 }; }
  function mapProduct(row) { return remoteMappers ? remoteMappers.mapRemoteProduct(row) : { id: row.id, slug: row.slug, name: { en: row.name_en, ar: row.name_ar }, description: { en: row.description_en || '', ar: row.description_ar || '' }, categoryId: row.category_id || '', images: (row.product_images || []).map(function (image) { return image.url || image.image_url; }), price: Number(row.price), salePrice: row.sale_price == null ? null : Number(row.sale_price), sku: row.sku || '', active: row.is_active !== false, featured: Boolean(row.is_featured), stock: Number(row.stock_quantity || 0), variants: (row.product_variants || []).map(function (variant) { return { id: variant.id, sku: variant.sku || '', size: variant.size || variant.size_label || '', color: variant.color ? { key: String(variant.color).toLowerCase().replace(/\s+/g,'-'), name: { en: variant.color, ar: variant.color }, hex: '#777e60' } : null, stock: Number(variant.stock || 0), price: variant.price_override == null ? null : Number(variant.price_override), active: variant.is_active !== false }; }) }; }
  function mapPromotion(row) { return remoteMappers ? remoteMappers.mapRemotePromotion(row) : { id: row.id, code: row.code || '', title: { en: row.title_en, ar: row.title_ar }, type: row.discount_type === 'percentage' ? 'percentage' : 'fixed', value: Number(row.discount_value), scope: row.scope || 'global', targetIds: Array.isArray(row.target_ids) ? row.target_ids : [], minOrder: Number(row.min_order_amount || 0), maxDiscount: row.max_discount == null ? null : Number(row.max_discount), usageLimit: row.usage_limit == null ? null : Number(row.usage_limit), usedCount: Number(row.used_count || 0), priority: Number(row.priority || 0), active: row.is_active !== false, startsAt: row.starts_at || '', endsAt: row.ends_at || '' }; }
  function mapOrder(row) { return remoteMappers ? remoteMappers.mapRemoteOrder(row) : { id: row.id, orderNumber: row.order_number, userId: row.customer_id || '', customer: { name: row.customer_name, email: '', phone: row.customer_phone }, address: { address: row.customer_address || '', notes: row.notes || '' }, paymentMethod: row.payment_method, status: row.status, subtotal: Number(row.subtotal || 0), discount: Number(row.discount || 0), promotionCode: row.promotion_code || '', deliveryFee: Number(row.delivery_fee || 0), total: Number(row.total || 0), items: [], createdAt: row.created_at, events: [] }; }
  async function remoteProducts(filters) {
    const params = { select: '*,product_images(*),product_variants(*)', order: 'created_at.desc' };
    if (!(filters && filters.includeInactive)) params.is_active = 'eq.true';
    const results = await Promise.all([Store.supabase.rest('products', params), Store.supabase.rest('categories', { select: '*', is_active: 'eq.true' })]);
    let products = (results[0] || []).map(mapProduct);
    const remoteCategories = (results[1] || []).map(mapCategory);
    const data = currentData();
    products = products.map(function (product) {
      const category = remoteCategories.find(function (item) { return item.id === product.categoryId; }) || findCategory(product.categoryId, data);
      product.category = category ? category.name : { en: '', ar: '' };
      product.categorySlug = category ? category.slug : '';
      return product;
    });
    return filterProducts(products, filters || {}, data);
  }
  function filterProducts(products, filters, data) {
    let result = products.slice();
    if (filters.category) result = result.filter(function (product) { const category = findCategory(product.categoryId, data); return product.categoryId === filters.category || product.categorySlug === filters.category || category && category.slug === filters.category; });
    if (filters.q) { const query = String(filters.q).trim().toLowerCase(); result = result.filter(function (product) { return productText(product).includes(query); }); }
    if (filters.size) result = result.filter(function (product) { return activeVariants(product).some(function (variant) { return variant.size === filters.size && availableStock(product, variant) > 0; }); });
    if (filters.color) result = result.filter(function (product) { return activeVariants(product).some(function (variant) { return variant.color && variant.color.key === filters.color && availableStock(product, variant) > 0; }); });
    if (filters.inStock) result = result.filter(function (product) { return product.variants.length ? activeVariants(product).some(function (variant) { return availableStock(product, variant) > 0; }) : product.stock > 0; });
    if (filters.sale) result = result.filter(function (product) { return product.salePrice != null; });
    if (filters.min != null && filters.min !== '') result = result.filter(function (product) { return effectivePrice(product) >= Number(filters.min); });
    if (filters.max != null && filters.max !== '') result = result.filter(function (product) { return effectivePrice(product) <= Number(filters.max); });
    if (filters.featured) result = result.filter(function (product) { return product.featured; });
    if (filters.sort === 'price-low') result.sort(function (a, b) { return effectivePrice(a) - effectivePrice(b); });
    else if (filters.sort === 'price-high') result.sort(function (a, b) { return effectivePrice(b) - effectivePrice(a); });
    else if (filters.sort === 'newest') result.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
    else result.sort(function (a, b) { return Number(b.featured) - Number(a.featured); });
    return result;
  }
  const demo = {
    mode: 'demo',
    listProducts: async function (filters) { const data = currentData(); return filterProducts(data.products.filter(function (item) { return filters && filters.includeInactive || item.active; }).map(function (item) { const category = findCategory(item.categoryId, data); return Object.assign({}, item, { category: category ? category.name : { en: '', ar: '' }, categorySlug: category ? category.slug : '' }); }), filters || {}, data); },
    getProduct: async function (key) { const data = currentData(); const item = data.products.find(function (product) { return product.id === key || product.slug === key; }); if (!item || !item.active) return null; const category = findCategory(item.categoryId, data); return Object.assign({}, item, { category: category ? category.name : { en: '', ar: '' }, categorySlug: category ? category.slug : '' }); },
    listCategories: async function (includeInactive) { return currentData().categories.filter(function (item) { return includeInactive || item.active; }).sort(function (a, b) { return a.order - b.order; }); },
    saveCategory: async function (input) { let saved; saveData(function (data) { const id = input.id || Store.id(); const slug = slugify(input.slug || input.name.en); saved = Object.assign({}, input, { id: id, slug: slug, active: input.active !== false, order: Number(input.order || 0) }); const index = data.categories.findIndex(function (item) { return item.id === id; }); if (index >= 0) data.categories[index] = saved; else data.categories.push(saved); return data; }); return saved; },
    deleteCategory: async function (id) { saveData(function (data) { data.categories = data.categories.filter(function (item) { return item.id !== id; }); data.products.forEach(function (product) { if (product.categoryId === id) product.categoryId = ''; }); return data; }); },
    listSizes: async function (includeInactive) { return currentData().sizes.filter(function (item) { return includeInactive || item.active; }).sort(function (a, b) { return a.order - b.order; }); },
    saveSize: async function (input) { let saved; saveData(function (data) { const id = input.id || Store.id(); saved = Object.assign({}, input, { id: id, label: String(input.label || '').trim(), active: input.active !== false, order: Number(input.order || 0) }); const index = data.sizes.findIndex(function (item) { return item.id === id; }); if (index >= 0) data.sizes[index] = saved; else data.sizes.push(saved); return data; }); return saved; },
    deleteSize: async function (id) { saveData(function (data) { data.sizes = data.sizes.filter(function (item) { return item.id !== id; }); return data; }); },
    listColors: async function (includeInactive) { return currentData().colors.filter(function (item) { return includeInactive || item.active; }); },
    saveColor: async function (input) { let saved; saveData(function (data) { const id = input.id || Store.id(); saved = Object.assign({}, input, { id: id, key: input.key || slugify(input.name.en), active: input.active !== false }); const index = data.colors.findIndex(function (item) { return item.id === id; }); if (index >= 0) data.colors[index] = saved; else data.colors.push(saved); return data; }); return saved; },
    deleteColor: async function (id) { saveData(function (data) { data.colors = data.colors.filter(function (item) { return item.id !== id; }); return data; }); },
    saveProduct: async function (input) { let saved; const data = currentData(); const price = Number(input.price); const salePrice = input.salePrice == null || input.salePrice === '' ? null : Number(input.salePrice); if (!input.name.en || !input.name.ar || !(price > 0) || salePrice != null && (salePrice < 0 || salePrice >= price)) throw new Error('Enter both product names and valid prices.'); if (input.variants && input.variants.length && input.variants.every(function (variant) { return !variant.size && !variant.color; })) throw new Error('Every variant needs a size or a colour.'); saveData(function (next) { const id = input.id || Store.id(); const slug = slugify(input.slug || input.name.en); saved = Object.assign({}, input, { id: id, slug: slug, price: price, salePrice: salePrice, stock: Math.max(0, Number(input.stock || 0)), images: (input.images || []).filter(Boolean), variants: input.variants || [], active: input.active !== false, updatedAt: new Date().toISOString(), createdAt: input.createdAt || new Date().toISOString() }); const index = next.products.findIndex(function (item) { return item.id === id; }); if (index >= 0) next.products[index] = saved; else next.products.unshift(saved); return next; }); return saved; },
    deleteProduct: async function (id) { saveData(function (data) { data.products = data.products.filter(function (item) { return item.id !== id; }); return data; }); },
    getSettings: async function () { return currentData().settings; },
    saveSettings: async function (input) { saveData(function (data) { data.settings = Object.assign({}, data.settings, input); return data; }); return currentData().settings; },
    listPromotions: async function () { return currentData().promotions.slice().sort(function (a, b) { return String(a.code).localeCompare(String(b.code)); }); },
    savePromotion: async function (input) { let saved; const code = String(input.code || '').trim().toUpperCase(); if (Number(input.value) <= 0 || input.type === 'percentage' && Number(input.value) > 100) throw new Error('Enter a valid discount.'); if (input.scope !== 'global' && !(input.targetIds || []).length) throw new Error('Select at least one promotion target.'); if (input.endsAt && input.startsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) throw new Error('Promotion end time must be after the start time.'); if (window.StorePromotionUtils) { saved = window.StorePromotionUtils.normalizePromotion(Object.assign({}, input, { code: code })); } else { saved = Object.assign({}, input, { id: input.id || Store.id(), code: code, value: Number(input.value), active: input.active !== false }); } saveData(function (data) { const id = input.id || saved.id || Store.id(); saved = Object.assign({}, saved, { id: id, code: code, value: Number(input.value), active: input.active !== false }); const index = data.promotions.findIndex(function (item) { return item.id === id; }); if (index >= 0) data.promotions[index] = saved; else data.promotions.push(saved); return data; }); return saved; },
    deletePromotion: async function (id) { saveData(function (data) { data.promotions = data.promotions.filter(function (item) { return item.id !== id; }); return data; }); },
    validatePromotion: async function (code, subtotal, lines) { const promotions = currentData().promotions || []; if (window.StorePromotionUtils) { const normalized = promotions.map(window.StorePromotionUtils.normalizePromotion); const contextLines = (lines || []).map(function (line) { return { productId: line.product && line.product.id || line.productId, categoryId: line.product && line.product.categoryId || line.categoryId, price: line.price, quantity: line.quantity, lineTotal: line.price * line.quantity }; }); const productIds = contextLines.map(function (line) { return String(line.productId || ''); }).filter(Boolean); const categoryIds = contextLines.map(function (line) { return String(line.categoryId || ''); }).filter(Boolean); const promo = window.StorePromotionUtils.chooseBestPromotion(normalized, { code: code, requireCode: Boolean(String(code || '').trim()), subtotal: Number(subtotal || 0), productIds: productIds, categoryIds: categoryIds, now: new Date() }); if (!promo) return null; const eligible = window.StorePromotionUtils.eligibleSubtotal(promo, contextLines); return { code: promo.code, discount: window.StorePromotionUtils.calculatePromotionDiscount(promo, eligible), title: promo.title, id: promo.id }; } const current = promotions.find(function (item) { return item.code.toUpperCase() === String(code || '').trim().toUpperCase() && item.active; }); if (!current) return null; const now = Date.now(); if (current.startsAt && new Date(current.startsAt).getTime() > now || current.endsAt && new Date(current.endsAt).getTime() < now) return null; const discount = current.type === 'percentage' ? Math.round(Number(subtotal) * Number(current.value) / 100) : Math.min(Number(subtotal), Number(current.value)); return { code: current.code, discount: discount, title: current.title }; },
    updateInventory: async function (productId, variantId, quantity) { let success = false; saveData(function (data) { const product = data.products.find(function (item) { return item.id === productId; }); if (!product) return data; if (variantId) { const variant = product.variants.find(function (item) { return item.id === variantId; }); if (variant) { variant.stock = Math.max(0, Number(quantity || 0)); success = true; } } else { product.stock = Math.max(0, Number(quantity || 0)); success = true; } return data; }); if (!success) throw new Error('The inventory row could not be found.'); },
    listOrders: async function () { return currentData().orders.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }); },
    getOrder: async function (key) { return currentData().orders.find(function (order) { return order.id === key || order.orderNumber === key; }) || null; },
    listCustomerOrders: async function (userId) { return currentData().orders.filter(function (order) { return order.userId === userId; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }); },
    trackOrder: async function (orderNumber, phone) { const digits = normalizePhone(phone); return currentData().orders.find(function (order) { return order.orderNumber.toLowerCase() === String(orderNumber || '').trim().toLowerCase() && normalizePhone(order.customer.phone) === digits; }) || null; },
    createOrder: async function (input) {
      if (!input.items || !input.items.length) throw new Error('Your bag is empty.');
      let created;
      saveData(function (data) {
        const lines = [];
        let subtotal = 0;
        input.items.forEach(function (item) {
          const product = data.products.find(function (candidate) { return candidate.id === item.productId && candidate.active; });
          if (!product) throw new Error('A product in your bag is no longer available.');
          const variant = item.variantId ? (product.variants || []).find(function (candidate) { return candidate.id === item.variantId && candidate.active !== false; }) : null;
          if (product.variants && product.variants.length && !variant) throw new Error('Choose an available size or colour.');
          if (item.variantId && !variant) throw new Error('That product option is no longer available.');
          const stock = availableStock(product, variant);
          const quantity = Math.floor(Number(item.quantity));
          if (!(quantity > 0) || stock < quantity) throw new Error('Only ' + stock + ' of a selected piece are available.');
          const price = effectivePrice(product, variant);
          if (variant) variant.stock -= quantity; else product.stock -= quantity;
          const color = variant && variant.color ? Store.clone(variant.color) : null;
          lines.push({ id: Store.id(), productId: product.id, variantId: variant ? variant.id : '', name: Store.clone(product.name), image: product.images[0] || '', sku: variant && variant.sku || product.sku, size: variant && variant.size || '', color: color, quantity: quantity, price: price, lineTotal: price * quantity });
          subtotal += price * quantity;
        });
        let discount = 0; let promotionCode = ''; let appliedPromotion = null;
        if (window.StorePromotionUtils) {
          const normalized = data.promotions.map(window.StorePromotionUtils.normalizePromotion);
          const contextLines = lines.map(function (line) { const product = data.products.find(function (item) { return item.id === line.productId; }); return { productId: line.productId, categoryId: product && product.categoryId || '', price: line.price, quantity: line.quantity, lineTotal: line.lineTotal }; });
          const requestedCode = String(input.promotionCode || '').trim().toUpperCase();
          const promo = window.StorePromotionUtils.chooseBestPromotion(normalized, { code: requestedCode, requireCode: Boolean(requestedCode), subtotal: subtotal, productIds: contextLines.map(function (line) { return String(line.productId); }), categoryIds: contextLines.map(function (line) { return String(line.categoryId); }), now: new Date() });
          if (requestedCode && !promo) throw new Error('The promotion code is no longer available.');
          if (promo) {
            const eligible = window.StorePromotionUtils.eligibleSubtotal(promo, contextLines);
            discount = window.StorePromotionUtils.calculatePromotionDiscount(promo, eligible);
            promotionCode = promo.code;
            appliedPromotion = promo;
          }
        } else if (input.promotionCode) {
          const promo = data.promotions.find(function (item) { return item.code.toUpperCase() === String(input.promotionCode).toUpperCase() && item.active; });
          if (!promo || promo.startsAt && new Date(promo.startsAt).getTime() > Date.now() || promo.endsAt && new Date(promo.endsAt).getTime() < Date.now()) throw new Error('The promotion code is no longer available.');
          discount = promo.type === 'percentage' ? Math.round(subtotal * promo.value / 100) : Math.min(subtotal, promo.value);
          promotionCode = promo.code;
          appliedPromotion = promo;
        }
        const settings = data.settings;
        const threshold = Number(settings.freeDeliveryThreshold || 0);
        const deliveryFee = threshold > 0 && subtotal >= threshold ? 0 : Number(settings.deliveryFee || 0);
        const now = new Date().toISOString();
        const number = 'EG-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const session = Store.storage.session();
        created = { id: Store.id(), orderNumber: number, userId: session && session.user ? session.user.id : '', customer: { name: input.customer.name.trim(), email: input.customer.email.trim(), phone: input.customer.phone.trim() }, address: { governorate: input.address.governorate, area: input.address.area.trim(), address: input.address.address.trim(), notes: input.address.notes || '' }, paymentMethod: input.paymentMethod, status: 'pending', subtotal: subtotal, discount: discount, promotionCode: promotionCode, deliveryFee: deliveryFee, total: Math.max(0, subtotal - discount + deliveryFee), items: lines, createdAt: now, events: [{ status: 'pending', at: now, note: '' }] };
        if (appliedPromotion) {
          const savedPromotion = data.promotions.find(function (item) { return item.id === appliedPromotion.id || item.code === appliedPromotion.code; });
          if (savedPromotion) savedPromotion.usedCount = Number(savedPromotion.usedCount || 0) + 1;
        }
        data.orders.push(created);
        const existing = data.customers.find(function (customer) { return customer.id === created.userId; });
        if (existing && input.customer.phone) existing.phone = input.customer.phone.trim();
        return data;
      });
      return created;
    },
    updateOrderStatus: async function (id, status) { if (allowedStatuses.indexOf(status) < 0) throw new Error('Unknown order status.'); let found = false; saveData(function (data) { const order = data.orders.find(function (item) { return item.id === id || item.orderNumber === id; }); if (order) { order.status = status; order.events.push({ status: status, at: new Date().toISOString(), note: '' }); found = true; } return data; }); if (!found) throw new Error('Order not found.'); },
    listCustomers: async function () { return currentData().customers.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }); },
    updateCustomer: async function (userId, patch) { saveData(function (data) { const person = data.customers.find(function (item) { return item.id === userId; }); if (person) Object.assign(person, patch); return data; }); }
  };
  const remote = {
    mode: 'supabase',
    listProducts: remoteProducts,
    getProduct: async function (key) { const products = await remoteProducts({ includeInactive: true }); return products.find(function (product) { return product.id === key || product.slug === key; }) || null; },
    listCategories: async function (includeInactive) { const rows = await Store.supabase.rest('categories', { select: '*', order: 'sort_order.asc' }); return (rows || []).map(mapCategory).filter(function (item) { return includeInactive || item.active; }); },
    saveCategory: async function (input) { const body = { slug: slugify(input.slug || input.name.en), name_en: input.name.en, name_ar: input.name.ar, image_url: input.image || null, is_active: input.active !== false, sort_order: Number(input.order || 0) }; if (input.id) { await Store.supabase.rest('categories', { id: 'eq.' + input.id }, { method: 'PATCH', body: body, prefer: 'return=minimal' }); return Object.assign({}, input); } const rows = await Store.supabase.rest('categories', {}, { method: 'POST', body: body, prefer: 'return=representation' }); return mapCategory(rows[0]); },
    deleteCategory: async function (id) { await Store.supabase.rest('categories', { id: 'eq.' + id }, { method: 'DELETE', prefer: 'return=minimal' }); },
    listSizes: async function (includeInactive) { const rows = await Store.supabase.rest('sizes', { select: '*', order: 'sort_order.asc' }); return (rows || []).filter(function (row) { return includeInactive || row.is_active; }).map(function (row) { return { id: row.id, label: row.label, order: row.sort_order, active: row.is_active }; }); },
    saveSize: async function (input) { const body = { label: input.label, sort_order: Number(input.order || 0), is_active: input.active !== false }; if (input.id) { await Store.supabase.rest('sizes', { id: 'eq.' + input.id }, { method: 'PATCH', body: body, prefer: 'return=minimal' }); return input; } const rows = await Store.supabase.rest('sizes', {}, { method: 'POST', body: body, prefer: 'return=representation' }); const row = rows[0]; return { id: row.id, label: row.label, order: row.sort_order, active: row.is_active }; },
    deleteSize: async function (id) { await Store.supabase.rest('sizes', { id: 'eq.' + id }, { method: 'DELETE', prefer: 'return=minimal' }); },
    listColors: async function (includeInactive) { const rows = await Store.supabase.rest('colors', { select: '*', order: 'name_en.asc' }); return (rows || []).filter(function (row) { return includeInactive || row.is_active; }).map(function (row) { return { id: row.id, key: row.color_key, name: { en: row.name_en, ar: row.name_ar }, hex: row.hex, active: row.is_active }; }); },
    saveColor: async function (input) { const body = { color_key: input.key, name_en: input.name.en, name_ar: input.name.ar, hex: input.hex, is_active: input.active !== false }; if (input.id) { await Store.supabase.rest('colors', { id: 'eq.' + input.id }, { method: 'PATCH', body: body, prefer: 'return=minimal' }); return input; } const rows = await Store.supabase.rest('colors', {}, { method: 'POST', body: body, prefer: 'return=representation' }); const row = rows[0]; return { id: row.id, key: row.color_key, name: { en: row.name_en, ar: row.name_ar }, hex: row.hex, active: row.is_active }; },
    deleteColor: async function (id) { await Store.supabase.rest('colors', { id: 'eq.' + id }, { method: 'DELETE', prefer: 'return=minimal' }); },
    saveProduct: async function (input) { const product = { id: input.id || null, slug: slugify(input.slug || input.name.en), name_en: input.name.en, name_ar: input.name.ar, description_en: input.description.en, description_ar: input.description.ar, category_id: input.categoryId, price: Number(input.price), sale_price: input.salePrice == null ? null : Number(input.salePrice), sku: input.sku, is_active: input.active !== false, is_featured: Boolean(input.featured), stock_quantity: Number(input.stock || 0) }; const images = (input.images || []).map(function (url, index) { return { image_url: url, alt_en: input.name.en, alt_ar: input.name.ar, sort_order: index }; }); const variants = (input.variants || []).map(function (item) { return { id: item.id || null, sku: item.sku, size_label: item.size || null, color_key: item.color && item.color.key || null, color_name_en: item.color && item.color.name.en || null, color_name_ar: item.color && item.color.name.ar || null, color_hex: item.color && item.color.hex || null, price_override: item.price || null, stock_quantity: Number(item.stock || 0), is_active: item.active !== false }; }); const id = await Store.supabase.rpc('admin_save_product', { p_product: product, p_images: images, p_variants: variants }); return Object.assign({}, input, { id: id }); },
    deleteProduct: async function (id) { await Store.supabase.rest('products', { id: 'eq.' + id }, { method: 'PATCH', body: { is_active: false }, prefer: 'return=minimal' }); },
    getSettings: async function () { const rows = await Store.supabase.rest('store_settings', { key: 'eq.general', select: 'value' }); if (!rows || !rows.length) return Store.demoData.settings; const value = rows[0].value || {}; return Object.assign({}, Store.demoData.settings, value); },
    saveSettings: async function (input) { await Store.supabase.rest('store_settings', { on_conflict: 'key' }, { method: 'POST', body: { key: 'general', value: input }, prefer: 'resolution=merge-duplicates,return=minimal' }); return input; },
    listPromotions: async function () { const rows = await Store.supabase.rest('promotions', { select: '*', order: 'created_at.desc' }); return (rows || []).map(mapPromotion); },
    savePromotion: async function (input) { const normalized = window.StorePromotionUtils ? window.StorePromotionUtils.normalizePromotion(input) : input; const body = { code: normalized.code || null, title_en: normalized.title.en, title_ar: normalized.title.ar, discount_type: normalized.type, discount_value: Number(normalized.value), scope: normalized.scope, target_ids: normalized.targetIds, min_order_amount: Number(normalized.minOrder || 0), max_discount: normalized.maxDiscount, usage_limit: normalized.usageLimit, priority: Number(normalized.priority || 0), is_active: normalized.active !== false, starts_at: normalized.startsAt || null, ends_at: normalized.endsAt || null }; if (normalized.id && /^[0-9a-f-]{36}$/i.test(normalized.id)) { await Store.supabase.rest('promotions', { id: 'eq.' + normalized.id }, { method: 'PATCH', body: body, prefer: 'return=minimal' }); return normalized; } const rows = await Store.supabase.rest('promotions', {}, { method: 'POST', body: body, prefer: 'return=representation' }); return mapPromotion(rows[0]); },
    deletePromotion: async function (id) { await Store.supabase.rest('promotions', { id: 'eq.' + id }, { method: 'DELETE', prefer: 'return=minimal' }); },
    validatePromotion: async function (code, subtotal, lines) { const promotions = await this.listPromotions(); if (!window.StorePromotionUtils) return null; const contextLines = (lines || []).map(function (line) { return { productId: line.product && line.product.id || line.productId, categoryId: line.product && line.product.categoryId || line.categoryId, price: line.price, quantity: line.quantity, lineTotal: line.price * line.quantity }; }); const promo = window.StorePromotionUtils.chooseBestPromotion(promotions, { code: code, requireCode: true, subtotal: Number(subtotal || 0), productIds: contextLines.map(function (line) { return String(line.productId || ''); }), categoryIds: contextLines.map(function (line) { return String(line.categoryId || ''); }), now: new Date() }); if (!promo) return null; return { id: promo.id, code: promo.code, title: promo.title, discount: window.StorePromotionUtils.calculatePromotionDiscount(promo, window.StorePromotionUtils.eligibleSubtotal(promo, contextLines)) }; },
    updateInventory: async function (productId, variantId, quantity) { if (!variantId) { await Store.supabase.rest('products', { id: 'eq.' + productId }, { method: 'PATCH', body: { stock_quantity: Math.max(0, Number(quantity)) }, prefer: 'return=minimal' }); return; } return Store.supabase.rest('product_variants', { id: 'eq.' + variantId }, { method: 'PATCH', body: { stock: Math.max(0, Number(quantity)) }, prefer: 'return=minimal' }); },
    listOrders: async function () { const rows = await Store.supabase.rest('orders', { select: '*,order_items(*),order_events(*)', order: 'created_at.desc' }); return (rows || []).map(mapOrder); },
    getOrder: async function (key) { const rows = await Store.supabase.rest('orders', Object.assign({ select: '*,order_items(*),order_events(*)', limit: '1' }, String(key).match(/^[0-9a-f-]{36}$/i) ? { id: 'eq.' + key } : { order_number: 'eq.' + key })); return rows && rows[0] ? mapOrder(rows[0]) : null; },
    listCustomerOrders: async function () { return this.listOrders(); },
    trackOrder: async function (orderNumber, phone) { const row = await Store.supabase.rpc('track_order', { p_order_number: orderNumber, p_phone: phone }); return row ? mapOrder(row) : null; },
    createOrder: async function (input) { const payload = { customer_name: input.customer.name, customer_email: input.customer.email || null, customer_phone: input.customer.phone, governorate: input.address.governorate, area: input.address.area, delivery_address: input.address.address, notes: input.address.notes || '', payment_method: input.paymentMethod, promotion_code: input.promotionCode || '', items: input.items.map(function (item) { return { product_id: item.productId, variant_id: item.variantId || null, quantity: Number(item.quantity) }; }) }; const row = await Store.supabase.rpc('place_order', { p_order: payload }); return mapOrder(row); },
    updateOrderStatus: async function (id, status) { if (allowedStatuses.indexOf(status) < 0) throw new Error('Unknown order status.'); await Store.supabase.rest('orders', { id: 'eq.' + id }, { method: 'PATCH', body: { status: status }, prefer: 'return=minimal' }); },
    listCustomers: async function () { const rows = await Store.supabase.rest('customers', { select: '*', order: 'created_at.desc' }); return (rows || []).map(function (row) { return { id: row.id, fullName: row.name, email: row.email || '', phone: row.phone, createdAt: row.created_at, role: 'customer', authUserId: row.auth_user_id || '' }; }); },
    updateCustomer: async function (userId, patch) { await Store.supabase.rest('customers', { id: 'eq.' + userId }, { method: 'PATCH', body: { name: patch.fullName, phone: patch.phone, email: patch.email || null, address: patch.address || null }, prefer: 'return=minimal' }); }
  };
  const useRemote = Store.config.dataMode === 'supabase' && Store.supabase.ready;
  Store.repo = useRemote ? remote : demo;
  Store.repo.mode = useRemote ? 'supabase' : 'demo';
  Store.repo.helpers = { slugify: slugify, activeVariants: activeVariants, effectivePrice: effectivePrice, availableStock: availableStock, normalizePhone: normalizePhone, statuses: allowedStatuses };
  Store.useSupabase = useRemote;
})(window.Store);
