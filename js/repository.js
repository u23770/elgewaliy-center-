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
  function adminCode() { return Store.AdminGate && typeof Store.AdminGate.adminCode === 'function' ? Store.AdminGate.adminCode() : ''; }
  let adminSnapshotCache = null;
  async function adminSnapshot() {
    const code = adminCode();
    if (!code) throw new Error('Admin access code is required.');
    if (adminSnapshotCache) return adminSnapshotCache;
    adminSnapshotCache = await Store.supabase.rpc('admin_snapshot', { p_admin_code: code });
    return adminSnapshotCache;
  }
  function clearAdminSnapshot() { adminSnapshotCache = null; }
  function rpcAdmin(name, body) {
    const code = adminCode();
    if (!code) return Promise.reject(new Error('Admin access code is required.'));
    return Store.supabase.rpc(name, Object.assign({ p_admin_code: code }, body || {})).then(function (result) {
      clearAdminSnapshot();
      return result;
    });
  }
  function mapCategory(row) { return { id: row.id, slug: row.slug, name: { en: row.name_en, ar: row.name_ar }, description: { en: row.description_en || '', ar: row.description_ar || '' }, image: row.image_url || '', parentId: row.parent_id || '', active: row.is_active !== false, order: row.sort_order || 0 }; }
  function mapProduct(row) { return remoteMappers ? remoteMappers.mapRemoteProduct(row) : { id: row.id, slug: row.slug, name: { en: row.name_en, ar: row.name_ar }, description: { en: row.description_en || '', ar: row.description_ar || '' }, categoryId: row.category_id || '', images: (row.product_images || []).map(function (image) { return image.url || image.image_url; }), price: Number(row.price), salePrice: row.sale_price == null ? null : Number(row.sale_price), sku: row.sku || '', active: row.is_active !== false, featured: Boolean(row.is_featured), stock: Number(row.stock_quantity || 0), variants: (row.product_variants || []).map(function (variant) { return { id: variant.id, sku: variant.sku || '', size: variant.size || variant.size_label || '', color: variant.color ? { key: String(variant.color).toLowerCase().replace(/\s+/g,'-'), name: { en: variant.color, ar: variant.color }, hex: '#777e60' } : null, stock: Number(variant.stock || 0), price: variant.price_override == null ? null : Number(variant.price_override), active: variant.is_active !== false }; }) }; }
  function mapSiteConfig(snapshot) {
    const util = window.StoreSiteConfig;
    return util ? util.normalizeSiteConfig((snapshot && snapshot.siteConfig) || {}) : ((snapshot && snapshot.siteConfig) || {});
  }
  function mapBanner(row) {
    return { id: row.id, title: { en: row.title_en || '', ar: row.title_ar || '' }, text: { en: row.text_en || '', ar: row.text_ar || '' }, image: row.image_url || '', link: row.link_url || '', active: row.active !== false, order: Number(row.sort_order || 0), startsAt: row.starts_at || '', endsAt: row.ends_at || '' };
  }
  function mapGallery(row) {
    return { id: row.id, title: { en: row.title_en || '', ar: row.title_ar || '' }, image: row.image_url || '', link: row.link_url || '', active: row.active !== false, order: Number(row.sort_order || 0) };
  }
  function mapSocial(row) {
    return { id: row.id, platform: row.platform || '', label: row.label || '', url: row.url || '', active: row.active !== false, order: Number(row.sort_order || 0) };
  }
  function mapMedia(row) {
    return { id: row.id, name: row.name || '', url: row.url || '', alt: { en: row.alt_en || '', ar: row.alt_ar || '' }, kind: row.kind || 'image', active: row.active !== false };
  }
  function mapZone(row) {
    return { id: row.id, name: { en: row.name_en || '', ar: row.name_ar || '' }, fee: Number(row.fee || 0), freeThreshold: Number(row.free_threshold || 0), active: row.active !== false, order: Number(row.sort_order || 0) };
  }
  function mapSubzone(row) {
    return { id: row.id, zoneId: row.zone_id, name: { en: row.name_en || '', ar: row.name_ar || '' }, fee: Number(row.fee || 0), active: row.active !== false, order: Number(row.sort_order || 0) };
  }
  function mapDriver(row) {
    return { id: row.id, name: row.name || '', phone: row.phone || '', vehicle: row.vehicle || '', notes: row.notes || '', active: row.active !== false };
  }
  function mapReview(row) {
    return { id: row.id, productId: row.product_id || '', customerName: row.customer_name || '', rating: Number(row.rating || 5), title: row.title || '', body: row.body || '', approved: row.approved === true, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  function mapPromotion(row) { return remoteMappers ? remoteMappers.mapRemotePromotion(row) : { id: row.id, code: row.code || '', title: { en: row.title_en, ar: row.title_ar }, type: row.discount_type === 'percentage' ? 'percentage' : 'fixed', value: Number(row.discount_value), scope: row.scope || 'global', targetIds: Array.isArray(row.target_ids) ? row.target_ids : [], minOrder: Number(row.min_order_amount || 0), maxDiscount: row.max_discount == null ? null : Number(row.max_discount), usageLimit: row.usage_limit == null ? null : Number(row.usage_limit), usedCount: Number(row.used_count || 0), priority: Number(row.priority || 0), active: row.is_active !== false, startsAt: row.starts_at || '', endsAt: row.ends_at || '' }; }
  function mapOrder(row) { return remoteMappers ? remoteMappers.mapRemoteOrder(row) : { id: row.id, orderNumber: row.order_number, userId: row.customer_id || '', customer: { name: row.customer_name, email: '', phone: row.customer_phone }, address: { address: row.customer_address || '', notes: row.notes || '' }, paymentMethod: row.payment_method, status: ({ new:'pending', accepted:'confirmed', preparing:'preparing', ready:'preparing', shipped:'out_for_delivery', out_for_delivery:'out_for_delivery', delivered:'delivered', cancelled:'cancelled' }[row.status] || row.status), subtotal: Number(row.subtotal || 0), discount: Number(row.discount || 0), promotionCode: row.promotion_code || '', deliveryFee: Number(row.delivery_fee || 0), total: Number(row.total || 0), items: (row.order_items || []).map(function (item) { return { id: item.id, productId: item.product_id, variantId: item.variant_id || '', name: { en: item.product_name_en || '', ar: item.product_name_ar || '' }, image: '', sku: '', size: item.size || '', color: item.color ? { key: item.color, name: { en: item.color, ar: item.color }, hex: '#777e60' } : null, quantity: Number(item.quantity || 0), price: Number(item.unit_price || 0), lineTotal: Number(item.total || 0) }; }), createdAt: row.created_at, events: (row.order_events || []).map(function (event) { return { status: ({ new:'pending', accepted:'confirmed', preparing:'preparing', ready:'preparing', shipped:'out_for_delivery', out_for_delivery:'out_for_delivery', delivered:'delivered', cancelled:'cancelled' }[event.status] || event.status), at: event.created_at, note: event.note || '' }; }) }; }
  async function remoteProducts(filters) {
    if (filters && filters.includeInactive) {
      const snapshot = await adminSnapshot();
      const remoteCategories = (snapshot.categories || []).map(mapCategory);
      let products = (snapshot.products || []).map(mapProduct);
      products = products.map(function (product) { const category = remoteCategories.find(function (item) { return item.id === product.categoryId; }) || findCategory(product.categoryId, currentData()); product.category = category ? category.name : { en: '', ar: '' }; product.categorySlug = category ? category.slug : ''; return product; });
      return filterProducts(products, filters || {}, currentData());
    }
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
    validatePromotion: async function (code, subtotal, lines) {
      const items = (lines || []).map(function (line) {
        return {
          product_id: line.product && line.product.id || line.productId,
          variant_id: line.variantId || line.variant && line.variant.id || null,
          quantity: Number(line.quantity || 0)
        };
      }).filter(function (item) { return item.product_id && item.quantity > 0; });
      const result = await Store.supabase.rpc('validate_promotion', { p_code: String(code || '').trim().toUpperCase(), p_items: items });
      if (!result) return null;
      return {
        id: result.id,
        code: result.code || '',
        title: result.title,
        discount: Number(result.discount || 0)
      };
    },
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
    getProduct: async function (key, includeInactive) { const products = await remoteProducts({ includeInactive: Boolean(includeInactive) }); return products.find(function (product) { return product.id === key || product.slug === key; }) || null; },
    listCategories: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.categories || []).map(mapCategory); } const rows = await Store.supabase.rest('categories', { select: '*', order: 'sort_order.asc' }); return (rows || []).map(mapCategory).filter(function (item) { return item.active; }); },
    saveCategory: async function (input) { const id = await rpcAdmin('admin_save_category', { p_id: input.id || null, p_slug: slugify(input.slug || input.name.en), p_name_en: input.name.en, p_name_ar: input.name.ar, p_image_url: input.image || '', p_sort_order: Number(input.order || 0), p_active: input.active !== false }); return Object.assign({}, input, { id: id }); },
    deleteCategory: async function (id) { await rpcAdmin('admin_archive_category', { p_id: id }); },
    listSizes: async function (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.sizes || []).filter(function (row) { return includeInactive || row.is_active; }).map(function (row) { return { id: row.id, label: row.label, order: row.sort_order, active: row.is_active }; }); },
    saveSize: async function (input) { const id = await rpcAdmin('admin_save_size', { p_id: input.id || null, p_label: input.label, p_order: Number(input.order || 0), p_active: input.active !== false }); return Object.assign({}, input, { id: id }); },
    deleteSize: async function (id) { await rpcAdmin('admin_archive_size', { p_id: id }); },
    listColors: async function (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.colors || []).filter(function (row) { return includeInactive || row.is_active; }).map(function (row) { return { id: row.id, key: row.color_key, name: { en: row.name_en, ar: row.name_ar }, hex: row.hex, active: row.is_active }; }); },
    saveColor: async function (input) { const id = await rpcAdmin('admin_save_color', { p_id: input.id || null, p_key: input.key, p_name_en: input.name.en, p_name_ar: input.name.ar, p_hex: input.hex, p_active: input.active !== false }); return Object.assign({}, input, { id: id }); },
    deleteColor: async function (id) { await rpcAdmin('admin_archive_color', { p_id: id }); },
    saveProduct: async function (input) { const product = { id: input.id || null, slug: slugify(input.slug || input.name.en), name_en: input.name.en, name_ar: input.name.ar, description_en: input.description.en, description_ar: input.description.ar, category_id: input.categoryId, price: Number(input.price), sale_price: input.salePrice == null ? null : Number(input.salePrice), sku: input.sku, is_active: input.active !== false, is_featured: Boolean(input.featured), stock_quantity: Number(input.stock || 0) }; const images = (input.images || []).map(function (url, index) { return { url: url, alt_en: input.name.en, alt_ar: input.name.ar, sort_order: index }; }); const variants = window.StoreAdminProduct ? window.StoreAdminProduct.normalizeVariantSavePayload(input.variants || []) : (input.variants || []).map(function (item) { return { id: item.id || null, sku: item.sku, size: item.size || null, color: item.color && item.color.name && (item.color.name.en || item.color.name.ar) || null, price_override: item.price == null ? null : Number(item.price), stock: Number(item.stock || 0), is_active: item.active !== false }; }); const id = await rpcAdmin('admin_save_product_metadata', { p_product: product, p_images: images }); await rpcAdmin('admin_sync_product_variants', { p_product_id: id, p_variants: variants }); return Object.assign({}, input, { id: id }); },
    deleteProduct: async function (id) { await rpcAdmin('admin_archive_product', { p_product_id: id }); },
    getSettings: async function () { const rows = await Store.supabase.rest('store_settings', { key: 'eq.general', select: 'value' }); if (!rows || !rows.length) return { deliveryFee: 60, freeDeliveryThreshold: 2000, lowStockThreshold: 4, deliveryNote: { en: '', ar: '' }, storeName: { en: 'Center El Gowaily', ar: 'سنتر الجويلي' }, phone: '', email: '', address: { en: '', ar: '' } }; return Object.assign({ deliveryFee: 60, freeDeliveryThreshold: 2000, lowStockThreshold: 4, deliveryNote: { en: '', ar: '' }, storeName: { en: 'Center El Gowaily', ar: 'سنتر الجويلي' }, phone: '', email: '', address: { en: '', ar: '' } }, rows[0].value || {}); },
    saveSettings: async function (input) { await rpcAdmin('admin_save_settings', { p_value: input }); return input; },
    getSiteConfig: async function (includeInactive) { if (includeInactive) { return mapSiteConfig(await adminSnapshot()); } const rows = await Store.supabase.rest('site_config', { select: 'key,value', order: 'key.asc' }); const obj = {}; (rows || []).forEach(function (row) { obj[row.key] = row.value; }); return window.StoreSiteConfig ? window.StoreSiteConfig.normalizeSiteConfig(obj.website || obj) : obj.website || obj; },
    saveSiteConfig: async function (config) { await rpcAdmin('admin_save_site_config', { p_key: 'website', p_value: config }); return config; },
    listBanners: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.banners || []).map(mapBanner); } const rows = await Store.supabase.rest('site_banners', { select: '*', order: 'sort_order.asc,created_at.desc' }); return (rows || []).map(mapBanner); },
    saveBanner: async function (input) { const id = await rpcAdmin('admin_save_banner', { p_id: input.id || null, p_payload: { title_en: input.title.en, title_ar: input.title.ar, text_en: input.text.en, text_ar: input.text.ar, image_url: input.image, link_url: input.link, active: input.active !== false, sort_order: Number(input.order || 0), starts_at: input.startsAt || '', ends_at: input.endsAt || '' } }); return Object.assign({}, input, { id: id }); },
    deleteBanner: async function (id) { await rpcAdmin('admin_archive_banner', { p_id: id }); },
    listGallery: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.gallery || []).map(mapGallery); } const rows = await Store.supabase.rest('site_gallery', { select: '*', order: 'sort_order.asc,created_at.desc' }); return (rows || []).map(mapGallery); },
    saveGallery: async function (input) { const id = await rpcAdmin('admin_save_gallery_item', { p_id: input.id || null, p_payload: { title_en: input.title.en, title_ar: input.title.ar, image_url: input.image, link_url: input.link, active: input.active !== false, sort_order: Number(input.order || 0) } }); return Object.assign({}, input, { id: id }); },
    deleteGallery: async function (id) { await rpcAdmin('admin_archive_gallery_item', { p_id: id }); },
    listSocials: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.socials || []).map(mapSocial); } const rows = await Store.supabase.rest('site_socials', { select: '*', order: 'sort_order.asc,created_at.desc' }); return (rows || []).map(mapSocial); },
    saveSocial: async function (input) { const id = await rpcAdmin('admin_save_social', { p_id: input.id || null, p_payload: { platform: input.platform, label: input.label, url: input.url, active: input.active !== false, sort_order: Number(input.order || 0) } }); return Object.assign({}, input, { id: id }); },
    deleteSocial: async function (id) { await rpcAdmin('admin_archive_social', { p_id: id }); },
    listMedia: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.media || []).map(mapMedia); } const rows = await Store.supabase.rest('site_media', { select: '*', order: 'created_at.desc' }); return (rows || []).map(mapMedia); },
    saveMedia: async function (input) { const id = await rpcAdmin('admin_save_media', { p_id: input.id || null, p_payload: { name: input.name, url: input.url, alt_en: input.alt.en, alt_ar: input.alt.ar, kind: input.kind || 'image', active: input.active !== false } }); return Object.assign({}, input, { id: id }); },
    deleteMedia: async function (id) { await rpcAdmin('admin_archive_media', { p_id: id }); },
    listZones: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.zones || []).map(mapZone); } const rows = await Store.supabase.rest('delivery_zones', { select: '*', order: 'sort_order.asc,created_at.asc' }); return (rows || []).map(mapZone); },
    saveZone: async function (input) { const id = await rpcAdmin('admin_save_zone', { p_id: input.id || null, p_payload: { name_en: input.name.en, name_ar: input.name.ar, fee: Number(input.fee || 0), free_threshold: Number(input.freeThreshold || 0), active: input.active !== false, sort_order: Number(input.order || 0) } }); return Object.assign({}, input, { id: id }); },
    deleteZone: async function (id) { await rpcAdmin('admin_archive_zone', { p_id: id }); },
    listSubzones: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.subzones || []).map(mapSubzone); } const rows = await Store.supabase.rest('delivery_subzones', { select: '*', order: 'sort_order.asc,created_at.asc' }); return (rows || []).map(mapSubzone); },
    saveSubzone: async function (input) { const id = await rpcAdmin('admin_save_subzone', { p_id: input.id || null, p_payload: { zone_id: input.zoneId, name_en: input.name.en, name_ar: input.name.ar, fee: Number(input.fee || 0), active: input.active !== false, sort_order: Number(input.order || 0) } }); return Object.assign({}, input, { id: id }); },
    deleteSubzone: async function (id) { await rpcAdmin('admin_archive_subzone', { p_id: id }); },
    listDrivers: async function () { const snapshot = await adminSnapshot(); return (snapshot.drivers || []).map(mapDriver); },
    saveDriver: async function (input) { const id = await rpcAdmin('admin_save_driver', { p_id: input.id || null, p_payload: { name: input.name, phone: input.phone, vehicle: input.vehicle, notes: input.notes, active: input.active !== false } }); return Object.assign({}, input, { id: id }); },
    deleteDriver: async function (id) { await rpcAdmin('admin_archive_driver', { p_id: id }); },
    assignOrderDelivery: async function (orderId, input) { return rpcAdmin('admin_assign_order_delivery', { p_order_id: orderId, p_driver_id: input.driverId || null, p_zone_id: input.zoneId || null, p_subzone_id: input.subzoneId || null, p_note: input.note || '' }); },
    listReviews: async function () { const snapshot = await adminSnapshot(); return (snapshot.reviews || []).map(mapReview); },
    saveReview: async function (input) { const id = await rpcAdmin('admin_save_review', { p_id: input.id || null, p_payload: { product_id: input.productId || '', customer_name: input.customerName, rating: Number(input.rating || 5), title: input.title || '', body: input.body || '', approved: input.approved === true } }); return Object.assign({}, input, { id: id }); },
    deleteReview: async function (id) { await rpcAdmin('admin_archive_review', { p_id: id }); },
    listPromotions: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.promotions || []).map(mapPromotion); } const rows = await Store.supabase.rest('promotions', { select: '*', order: 'created_at.desc' }); return (rows || []).map(mapPromotion); },
    savePromotion: async function (input) { const normalized = window.StorePromotionUtils ? window.StorePromotionUtils.normalizePromotion(input) : input; const id = await rpcAdmin('admin_save_promotion', { p_id: normalized.id && /^[0-9a-f-]{36}$/i.test(normalized.id) ? normalized.id : null, p_code: normalized.code || '', p_title_en: normalized.title.en, p_title_ar: normalized.title.ar, p_discount_type: normalized.type, p_discount_value: Number(normalized.value), p_scope: normalized.scope, p_target_ids: normalized.targetIds, p_min_order: Number(normalized.minOrder || 0), p_max_discount: normalized.maxDiscount, p_usage_limit: normalized.usageLimit, p_priority: Number(normalized.priority || 0), p_active: normalized.active !== false, p_starts_at: normalized.startsAt || null, p_ends_at: normalized.endsAt || null }); return Object.assign({}, normalized, { id: id }); },
    deletePromotion: async function (id) { await rpcAdmin('admin_archive_promotion', { p_id: id }); },
    validatePromotion: async function (code, subtotal, lines) { const promotions = await this.listPromotions(); if (!window.StorePromotionUtils) return null; const contextLines = (lines || []).map(function (line) { return { productId: line.product && line.product.id || line.productId, categoryId: line.product && line.product.categoryId || line.categoryId, price: line.price, quantity: line.quantity, lineTotal: line.price * line.quantity }; }); const promo = window.StorePromotionUtils.chooseBestPromotion(promotions, { code: code, requireCode: true, subtotal: Number(subtotal || 0), productIds: contextLines.map(function (line) { return String(line.productId || ''); }), categoryIds: contextLines.map(function (line) { return String(line.categoryId || ''); }), now: new Date() }); if (!promo) return null; return { id: promo.id, code: promo.code, title: promo.title, discount: window.StorePromotionUtils.calculatePromotionDiscount(promo, window.StorePromotionUtils.eligibleSubtotal(promo, contextLines)) }; },
    updateInventory: async function (productId, variantId, quantity) { return rpcAdmin('admin_update_inventory', { p_product_id: productId, p_variant_id: variantId || null, p_quantity: Math.max(0, Number(quantity)) }); },
    listOrders: async function () { const snapshot = await adminSnapshot(); return (snapshot.orders || []).map(mapOrder); },
    getOrder: async function (key) { const snapshot = await adminSnapshot(); const row = (snapshot.orders || []).find(function (item) { return item.id === key || item.order_number === key; }); return row ? mapOrder(row) : null; },
    listCustomerOrders: async function () { const rows = await Store.supabase.rpc('get_my_orders', {}); return (rows || []).map(mapOrder); },
    trackOrder: async function (orderNumber, phone) { const row = await Store.supabase.rpc('track_order', { p_order_number: orderNumber, p_phone: phone }); return row ? mapOrder(row) : null; },
    createOrder: async function (input) { const payload = { customer_name: input.customer.name, customer_email: input.customer.email || null, customer_phone: input.customer.phone, governorate: input.address.governorate, area: input.address.area, delivery_address: input.address.address, notes: input.address.notes || '', payment_method: input.paymentMethod, promotion_code: input.promotionCode || '', items: input.items.map(function (item) { return { product_id: item.productId, variant_id: item.variantId || null, quantity: Number(item.quantity) }; }) }; const row = await Store.supabase.rpc('place_order', { p_order: payload }); return mapOrder(row); },
    updateOrderStatus: async function (id, status) { if (allowedStatuses.indexOf(status) < 0) throw new Error('Unknown order status.'); const actual = ({ pending:'new', confirmed:'accepted', preparing:'preparing', out_for_delivery:'out_for_delivery', delivered:'delivered', cancelled:'cancelled' })[status]; return rpcAdmin('admin_update_order_status', { p_order_id: id, p_status: actual, p_note: '' }); },
    listCustomers: async function () { const snapshot = await adminSnapshot(); return (snapshot.customers || []).map(function (row) { return { id: row.id, fullName: row.name, email: row.email || '', phone: row.phone, createdAt: row.created_at, role: 'customer', authUserId: row.auth_user_id || '' }; }); },
    updateCustomer: async function (userId, patch) { if (!userId) throw new Error('Customer id is required.'); const customer = (await this.listCustomers()).find(function (item) { return item.id === userId; }); if (!customer) throw new Error('Customer not found.'); return rpcAdmin('admin_update_customer', { p_customer_id: userId, p_name: patch.fullName, p_phone: patch.phone, p_email: patch.email || customer.email }); }
  };
  const useRemote = Store.config.dataMode === 'supabase';
  const unavailable = {
    mode: 'unavailable',
    listProducts: async function(){ throw new Error('Store backend is unavailable.'); },
    getProduct: async function(){ throw new Error('Store backend is unavailable.'); }
  };
  const repository = useRemote ? (Store.supabase.ready ? remote : unavailable) : demo;
  Store.repo = repository;
  Store.repo.mode = useRemote && Store.supabase.ready ? 'supabase' : useRemote ? 'unavailable' : 'demo';
  Store.repo.helpers = { slugify: slugify, activeVariants: activeVariants, effectivePrice: effectivePrice, availableStock: availableStock, normalizePhone: normalizePhone, statuses: allowedStatuses };
  Store.useSupabase = useRemote && Store.supabase.ready;
})(window.Store);
