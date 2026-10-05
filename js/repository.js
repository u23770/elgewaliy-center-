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
  function normalizeSiteConfig(input) { return Store.StoreSiteConfig ? Store.StoreSiteConfig.normalizeSiteConfig(input) : input; }
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
  function mapPromotion(row) { return remoteMappers ? remoteMappers.mapRemotePromotion(row) : { id: row.id, code: row.code || '', title: { en: row.title_en, ar: row.title_ar }, type: row.discount_type === 'percentage' ? 'percentage' : 'fixed', value: Number(row.discount_value), scope: row.scope || 'global', targetIds: Array.isArray(row.target_ids) ? row.target_ids : [], minOrder: Number(row.min_order_amount || 0), maxDiscount: row.max_discount == null ? null : Number(row.max_discount), usageLimit: row.usage_limit == null ? null : Number(row.usage_limit), usedCount: Number(row.used_count || 0), priority: Number(row.priority || 0), active: row.is_active !== false, startsAt: row.starts_at || '', endsAt: row.ends_at || '' }; }
  function mapOrder(row) { return remoteMappers ? remoteMappers.mapRemoteOrder(row) : { id: row.id, orderNumber: row.order_number, userId: row.customer_id || '', customer: { name: row.customer_name, email: row.customer_email || '', phone: row.customer_phone }, address: { governorate: row.delivery_governorate || '', area: row.delivery_area || '', address: row.customer_address || '', notes: row.notes || '' }, mapsLink: row.maps_link || '', zoneId: row.delivery_zone_id || '', subzoneId: row.delivery_subzone_id || '', driverId: row.driver_id || '', adminNote: row.admin_note || '', paymentMethod: row.payment_method, status: ({ new:'pending', accepted:'confirmed', preparing:'preparing', ready:'preparing', shipped:'out_for_delivery', out_for_delivery:'out_for_delivery', delivered:'delivered', cancelled:'cancelled' }[row.status] || row.status), subtotal: Number(row.subtotal || 0), discount: Number(row.discount || 0), promotionCode: row.promotion_code || '', deliveryFee: Number(row.delivery_fee || 0), total: Number(row.total || 0), items: (row.order_items || []).map(function (item) { return { id: item.id, productId: item.product_id, variantId: item.variant_id || '', name: { en: item.product_name_en || '', ar: item.product_name_ar || '' }, image: '', sku: '', size: item.size || '', color: item.color ? { key: item.color, name: { en: item.color, ar: item.color }, hex: '#777e60' } : null, quantity: Number(item.quantity || 0), price: Number(item.unit_price || 0), lineTotal: Number(item.total || 0) }; }), createdAt: row.created_at, events: (row.order_events || []).map(function (event) { return { status: ({ new:'pending', accepted:'confirmed', preparing:'preparing', ready:'preparing', shipped:'out_for_delivery', out_for_delivery:'out_for_delivery', delivered:'delivered', cancelled:'cancelled' }[event.status] || event.status), at: event.created_at, note: event.note || '' }; }) }; }
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
    getSettings: async function () { const rows = await Store.supabase.rest('store_settings', { key: 'eq.general', select: 'value', limit: '1' }); return rows && rows[0] ? (rows[0].value || {}) : {}; },
    saveSettings: async function (input) { await rpcAdmin('admin_save_settings', { p_value: input }); return input; },
    listPromotions: async function (includeInactive) { if (includeInactive) { const snapshot = await adminSnapshot(); return (snapshot.promotions || []).map(mapPromotion); } const rows = await Store.supabase.rest('promotions', { select: '*', order: 'created_at.desc' }); return (rows || []).map(mapPromotion); },
    savePromotion: async function (input) { const normalized = window.StorePromotionUtils ? window.StorePromotionUtils.normalizePromotion(input) : input; const id = await rpcAdmin('admin_save_promotion', { p_id: normalized.id && /^[0-9a-f-]{36}$/i.test(normalized.id) ? normalized.id : null, p_code: normalized.code || '', p_title_en: normalized.title.en, p_title_ar: normalized.title.ar, p_discount_type: normalized.type, p_discount_value: Number(normalized.value), p_scope: normalized.scope, p_target_ids: normalized.targetIds, p_min_order: Number(normalized.minOrder || 0), p_max_discount: normalized.maxDiscount, p_usage_limit: normalized.usageLimit, p_priority: Number(normalized.priority || 0), p_active: normalized.active !== false, p_starts_at: normalized.startsAt || null, p_ends_at: normalized.endsAt || null }); return Object.assign({}, normalized, { id: id }); },
    deletePromotion: async function (id) { await rpcAdmin('admin_archive_promotion', { p_id: id }); },
    validatePromotion: async function (code, subtotal, lines) {
      const items = (lines || []).map(function (line) {
        return { product_id: line.product && line.product.id || line.productId, variant_id: line.variantId || line.variant && line.variant.id || null, quantity: Number(line.quantity || 0) };
      }).filter(function (item) { return item.product_id && item.quantity > 0; });
      const result = await Store.supabase.rpc('validate_promotion', { p_code: String(code || '').trim().toUpperCase(), p_items: items });
      if (!result) return null;
      return { id: result.id, code: result.code || '', title: result.title, discount: Number(result.discount || 0) };
    },
    getSiteConfig: async function (includePrivate) {
      if (includePrivate) {
        const snapshot = await adminSnapshot();
        return normalizeSiteConfig((snapshot.siteConfig || {}).website || {});
      }
      const rows = await Store.supabase.rest('site_config', { select: 'key,value', key: 'eq.website', limit: '1' });
      return normalizeSiteConfig(rows && rows[0] ? rows[0].value : {});
    },
    saveSiteConfig: async function (config) {
      await rpcAdmin('admin_save_site_config', { p_key: 'website', p_value: normalizeSiteConfig(config) });
      return normalizeSiteConfig(config);
    },
    listMedia: async function (includeInactive) {
      if (includeInactive) {
        const snapshot = await adminSnapshot();
        return (snapshot.media || []).map(function (m) { return { id: m.id, name: m.name || '', url: m.url || '', alt: { en: m.alt_en || '', ar: m.alt_ar || '' }, kind: m.kind || 'image', active: m.active !== false }; });
      }
      const rows = await Store.supabase.rest('site_media', { select: '*', active: 'eq.true', order: 'created_at.desc' });
      return (rows || []).map(function (m) { return { id: m.id, name: m.name || '', url: m.url || '', alt: { en: m.alt_en || '', ar: m.alt_ar || '' }, kind: m.kind || 'image', active: m.active !== false }; });
    },
    saveMedia: async function (input) {
      const id = await rpcAdmin('admin_save_media', { p_id: input.id || null, p_payload: { name: input.name || '', url: input.url || '', alt_en: input.alt && input.alt.en || '', alt_ar: input.alt && input.alt.ar || '', kind: input.kind || 'image', active: input.active !== false } });
      return Object.assign({}, input, { id: id });
    },
    deleteMedia: async function (id) { await rpcAdmin('admin_archive_media', { p_id: id }); },
    listBanners: async function (includeInactive) {
      const rows = includeInactive ? (await adminSnapshot()).banners || [] : await Store.supabase.rest('site_banners', { select: '*', active: 'eq.true', order: 'sort_order.asc' });
      return (rows || []).map(function (b) { return { id: b.id, title: { en: b.title_en || '', ar: b.title_ar || '' }, text: { en: b.text_en || '', ar: b.text_ar || '' }, image: b.image_url || '', link: b.link_url || '', active: b.active !== false, order: Number(b.sort_order || 0), startsAt: b.starts_at || '', endsAt: b.ends_at || '' }; });
    },
    saveBanner: async function (input) {
      const id = await rpcAdmin('admin_save_banner', { p_id: input.id || null, p_payload: { title_en: input.title && input.title.en || '', title_ar: input.title && input.title.ar || '', text_en: input.text && input.text.en || '', text_ar: input.text && input.text.ar || '', image_url: input.image || '', link_url: input.link || '', active: input.active !== false, sort_order: Number(input.order || 0), starts_at: input.startsAt || null, ends_at: input.endsAt || null } });
      return Object.assign({}, input, { id: id });
    },
    deleteBanner: async function (id) { await rpcAdmin('admin_archive_banner', { p_id: id }); },
    listGallery: async function (includeInactive) {
      const rows = includeInactive ? (await adminSnapshot()).gallery || [] : await Store.supabase.rest('site_gallery', { select: '*', active: 'eq.true', order: 'sort_order.asc' });
      return (rows || []).map(function (g) { return { id: g.id, title: { en: g.title_en || '', ar: g.title_ar || '' }, image: g.image_url || '', link: g.link_url || '', active: g.active !== false, order: Number(g.sort_order || 0) }; });
    },
    saveGallery: async function (input) {
      const id = await rpcAdmin('admin_save_gallery_item', { p_id: input.id || null, p_payload: { title_en: input.title && input.title.en || '', title_ar: input.title && input.title.ar || '', image_url: input.image || '', link_url: input.link || '', active: input.active !== false, sort_order: Number(input.order || 0) } });
      return Object.assign({}, input, { id: id });
    },
    deleteGallery: async function (id) { await rpcAdmin('admin_archive_gallery_item', { p_id: id }); },
    listSocials: async function (includeInactive) {
      const rows = includeInactive ? (await adminSnapshot()).socials || [] : await Store.supabase.rest('site_socials', { select: '*', active: 'eq.true', order: 'sort_order.asc' });
      return (rows || []).map(function (s) { return { id: s.id, platform: s.platform || '', label: s.label || '', url: s.url || '', active: s.active !== false, order: Number(s.sort_order || 0) }; });
    },
    saveSocial: async function (input) {
      const id = await rpcAdmin('admin_save_social', { p_id: input.id || null, p_payload: { platform: input.platform || '', label: input.label || '', url: input.url || '', active: input.active !== false, sort_order: Number(input.order || 0) } });
      return Object.assign({}, input, { id: id });
    },
    deleteSocial: async function (id) { await rpcAdmin('admin_archive_social', { p_id: id }); },
    listZones: async function (includeInactive) {
      let rows;
      if (includeInactive) rows = (await adminSnapshot()).zones || [];
      else rows = await Store.supabase.rest('delivery_zones', { select: '*', active: 'eq.true', order: 'sort_order.asc' });
      return (rows || []).map(function (z) { return { id: z.id, name: { en: z.name_en || '', ar: z.name_ar || '' }, fee: Number(z.fee || 0), freeThreshold: Number(z.free_threshold || 0), active: z.active !== false, order: Number(z.sort_order || 0) }; });
    },
    listSubzones: async function (includeInactive) {
      let rows;
      if (includeInactive) rows = (await adminSnapshot()).subzones || [];
      else rows = await Store.supabase.rest('delivery_subzones', { select: '*', active: 'eq.true', order: 'sort_order.asc' });
      return (rows || []).map(function (s) { return { id: s.id, zoneId: s.zone_id, name: { en: s.name_en || '', ar: s.name_ar || '' }, fee: Number(s.fee || 0), active: s.active !== false, order: Number(s.sort_order || 0) }; });
    },
    saveZone: async function (input) {
      const id = await rpcAdmin('admin_save_zone', { p_id: input.id || null, p_payload: { name_en: input.name && input.name.en || '', name_ar: input.name && input.name.ar || '', fee: Math.max(0, Number(input.fee || 0)), free_threshold: Math.max(0, Number(input.freeThreshold || 0)), active: input.active !== false, sort_order: Math.max(0, Number(input.order || 0)) } });
      return Object.assign({}, input, { id: id });
    },
    deleteZone: async function (id) { await rpcAdmin('admin_archive_zone', { p_id: id }); },
    saveSubzone: async function (input) {
      const id = await rpcAdmin('admin_save_subzone', { p_id: input.id || null, p_payload: { zone_id: input.zoneId, name_en: input.name && input.name.en || '', name_ar: input.name && input.name.ar || '', fee: Math.max(0, Number(input.fee || 0)), active: input.active !== false, sort_order: Math.max(0, Number(input.order || 0)) } });
      return Object.assign({}, input, { id: id });
    },
    deleteSubzone: async function (id) { await rpcAdmin('admin_archive_subzone', { p_id: id }); },
    listDrivers: async function () {
      const rows = (await adminSnapshot()).drivers || [];
      return rows.map(function (d) { return { id: d.id, name: d.name || '', phone: d.phone || '', vehicle: d.vehicle || '', notes: d.notes || '', active: d.active !== false }; });
    },
    saveDriver: async function (input) {
      const id = await rpcAdmin('admin_save_driver', { p_id: input.id || null, p_payload: { name: input.name || '', phone: input.phone || '', vehicle: input.vehicle || '', notes: input.notes || '', active: input.active !== false } });
      return Object.assign({}, input, { id: id });
    },
    deleteDriver: async function (id) { await rpcAdmin('admin_archive_driver', { p_id: id }); },
    assignOrderDelivery: async function (orderId, input) {
      await rpcAdmin('admin_assign_order_delivery', { p_order_id: orderId, p_driver_id: input.driverId || null, p_zone_id: input.zoneId || null, p_subzone_id: input.subzoneId || null, p_note: input.note || '' });
    },
    updateInventory: async function (productId, variantId, quantity) { return rpcAdmin('admin_update_inventory', { p_product_id: productId, p_variant_id: variantId || null, p_quantity: Math.max(0, Number(quantity)) }); },
    listOrders: async function () { const snapshot = await adminSnapshot(); return (snapshot.orders || []).map(mapOrder); },
    getOrder: async function (key) { const snapshot = await adminSnapshot(); const row = (snapshot.orders || []).find(function (item) { return item.id === key || item.order_number === key; }); return row ? mapOrder(row) : null; },
    listCustomerOrders: async function () { const rows = await Store.supabase.rpc('get_my_orders', {}); return (rows || []).map(mapOrder); },
    trackOrder: async function (orderNumber, phone) { const row = await Store.supabase.rpc('track_order', { p_order_number: orderNumber, p_phone: phone }); return row ? mapOrder(row) : null; },
    createOrder: async function (input) { const payload = { customer_name: input.customer.name, customer_email: input.customer.email || null, customer_phone: input.customer.phone, governorate: input.address.governorate, area: input.address.area, delivery_address: input.address.address, maps_link: input.address.mapsLink || '', zone_id: input.address.zoneId || null, subzone_id: input.address.subzoneId || null, notes: input.address.notes || '', payment_method: input.paymentMethod, promotion_code: input.promotionCode || '', items: input.items.map(function (item) { return { product_id: item.productId, variant_id: item.variantId || null, quantity: Number(item.quantity) }; }) }; const row = await Store.supabase.rpc('place_order', { p_order: payload }); return mapOrder(row); },
    updateOrderStatus: async function (id, status) { if (allowedStatuses.indexOf(status) < 0) throw new Error('Unknown order status.'); const actual = ({ pending:'new', confirmed:'accepted', preparing:'preparing', out_for_delivery:'out_for_delivery', delivered:'delivered', cancelled:'cancelled' })[status]; return rpcAdmin('admin_update_order_status', { p_order_id: id, p_status: actual, p_note: '' }); },
    listReviews: async function () {
      const rows = (await adminSnapshot()).reviews || [];
      return rows.map(function (row) { return { id: row.id, productId: row.product_id || '', customerName: row.customer_name || '', rating: Number(row.rating || 0), title: row.title || '', body: row.body || '', approved: row.approved !== false, createdAt: row.created_at || '' }; });
    },
    saveReview: async function (input) {
      const id = await rpcAdmin('admin_save_review', { p_id: input.id || null, p_payload: { product_id: input.productId || null, customer_name: input.customerName || '', rating: Math.max(1, Math.min(5, Number(input.rating || 5))), title: input.title || '', body: input.body || '', approved: input.approved !== false } });
      return Object.assign({}, input, { id: id });
    },
    deleteReview: async function (id) { await rpcAdmin('admin_archive_review', { p_id: id }); },
    listCustomers: async function () { const snapshot = await adminSnapshot(); return (snapshot.customers || []).map(function (row) { return { id: row.id, fullName: row.name, email: row.email || '', phone: row.phone, createdAt: row.created_at, role: 'customer', authUserId: row.auth_user_id || '' }; }); },
    subscribeNewsletter: async function (email) { const clean = String(email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('Please enter a valid email.'); return Store.supabase.rpc('subscribe_newsletter', { p_email: clean }); },
    updateCustomer: async function (userId, patch) {
      if (!userId) throw new Error('Customer id is required.');
      const current = (await this.listCustomers()).find(function (item) { return item.id === userId; });
      if (!current) throw new Error('Customer not found.');
      return rpcAdmin('admin_update_customer', { p_customer_id: userId, p_name: patch.fullName, p_phone: patch.phone, p_email: patch.email || current.email });
    }
  };
  const useRemote = Store.config.dataMode === 'supabase';
  const unavailable = new Proxy({ mode: 'unavailable' }, {
    get: function (target, key) { if (key in target) return target[key]; return async function () { throw new Error('Store backend is unavailable.'); }; }
  });
  const repository = useRemote && Store.supabase.ready ? remote : unavailable;
  Store.repo = repository;
  Store.repo.mode = useRemote && Store.supabase.ready ? 'supabase' : 'unavailable';
  Store.repo.helpers = { slugify: slugify, activeVariants: activeVariants, effectivePrice: effectivePrice, availableStock: availableStock, normalizePhone: normalizePhone, statuses: allowedStatuses };
  Store.useSupabase = useRemote && Store.supabase.ready;
  Store.isProduction = Store.useSupabase;
})(window.Store);
