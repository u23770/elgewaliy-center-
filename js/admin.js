(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const tx = function (en, ar) { return Store.i18n.locale === 'ar' ? ar : en; };
  const C = function () { return Store.Components; };
  const esc = function (value) { return Store.escape(value); };
  const loc = function (value) { return Store.i18n.localized(value); };
  const Pages = Store.Pages = Store.Pages || {};
  const statusKeys = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  function adminLink(file) { return Store.url('admin/' + file + '.html'); }
  function adminNav(active) {
    const nav = [
      ['index', 'dashboard', '▦'], ['products', 'adminProducts', '□'], ['categories', 'adminCategories', '◇'], ['inventory', 'inventory', '▤'], ['attributes', 'attributes', '◈'], ['customizer', 'websiteCustomizer', '✦'], ['content', 'websiteContent', '✎'], ['media', 'mediaLibrary', '▣'], ['sections', 'homepageSections', '≡'], ['banners', 'banners', '▰'], ['gallery', 'gallery', '▤'], ['socials', 'socialLinks', '◎'], ['orders', 'adminOrders', '▣'], ['zones', 'deliveryZones', '⌖'], ['deliveries', 'deliveries', '⇢'], ['drivers', 'drivers', '♢'], ['customers', 'customers', '♙'], ['reviews', 'reviews', '★'], ['promotions', 'promotions', '✳'], ['settings', 'settings', '⚙']
    ];
    return nav.map(function (item) { return '<a class="admin-nav-link ' + (active === item[0] ? 'active' : '') + '" href="' + adminLink(item[0]) + '"><span class="admin-nav-icon" aria-hidden="true">' + item[2] + '</span><span>' + t(item[1]) + '</span><i></i></a>'; }).join('');
  }
  function shell(active, pageTitle, content) {
    const isLive = Store.useSupabase === true;
    const liveLabel = isLive ? (Store.i18n.locale === 'ar' ? 'LIVE · EGP' : 'LIVE · EGP') : 'LOCAL DEMO · EGP';
    const liveStatus = isLive ? (Store.i18n.locale === 'ar' ? 'متصل بالمتجر' : 'Live store') : t('demoMode');
    return '<div class="admin-app" dir="' + Store.i18n.dir + '"><aside class="admin-sidebar" id="admin-sidebar"><div class="admin-brand-row"><a class="admin-brand" href="' + Store.url('index.html') + '"><span class="brand-mark"><b>ج</b><i></i></span><span><strong>' + t('brand') + '</strong><small>' + t('admin') + '</small></span></a><button type="button" class="admin-close-mobile" data-action="admin-menu-close" aria-label="' + t('close') + '">' + C().icon('close', 19) + '</button></div><div class="admin-nav-label">' + t('dashboard') + '</div><nav class="admin-nav" aria-label="' + t('admin') + '">' + adminNav(active) + '</nav><div class="admin-sidebar-footer"><div class="admin-user-chip"><span>' + esc((Store.AdminGate.adminUser().fullName || 'A').charAt(0).toUpperCase()) + '</span><div><strong>' + esc(Store.AdminGate.adminUser().fullName || t('admin')) + '</strong><small>' + esc('ADMIN · ACCESS CODE') + '</small></div></div><button class="admin-logout" type="button" data-action="sign-out">' + C().icon('user', 15) + t('signOut') + '</button></div></aside><button class="admin-backdrop" type="button" data-action="admin-menu-close" aria-label="' + t('close') + '"></button><div class="admin-main"><header class="admin-topbar"><div class="admin-topbar-start"><button class="admin-menu-toggle" type="button" data-action="admin-menu-open" aria-label="' + t('menu') + '">' + C().icon('menu', 20) + '</button><span class="admin-topbar-mark">EG / 09</span><span>' + esc(pageTitle) + '</span></div><div class="admin-topbar-actions"><span class="admin-live-indicator"><i></i>' + liveStatus + '</span><button class="language-toggle" type="button" data-action="switch-language">' + t('language') + '</button><a href="' + Store.url('index.html') + '" class="button button-outline button-small">' + C().icon('bag', 15) + t('viewStore') + '</a></div></header>' + (isLive ? '' : '<div class="admin-demo-banner">' + C().icon('info', 15) + t('demoBanner') + '</div>') + '<main class="admin-content"><header class="admin-page-heading"><div><span class="eyebrow">CENTER EL GOWAILY · ' + t('admin') + '</span><h1>' + esc(pageTitle) + '</h1></div></header>' + content + '</main><footer class="admin-footer"><span>© ' + new Date().getFullYear() + ' ' + t('brand') + '</span><span>' + liveLabel + '</span></footer></div><div id="admin-modal-root"></div></div>';
  }
  function sectionHead(eyebrow, title, action) { return '<div class="admin-section-head"><div><span class="eyebrow">' + eyebrow + '</span><h2>' + title + '</h2></div>' + (action || '') + '</div>'; }
  function stockFor(product) { return (product.variants || []).length ? product.variants.reduce(function (sum, variant) { return sum + Number(variant.stock || 0); }, 0) : Number(product.stock || 0); }
  function statusSelect(order) { return '<label class="visually-hidden" for="status-' + esc(order.id) + '">' + t('updateStatus') + '</label><select class="status-select" id="status-' + esc(order.id) + '" data-action="order-status" data-order-id="' + esc(order.id) + '">' + statusKeys.map(function (status) { return '<option value="' + status + '" ' + (order.status === status ? 'selected' : '') + '>' + t('status_' + status) + '</option>'; }).join('') + '</select>'; }
  function productRow(product, category) {
    const name = loc(product.name);
    const image = Store.asset(Store.safeImage(product.images && product.images[0]));
    return '<tr><td><div class="admin-product-cell"><img src="' + image + '" alt="" loading="lazy"><div><strong>' + esc(name) + '</strong><small>' + esc(product.sku) + '</small></div></div></td><td>' + esc(category ? loc(category.name) : '—') + '</td><td><strong>' + C().money(product.salePrice || product.price) + '</strong>' + (product.salePrice ? '<small class="table-subline"><del>' + C().money(product.price) + '</del></small>' : '') + '</td><td>' + stockFor(product) + '</td><td><span class="admin-visibility ' + (product.active ? 'active' : '') + '"><i></i>' + t(product.active ? 'active' : 'inactive') + '</span></td><td><div class="admin-row-actions"><button class="icon-button" type="button" data-action="edit-product" data-id="' + esc(product.id) + '" aria-label="' + t('edit') + '">' + C().icon('edit', 16) + '</button><button class="icon-button danger-icon" type="button" data-action="delete-product" data-id="' + esc(product.id) + '" aria-label="' + t('delete') + '">' + C().icon('trash', 16) + '</button></div></td></tr>';
  }
  async function dashboardContent() {
    const [products, orders, customers] = await Promise.all([Store.repo.listProducts({ includeInactive: true }), Store.repo.listOrders(), Store.repo.listCustomers()]);
    const active = products.filter(function (product) { return product.active; });
    const revenue = orders.filter(function (order) { return order.status !== 'cancelled'; }).reduce(function (sum, order) { return sum + Number(order.total); }, 0);
    const todayOrders = orders.filter(function (order) { return String(order.createdAt).slice(0, 10) === new Date().toISOString().slice(0, 10); }).length;
    const stats = [['revenue', C().money(revenue), 'EGP · ' + orders.length + ' ' + t('ordersCount'), '↗'], ['ordersCount', String(orders.length), todayOrders + ' ' + (Store.i18n.locale === 'ar' ? 'اليوم' : 'today'), '▣'], ['productsCount', String(active.length), products.length - active.length + ' ' + t('inactive').toLowerCase(), '□'], ['customersCount', String(customers.length), Store.i18n.locale === 'ar' ? 'حسابات العملاء' : 'customer accounts', '♙']];
    const recent = orders.slice(0, 5);
    const best = active.slice().sort(function (a, b) { return stockFor(a) - stockFor(b); }).slice(0, 4);
    return '<section class="admin-stat-grid">' + stats.map(function (item, index) { return '<article class="admin-stat-card ' + (index === 0 ? 'stat-card-warm' : '') + '"><div><span>' + t(item[0]) + '</span><i>' + item[3] + '</i></div><strong>' + item[1] + '</strong><small>' + item[2] + '</small></article>'; }).join('') + '</section><section class="admin-dashboard-grid"><article class="admin-panel recent-orders-panel">' + sectionHead(t('adminOrders'), t('recentOrders'), '<a class="text-link" href="' + adminLink('orders') + '">' + t('viewAll') + C().icon('arrow', 15) + '</a>') + (recent.length ? '<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>' + t('orderNumberLabel') + '</th><th>' + t('customer') + '</th><th>' + t('orderDate') + '</th><th>' + t('totalLabel') + '</th><th>' + t('orderStatus') + '</th></tr></thead><tbody>' + recent.map(function (order) { return '<tr><td><button class="text-button" data-action="view-order" data-id="' + esc(order.id) + '">' + esc(order.orderNumber) + '</button></td><td>' + esc(order.customer.name) + '</td><td>' + C().date(order.createdAt) + '</td><td>' + C().money(order.total) + '</td><td>' + C().status(order.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : C().empty('bag', t('noAdminOrders'), '', '<a class="button button-outline" href="' + adminLink('products') + '">' + t('adminProducts') + '</a>')) + '</article><div class="admin-dashboard-side"><article class="admin-panel quick-panel">' + sectionHead(t('manageStore'), t('quickActions'), '') + '<a href="' + adminLink('products') + '?new=1" class="quick-action"><i>＋</i><span>' + t('addProduct') + '</span>' + C().icon('arrow', 15) + '</a><a href="' + adminLink('categories') + '?new=1" class="quick-action"><i>◇</i><span>' + t('addCategory') + '</span>' + C().icon('arrow', 15) + '</a><a href="' + adminLink('promotions') + '?new=1" class="quick-action"><i>✳</i><span>' + t('createPromotion') + '</span>' + C().icon('arrow', 15) + '</a></article><article class="admin-panel stock-panel">' + sectionHead(t('inventory'), t('lowStockLabel'), '<a href="' + adminLink('inventory') + '" class="text-button">' + t('viewAll') + '</a>') + (best.length ? '<div class="low-stock-list">' + best.map(function (product) { return '<a href="' + adminLink('products') + '" class="low-stock-item"><img src="' + Store.asset(Store.safeImage(product.images && product.images[0])) + '" alt=""><span><strong>' + esc(loc(product.name)) + '</strong><small>' + esc(product.sku) + '</small></span><b class="' + (stockFor(product) <= 4 ? 'stock-danger' : '') + '">' + stockFor(product) + '</b></a>'; }).join('') + '</div>' : C().empty('box', t('inventoryEmpty'), '')) + '</article></div></section>';
  }
  function modalHost(content) { const host = document.getElementById('admin-modal-root'); if (host) host.innerHTML = content; }
  function closeModal() { modalHost(''); }
  function openProductEditor(product, categories, sizes, colors) {
    const editing = Boolean(product);
    const item = product || { id: '', name: { en: '', ar: '' }, description: { en: '', ar: '' }, categoryId: '', images: [], price: '', salePrice: '', sku: '', stock: 0, active: true, featured: false, variants: [] };
    const variants = item.variants || [];
    const hasSize = variants.some(function (variant) { return Boolean(variant.size); });
    const hasColor = variants.some(function (variant) { return Boolean(variant.color); });
    const mode = variants.length ? (hasSize && hasColor ? 'size-color' : hasSize ? 'size' : 'color') : 'none';
    const chosenSizes = Array.from(new Set(variants.map(function (variant) { return variant.size; }).filter(Boolean)));
    const chosenColors = Array.from(new Set(variants.map(function (variant) { return variant.color && variant.color.key; }).filter(Boolean)));
    const categoryOptions = '<option value="">' + t('chooseCategory') + '</option>' + categories.map(function (category) { return '<option value="' + esc(category.id) + '" ' + (item.categoryId === category.id ? 'selected' : '') + '>' + esc(loc(category.name)) + '</option>'; }).join('');
    const sizeOptions = sizes.map(function (size) { return '<label class="option-check"><input type="checkbox" name="variantSizes" value="' + esc(size.label) + '" ' + (chosenSizes.indexOf(size.label) >= 0 ? 'checked' : '') + '><span>' + esc(size.label) + '</span></label>'; }).join('');
    const colorOptions = colors.map(function (color) { return '<label class="option-check color-option-check"><input type="checkbox" name="variantColors" value="' + esc(color.key) + '" ' + (chosenColors.indexOf(color.key) >= 0 ? 'checked' : '') + '><i style="--swatch:' + esc(Store.safeColor(color.hex)) + '"></i><span>' + esc(loc(color.name)) + '</span></label>'; }).join('');
    const content = '<form id="product-editor-form" class="admin-editor-form"><input type="hidden" name="id" value="' + esc(item.id) + '"><div class="editor-section"><span class="eyebrow">01 · ' + t('productDetails') + '</span><div class="admin-form-grid"><label class="field"><span>' + t('nameEnglish') + '</span><input name="nameEn" required value="' + esc(item.name.en) + '"></label><label class="field"><span>' + t('nameArabic') + '</span><input name="nameAr" required value="' + esc(item.name.ar) + '"></label><label class="field"><span>' + t('descriptionEnglish') + '</span><textarea name="descriptionEn" rows="3">' + esc(item.description.en) + '</textarea></label><label class="field"><span>' + t('descriptionArabic') + '</span><textarea name="descriptionAr" rows="3">' + esc(item.description.ar) + '</textarea></label><label class="field"><span>' + t('categoryLabel') + '</span><select name="categoryId" required>' + categoryOptions + '</select></label><label class="field"><span>' + t('skuLabel') + '</span><input name="sku" required value="' + esc(item.sku) + '"></label><label class="field"><span>' + t('priceLabel') + '</span><input name="price" type="number" min="1" step="1" required value="' + esc(item.price) + '"></label><label class="field"><span>' + t('salePriceLabel') + '</span><input name="salePrice" type="number" min="0" step="1" value="' + esc(item.salePrice == null ? '' : item.salePrice) + '"></label><label class="field field-wide"><span>' + t('imagesLabel') + '</span><textarea name="images" rows="3" placeholder="assets/images/look-tee.jpg">' + esc((item.images || []).join('\n')) + '</textarea></label></div><div class="admin-form-flags"><label class="check-row"><input name="active" type="checkbox" ' + (item.active ? 'checked' : '') + '><span>' + t('productActive') + '</span></label><label class="check-row"><input name="featured" type="checkbox" ' + (item.featured ? 'checked' : '') + '><span>' + t('featuredProduct') + '</span></label></div></div><div class="editor-section"><span class="eyebrow">02 · ' + t('variantMode') + '</span><label class="field"><span>' + t('variantMode') + '</span><select name="variantMode" id="variant-mode"><option value="none" ' + (mode === 'none' ? 'selected' : '') + '>' + t('noVariants') + '</option><option value="size" ' + (mode === 'size' ? 'selected' : '') + '>' + t('sizeOnly') + '</option><option value="color" ' + (mode === 'color' ? 'selected' : '') + '>' + t('colourOnly') + '</option><option value="size-color" ' + (mode === 'size-color' ? 'selected' : '') + '>' + t('sizeAndColour') + '</option></select></label><div id="variant-options" class="variant-options ' + (mode === 'none' ? 'hidden' : '') + '"><div class="variant-option-block ' + (mode === 'color' ? 'hidden' : '') + '" id="size-option-block"><strong>' + t('selectSizes') + '</strong><div class="option-check-list">' + sizeOptions + '</div></div><div class="variant-option-block ' + (mode === 'size' ? 'hidden' : '') + '" id="color-option-block"><strong>' + t('selectColours') + '</strong><div class="option-check-list">' + colorOptions + '</div></div><button class="button button-outline button-small" type="button" data-action="generate-variants">' + t('generateVariants') + '</button><p class="form-hint">' + t('noVariantsWarning') + '</p></div><div id="variant-editor-rows">' + variantRows(variants) + '</div><div class="simple-stock-field ' + (mode !== 'none' ? 'hidden' : '') + '" id="simple-stock-field"><label class="field"><span>' + t('stockLabel') + '</span><input name="stock" type="number" min="0" step="1" value="' + esc(item.stock || 0) + '"></label></div></div><div class="modal-actions editor-actions"><button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button><button type="submit" class="button button-primary">' + t('save') + C().icon('check', 16) + '</button></div></form>';
    modalHost(C().modal(editing ? t('edit') + ' · ' + loc(item.name) : t('addProduct'), content));
    const form = document.getElementById('product-editor-form');
    const modeInput = document.getElementById('variant-mode');
    modeInput.addEventListener('change', function () {
      const value = modeInput.value;
      document.getElementById('variant-options').classList.toggle('hidden', value === 'none');
      document.getElementById('size-option-block').classList.toggle('hidden', value === 'color' || value === 'none');
      document.getElementById('color-option-block').classList.toggle('hidden', value === 'size' || value === 'none');
      document.getElementById('simple-stock-field').classList.toggle('hidden', value !== 'none');
    });
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); if (!form.reportValidity()) return;
      const values = new FormData(form); const variantMode = values.get('variantMode');
      const rowNodes = Array.from(form.querySelectorAll('.variant-editor-row'));
      const outputVariants = variantMode === 'none' ? [] : rowNodes.map(function (row) {
        const colorKey = row.dataset.color || ''; const color = colors.find(function (entry) { return entry.key === colorKey; }) || null;
        return { id: row.dataset.id || Store.id(), size: row.dataset.size || '', color: color ? Store.clone(color) : null, sku: row.querySelector('[data-variant-sku]').value.trim(), stock: Math.max(0, Number(row.querySelector('[data-variant-stock]').value || 0)), price: row.querySelector('[data-variant-price]').value ? Number(row.querySelector('[data-variant-price]').value) : null, active: row.querySelector('[data-variant-active]').checked };
      });
      if (variantMode !== 'none' && !outputVariants.length) { C().toast(t('noVariantsWarning'), 'error'); return; }
      const images = String(values.get('images') || '').split(/\r?\n/).map(function (url) { return Store.safeExternalUrl(url); }).filter(Boolean);
      const payload = { id: values.get('id') || undefined, name: { en: values.get('nameEn').trim(), ar: values.get('nameAr').trim() }, description: { en: values.get('descriptionEn').trim(), ar: values.get('descriptionAr').trim() }, categoryId: values.get('categoryId'), price: Number(values.get('price')), salePrice: values.get('salePrice') === '' ? null : Number(values.get('salePrice')), sku: values.get('sku').trim(), images: images, active: values.has('active'), featured: values.has('featured'), stock: variantMode === 'none' ? Number(values.get('stock') || 0) : 0, variants: outputVariants };
      try { await Store.repo.saveProduct(payload); C().toast(t('productSaved'), 'success'); closeModal(); Store.renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); }
    });
  }
  function variantRows(variants) {
    if (!variants || !variants.length) return '';
    return '<div class="variant-editor-table"><div class="variant-editor-head"><span>' + t('size') + ' / ' + t('colour') + '</span><span>' + t('variantSku') + '</span><span>' + t('variantStock') + '</span><span>' + t('variantPrice') + '</span><span>' + t('active') + '</span></div>' + variants.map(function (variant) { const label = [variant.size, variant.color && loc(variant.color.name)].filter(Boolean).join(' · ') || '—'; return '<div class="variant-editor-row" data-id="' + esc(variant.id || '') + '" data-size="' + esc(variant.size || '') + '" data-color="' + esc(variant.color && variant.color.key || '') + '"><span class="variant-combination">' + esc(label) + '</span><input data-variant-sku value="' + esc(variant.sku || '') + '" aria-label="' + t('variantSku') + '"><input data-variant-stock type="number" min="0" step="1" value="' + esc(variant.stock || 0) + '" aria-label="' + t('variantStock') + '"><input data-variant-price type="number" min="0" step="1" value="' + esc(variant.price == null ? '' : variant.price) + '" aria-label="' + t('variantPrice') + '"><input data-variant-active type="checkbox" ' + (variant.active !== false ? 'checked' : '') + ' aria-label="' + t('active') + '"></div>'; }).join('') + '</div>';
  }
  function generateVariantRows(form, sizes, colors) {
    const mode = form.elements.variantMode.value;
    const selectedSizes = Array.from(form.querySelectorAll('[name="variantSizes"]:checked')).map(function (item) { return item.value; });
    const selectedColors = Array.from(form.querySelectorAll('[name="variantColors"]:checked')).map(function (item) { return item.value; });
    const hasSizes = mode === 'size' || mode === 'size-color'; const hasColors = mode === 'color' || mode === 'size-color';
    const ss = hasSizes ? selectedSizes : ['']; const cc = hasColors ? selectedColors : [''];
    if (!ss.length || !cc.length) { C().toast(t('noVariantsWarning'), 'error'); return; }
    const existing = Array.from(form.querySelectorAll('.variant-editor-row')).map(function (row) { return { size: row.dataset.size, color: row.dataset.color, id: row.dataset.id, sku: row.querySelector('[data-variant-sku]').value, stock: row.querySelector('[data-variant-stock]').value, price: row.querySelector('[data-variant-price]').value, active: row.querySelector('[data-variant-active]').checked }; });
    const rows = [];
    ss.forEach(function (size) { cc.forEach(function (colorKey) { const old = existing.find(function (entry) { return entry.size === size && entry.color === colorKey; }); const color = colors.find(function (entry) { return entry.key === colorKey; }); rows.push({ id: old && old.id || Store.id(), size: size, color: color || null, sku: old && old.sku || ['EG', form.elements.sku.value, size, colorKey].filter(Boolean).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, ''), stock: old && old.stock || 0, price: old && old.price || null, active: old ? old.active : true }); }); });
    document.getElementById('variant-editor-rows').innerHTML = variantRows(rows);
  }
  async function productsContent() {
    const [products, categories] = await Promise.all([Store.repo.listProducts({ includeInactive: true }), Store.repo.listCategories(true)]);
    const state = Store.view.adminProducts || (Store.view.adminProducts = { q: '', status: 'all' });
    const filtered = products.filter(function (product) { const searchable = (product.name.en + ' ' + product.name.ar + ' ' + product.sku).toLowerCase(); return (!state.q || searchable.includes(state.q.toLowerCase())) && (state.status === 'all' || (state.status === 'active' ? product.active : !product.active)); });
    const html = '<div class="admin-toolbar"><label class="admin-search"><span class="visually-hidden">' + t('search') + '</span>' + C().icon('search', 16) + '<input id="admin-product-search" type="search" placeholder="' + t('searchProducts') + '" value="' + esc(state.q) + '"></label><label class="field compact-field"><span class="visually-hidden">' + t('allStatuses') + '</span><select id="admin-product-status"><option value="all">' + t('allStatuses') + '</option><option value="active" ' + (state.status === 'active' ? 'selected' : '') + '>' + t('active') + '</option><option value="inactive" ' + (state.status === 'inactive' ? 'selected' : '') + '>' + t('inactive') + '</option></select></label><div class="admin-toolbar-actions"><button class="button button-outline" type="button" data-action="import-products">' + t('importProducts') + '</button><button class="button button-primary" type="button" data-action="add-product">' + C().icon('plus', 16) + t('addProduct') + '</button></div></div><section class="admin-panel admin-table-panel">' + sectionHead(t('adminProducts'), t('productsCount') + ' · ' + filtered.length, '') + (filtered.length ? '<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>' + t('adminProducts') + '</th><th>' + t('categoryLabel') + '</th><th>' + t('price') + '</th><th>' + t('inventory') + '</th><th>' + t('active') + '</th><th>' + t('actions') + '</th></tr></thead><tbody>' + filtered.map(function (product) { return productRow(product, categories.find(function (category) { return category.id === product.categoryId; })); }).join('') + '</tbody></table></div>' : C().empty('box', t('noProductsAdmin'), t('noProductsBody'))) + '</section>';
    return { html: html, categories: categories };
  }
  async function categoriesContent() {
    const categories = await Store.repo.listCategories(true);
    return '<div class="admin-toolbar"><span class="toolbar-copy">' + t('categoryDescription') + '</span><button class="button button-primary" type="button" data-action="add-category">' + C().icon('plus', 16) + t('addCategory') + '</button></div><div class="admin-category-grid">' + (categories.length ? categories.map(function (category) { return '<article class="admin-category-card"><div class="admin-category-image"><img src="' + Store.asset(Store.safeImage(category.image)) + '" alt="" loading="lazy"></div><div class="admin-category-copy"><span class="eyebrow">' + String(category.order || 0).padStart(2, '0') + ' · ' + (category.active ? t('active') : t('inactive')) + '</span><h2>' + esc(loc(category.name)) + '</h2><p>' + esc(loc(category.description)) + '</p><code>' + esc(category.slug) + '</code><div><button class="button button-outline button-small" type="button" data-action="edit-category" data-id="' + esc(category.id) + '">' + t('edit') + '</button><button class="icon-button danger-icon" type="button" data-action="delete-category" data-id="' + esc(category.id) + '" aria-label="' + t('delete') + '">' + C().icon('trash', 15) + '</button></div></div></article>'; }).join('') : C().empty('box', t('emptyTitle'), t('categoriesEmpty'))) + '</div>';
  }
  function openCategoryEditor(category) {
    const item = category || { id: '', slug: '', name: { en: '', ar: '' }, description: { en: '', ar: '' }, image: '', order: 1, active: true };
    const content = '<form id="category-editor-form" class="admin-editor-form"><input type="hidden" name="id" value="' + esc(item.id) + '"><div class="admin-form-grid"><label class="field"><span>' + t('nameEnglish') + '</span><input name="nameEn" required value="' + esc(item.name.en) + '"></label><label class="field"><span>' + t('nameArabic') + '</span><input name="nameAr" required value="' + esc(item.name.ar) + '"></label><label class="field"><span>' + t('slug') + '</span><input name="slug" value="' + esc(item.slug) + '"></label><label class="field"><span>' + t('sortOrder') + '</span><input name="order" type="number" min="0" value="' + esc(item.order || 0) + '"></label><label class="field"><span>' + t('descriptionEnglish') + '</span><textarea name="descriptionEn" rows="3">' + esc(item.description.en) + '</textarea></label><label class="field"><span>' + t('descriptionArabic') + '</span><textarea name="descriptionAr" rows="3">' + esc(item.description.ar) + '</textarea></label><label class="field field-wide"><span>' + t('imageUrl') + '</span><input name="image" value="' + esc(item.image || '') + '"></label><label class="check-row"><input name="active" type="checkbox" ' + (item.active ? 'checked' : '') + '><span>' + t('active') + '</span></label></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button><button class="button button-primary" type="submit">' + t('save') + '</button></div></form>';
    modalHost(C().modal(category ? t('edit') + ' · ' + loc(category.name) : t('addCategory'), content));
    document.getElementById('category-editor-form').addEventListener('submit', async function (event) { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; const values = new FormData(form); try { await Store.repo.saveCategory({ id: values.get('id') || undefined, slug: values.get('slug'), name: { en: values.get('nameEn'), ar: values.get('nameAr') }, description: { en: values.get('descriptionEn'), ar: values.get('descriptionAr') }, image: Store.safeExternalUrl(values.get('image')) || '', order: values.get('order'), active: values.has('active') }); C().toast(t('categorySaved')); closeModal(); Store.renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } });
  }
  async function attributesContent() {
    const [sizes, colors] = await Promise.all([Store.repo.listSizes(true), Store.repo.listColors(true)]);
    return '<div class="attributes-columns"><section class="admin-panel attributes-panel">' + sectionHead(t('attributes'), t('size'), '<button class="button button-outline button-small" data-action="add-size">' + C().icon('plus', 15) + t('addSize') + '</button>') + (sizes.length ? '<div class="attribute-list">' + sizes.map(function (size) { return '<div class="attribute-row"><span class="size-tag">' + esc(size.label) + '</span><span class="attribute-active ' + (size.active ? 'on' : '') + '">' + t(size.active ? 'active' : 'inactive') + '</span><button type="button" class="icon-button danger-icon" data-action="delete-size" data-id="' + esc(size.id) + '" aria-label="' + t('delete') + '">' + C().icon('trash', 15) + '</button></div>'; }).join('') + '</div>' : C().empty('box', t('emptyTitle'), t('inventoryEmpty'))) + '</section><section class="admin-panel attributes-panel">' + sectionHead(t('attributes'), t('colour'), '<button class="button button-outline button-small" data-action="add-color">' + C().icon('plus', 15) + t('addColour') + '</button>') + (colors.length ? '<div class="attribute-list">' + colors.map(function (color) { return '<div class="attribute-row"><i class="color-swatch" style="--swatch:' + esc(Store.safeColor(color.hex)) + '"></i><span class="attribute-name"><strong>' + esc(loc(color.name)) + '</strong><small>' + esc(color.key) + '</small></span><span class="attribute-active ' + (color.active ? 'on' : '') + '">' + t(color.active ? 'active' : 'inactive') + '</span><button type="button" class="icon-button danger-icon" data-action="delete-color" data-id="' + esc(color.id) + '" aria-label="' + t('delete') + '">' + C().icon('trash', 15) + '</button></div>'; }).join('') + '</div>' : C().empty('box', t('emptyTitle'), t('inventoryEmpty'))) + '</section></div>';
  }
  function openSizeEditor(size) {
    const content = '<form id="size-form" class="admin-editor-form"><label class="field"><span>' + t('sizeLabel') + '</span><input name="label" required value="' + esc(size && size.label || '') + '"></label><label class="field"><span>' + t('sortOrder') + '</span><input name="order" type="number" value="' + esc(size && size.order || 0) + '"></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button><button class="button button-primary" type="submit">' + t('save') + '</button></div></form>';
    modalHost(C().modal(t('addSize'), content));
    document.getElementById('size-form').addEventListener('submit', async function (event) { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; const values = new FormData(form); try { await Store.repo.saveSize({ id: size && size.id, label: values.get('label'), order: values.get('order'), active: true }); C().toast(t('attributeSaved')); closeModal(); Store.renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } });
  }
  function openColorEditor(color) {
    const item = color || { id: '', key: '', name: { en: '', ar: '' }, hex: '#777e60' };
    const content = '<form id="color-form" class="admin-editor-form"><div class="admin-form-grid"><label class="field"><span>' + t('colourNameEn') + '</span><input name="nameEn" required value="' + esc(item.name.en) + '"></label><label class="field"><span>' + t('colourNameAr') + '</span><input name="nameAr" required value="' + esc(item.name.ar) + '"></label><label class="field"><span>' + t('slug') + '</span><input name="key" required value="' + esc(item.key) + '"></label><label class="field"><span>' + t('colourHex') + '</span><input name="hex" type="color" value="' + esc(item.hex || '#777e60') + '"></label></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button><button class="button button-primary" type="submit">' + t('save') + '</button></div></form>';
    modalHost(C().modal(t('addColour'), content));
    document.getElementById('color-form').addEventListener('submit', async function (event) { event.preventDefault(); const values = new FormData(event.currentTarget); try { await Store.repo.saveColor({ id: item.id || undefined, key: values.get('key'), name: { en: values.get('nameEn'), ar: values.get('nameAr') }, hex: values.get('hex'), active: true }); C().toast(t('attributeSaved')); closeModal(); Store.renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } });
  }
  async function inventoryContent() {
    const products = await Store.repo.listProducts({ includeInactive: true });
    const rows = [];
    products.forEach(function (product) { if (product.variants && product.variants.length) product.variants.forEach(function (variant) { rows.push({ product: product, variant: variant }); }); else rows.push({ product: product, variant: null }); });
    return '<div class="admin-toolbar"><span>' + t('inventory') + ' · ' + rows.length + '</span><a class="button button-outline" href="' + adminLink('products') + '">' + t('adminProducts') + '</a></div><section class="admin-panel admin-table-panel">' + (rows.length ? '<div class="admin-table-scroll"><table class="admin-table inventory-table"><thead><tr><th>' + t('adminProducts') + '</th><th>' + t('variantMode') + '</th><th>' + t('variantSku') + '</th><th>' + t('variantStock') + '</th><th>' + t('actions') + '</th></tr></thead><tbody>' + rows.map(function (row) { const label = row.variant ? [row.variant.size, row.variant.color && loc(row.variant.color.name)].filter(Boolean).join(' · ') || '—' : t('noVariants'); return '<tr><td><div class="admin-product-cell"><img src="' + Store.asset(Store.safeImage(row.product.images[0])) + '" alt=""><div><strong>' + esc(loc(row.product.name)) + '</strong><small>' + esc(row.product.sku) + '</small></div></div></td><td>' + esc(label) + '</td><td>' + esc(row.variant && row.variant.sku || row.product.sku) + '</td><td><input class="inline-stock-input" type="number" min="0" step="1" value="' + (row.variant ? Number(row.variant.stock) : Number(row.product.stock)) + '" data-stock-input data-product-id="' + esc(row.product.id) + '" data-variant-id="' + esc(row.variant && row.variant.id || '') + '" aria-label="' + t('variantStock') + '"></td><td><button class="button button-outline button-small" type="button" data-action="save-stock" data-product-id="' + esc(row.product.id) + '" data-variant-id="' + esc(row.variant && row.variant.id || '') + '">' + t('save') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : C().empty('box', t('inventoryEmpty'), t('inventoryEmpty'))) + '</section>';
  }
  async function ordersContent() {
    const orders = await Store.repo.listOrders();
    return '<div class="admin-toolbar"><label class="field compact-field"><span class="visually-hidden">' + t('allStatuses') + '</span><select id="admin-order-filter"><option value="all">' + t('allStatuses') + '</option>' + statusKeys.map(function (status) { return '<option value="' + status + '">' + t('status_' + status) + '</option>'; }).join('') + '</select></label><span class="toolbar-copy">' + orders.length + ' · ' + t('adminOrders') + '</span></div><section class="admin-panel admin-table-panel">' + (orders.length ? '<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>' + t('orderNumberLabel') + '</th><th>' + t('customer') + '</th><th>' + t('orderDate') + '</th><th>' + t('items') + '</th><th>' + t('totalLabel') + '</th><th>' + t('orderStatus') + '</th><th>' + t('actions') + '</th></tr></thead><tbody id="admin-orders-body">' + orders.map(function (order) { return '<tr data-order-status="' + esc(order.status) + '"><td><button type="button" class="text-button" data-action="view-order" data-id="' + esc(order.id) + '">' + esc(order.orderNumber) + '</button></td><td>' + esc(order.customer.name) + '<small class="table-subline">' + esc(order.customer.phone) + '</small></td><td>' + C().date(order.createdAt) + '</td><td>' + order.items.reduce(function (sum, item) { return sum + item.quantity; }, 0) + '</td><td>' + C().money(order.total) + '</td><td>' + statusSelect(order) + '</td><td><button class="icon-button" type="button" data-action="view-order" data-id="' + esc(order.id) + '" aria-label="' + t('orderDetails') + '">' + C().icon('arrow', 16) + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : C().empty('bag', t('noAdminOrders'), '')) + '</section>';
  }
  async function customersContent() {
    const [customers, orders] = await Promise.all([Store.repo.listCustomers(), Store.repo.listOrders()]);
    const customersHtml = customers.map(function (customer) { const customerOrders = orders.filter(function (order) { return order.userId === customer.id; }); const spend = customerOrders.reduce(function (sum, order) { return sum + (order.status === 'cancelled' ? 0 : order.total); }, 0); return '<tr><td><div class="admin-customer-cell"><span>' + esc((customer.fullName || 'C').charAt(0).toUpperCase()) + '</span><div><strong>' + esc(customer.fullName || '—') + '</strong><small>' + esc(customer.email) + '</small></div></div></td><td>' + esc(customer.phone || '—') + '</td><td>' + C().date(customer.createdAt) + '</td><td>' + customerOrders.length + '</td><td>' + C().money(spend) + '</td></tr>'; }).join('');
    return '<div class="admin-toolbar"><span>' + customers.length + ' · ' + t('customers') + '</span></div><section class="admin-panel admin-table-panel">' + (customers.length ? '<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>' + t('customer') + '</th><th>' + t('customerPhone') + '</th><th>' + t('customerSince') + '</th><th>' + t('adminOrders') + '</th><th>' + t('revenue') + '</th></tr></thead><tbody>' + customersHtml + '</tbody></table></div>' : C().empty('user', t('noCustomers'), t('noCustomers'))) + '</section>';
  }
  function dateField(value) { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function promotionTargetOptions(scope, item, products, categories) {
    const selected = (item.targetIds || []).map(String);
    if (scope === 'category') {
      return categories.map(function (category) {
        return '<label class="option-check"><input type="checkbox" name="promotionTargetIds" value="' + esc(category.id) + '" ' + (selected.indexOf(String(category.id)) >= 0 ? 'checked' : '') + '><span>' + esc(loc(category.name)) + '</span></label>';
      }).join('');
    }
    if (scope === 'product') {
      return products.map(function (product) {
        return '<label class="option-check"><input type="checkbox" name="promotionTargetIds" value="' + esc(product.id) + '" ' + (selected.indexOf(String(product.id)) >= 0 ? 'checked' : '') + '><span>' + esc(loc(product.name)) + '</span></label>';
      }).join('');
    }
    return '';
  }

  function openPromotionEditor(promo, products, categories) {
    const item = promo || { id: '', code: '', title: { en: '', ar: '' }, type: 'percentage', value: '', scope: 'global', targetIds: [], minOrder: 0, maxDiscount: '', usageLimit: '', usedCount: 0, priority: 0, active: true, startsAt: '', endsAt: '' };
    products = products || []; categories = categories || [];
    const currentScope = item.scope || 'global';
    const targetBlock = '<div id="promotion-target-block" class="' + (currentScope === 'global' ? 'hidden' : '') + '"><label class="field field-wide"><span>' + t('promotionTargets') + '</span><div id="promotion-target-list" class="option-check-list">' + promotionTargetOptions(currentScope, item, products, categories) + '</div><small class="form-hint">' + t('noTargetWarning') + '</small></label></div>';
    const content = '<form id="promotion-form" class="admin-editor-form"><input type="hidden" name="id" value="' + esc(item.id) + '">' +
      '<div class="admin-form-grid">' +
        '<label class="field"><span>' + t('promotionCode') + '</span><input name="code" value="' + esc(item.code || '') + '" placeholder="' + t('automaticPromotion') + '"></label>' +
        '<label class="field"><span>' + t('promotionScope') + '</span><select name="scope" id="promotion-scope"><option value="global" ' + (currentScope === 'global' ? 'selected' : '') + '>' + t('promotionGlobal') + '</option><option value="category" ' + (currentScope === 'category' ? 'selected' : '') + '>' + t('promotionCategory') + '</option><option value="product" ' + (currentScope === 'product' ? 'selected' : '') + '>' + t('promotionProduct') + '</option></select></label>' +
        '<label class="field"><span>' + t('discountType') + '</span><select name="type"><option value="percentage" ' + (item.type === 'percentage' ? 'selected' : '') + '>' + t('percentage') + '</option><option value="fixed" ' + (item.type === 'fixed' ? 'selected' : '') + '>' + t('fixedAmount') + '</option></select></label>' +
        '<label class="field"><span>' + t('discountValue') + '</span><input name="value" type="number" min="1" step="0.01" required value="' + esc(item.value) + '"></label>' +
        '<label class="field"><span>' + t('promotionTitleEn') + '</span><input name="titleEn" required value="' + esc(item.title.en) + '"></label>' +
        '<label class="field"><span>' + t('promotionTitleAr') + '</span><input name="titleAr" required value="' + esc(item.title.ar) + '"></label>' +
        '<label class="field"><span>' + t('minimumOrder') + '</span><input name="minOrder" type="number" min="0" step="1" value="' + esc(item.minOrder || 0) + '"></label>' +
        '<label class="field"><span>' + t('maximumDiscount') + '</span><input name="maxDiscount" type="number" min="0" step="1" value="' + esc(item.maxDiscount == null ? '' : item.maxDiscount) + '"></label>' +
        '<label class="field"><span>' + t('usageLimit') + '</span><input name="usageLimit" type="number" min="0" step="1" value="' + esc(item.usageLimit == null ? '' : item.usageLimit) + '"><small class="form-hint">' + tx('Leave empty for unlimited.', 'اتركه فارغًا لعدد استخدامات غير محدود.') + '</small></label>' +
        '<label class="field"><span>' + t('priority') + '</span><input name="priority" type="number" step="1" value="' + esc(item.priority || 0) + '"></label>' +
        '<label class="field"><span>' + t('startsAt') + '</span><input name="startsAt" type="datetime-local" value="' + dateField(item.startsAt) + '"></label>' +
        '<label class="field"><span>' + t('endsAt') + '</span><input name="endsAt" type="datetime-local" value="' + dateField(item.endsAt) + '"></label>' +
        '<label class="check-row"><input name="active" type="checkbox" ' + (item.active ? 'checked' : '') + '><span>' + t('promotionActive') + '</span></label>' +
        targetBlock +
      '</div>' +
      '<div class="promotion-mode-note"><strong>' + (item.code ? t('couponPromotion') : t('automaticPromotion')) + '</strong><span>' + (item.code ? tx('Customers enter the code at checkout.', 'العميل يدخل الكود عند إتمام الطلب.') : tx('Applied automatically when eligible.', 'يطبق تلقائيًا عند استيفاء الشروط.')) + '</span></div>' +
      '<div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button><button class="button button-primary" type="submit">' + t('save') + '</button></div></form>';
    modalHost(C().modal(t('promotions'), content));

    const form = document.getElementById('promotion-form');
    const scopeInput = document.getElementById('promotion-scope');
    function refreshTargets() {
      const scope = scopeInput.value;
      const block = document.getElementById('promotion-target-block');
      const list = document.getElementById('promotion-target-list');
      if (!block || !list) return;
      block.classList.toggle('hidden', scope === 'global');
      if (scope !== 'global') list.innerHTML = promotionTargetOptions(scope, { targetIds: Array.from(form.querySelectorAll('[name="promotionTargetIds"]:checked')).map(function (node) { return node.value; }) }, products, categories);
    }
    scopeInput.addEventListener('change', refreshTargets);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const scope = values.get('scope');
      const targetIds = Array.from(form.querySelectorAll('[name="promotionTargetIds"]:checked')).map(function (node) { return node.value; });
      if (scope !== 'global' && !targetIds.length) { C().toast(t('noTargetWarning'), 'error'); return; }
      const code = String(values.get('code') || '').trim().toUpperCase();
      const payload = {
        id: values.get('id') || undefined,
        code: code,
        title: { en: String(values.get('titleEn') || '').trim(), ar: String(values.get('titleAr') || '').trim() },
        type: values.get('type'),
        value: Number(values.get('value')),
        scope: scope,
        targetIds: targetIds,
        minOrder: Number(values.get('minOrder') || 0),
        maxDiscount: values.get('maxDiscount') === '' ? null : Number(values.get('maxDiscount')),
        usageLimit: values.get('usageLimit') === '' ? null : Number(values.get('usageLimit')),
        priority: Number(values.get('priority') || 0),
        active: values.has('active'),
        startsAt: values.get('startsAt') ? new Date(values.get('startsAt')).toISOString() : '',
        endsAt: values.get('endsAt') ? new Date(values.get('endsAt')).toISOString() : ''
      };
      try {
        await Store.repo.savePromotion(payload);
        C().toast(t('promotionSaved'));
        closeModal();
        Store.renderCurrent();
      } catch (error) { C().toast(error.message || t('errorBody'), 'error'); }
    });
  }

  async function promotionsContent() {
    const [promotions, products, categories] = await Promise.all([
      Store.repo.listPromotions(true),
      Store.repo.listProducts({ includeInactive: true }),
      Store.repo.listCategories(true)
    ]);
    return '<div class="admin-toolbar"><span>' + promotions.length + ' · ' + t('promotions') + '</span><button class="button button-primary" type="button" data-action="add-promotion">' + C().icon('plus', 16) + t('createPromotion') + '</button></div><div class="promotion-grid">' +
      (promotions.length ? promotions.map(function (promo) {
        const scopeLabel = promo.scope === 'category' ? t('promotionCategory') : promo.scope === 'product' ? t('promotionProduct') : t('promotionGlobal');
        const codeLabel = promo.code ? '<code>' + esc(promo.code) + '</code>' : '<code>AUTO</code>';
        const limits = [];
        if (promo.minOrder > 0) limits.push(t('minimumOrder') + ': ' + C().money(promo.minOrder));
        if (promo.maxDiscount != null) limits.push(t('maximumDiscount') + ': ' + C().money(promo.maxDiscount));
        if (promo.usageLimit != null) limits.push(t('usageLimit') + ': ' + promo.usedCount + '/' + promo.usageLimit);
        return '<article class="promotion-card"><div class="promotion-ticket"><span>' + (promo.type === 'percentage' ? esc(promo.value) + '%' : C().money(promo.value)) + '</span><small>' + esc(scopeLabel) + '</small></div><div class="promotion-copy"><span class="eyebrow">' + (promo.active ? t('active') : t('inactive')) + ' · ' + esc(scopeLabel) + '</span><h2>' + esc(loc(promo.title)) + '</h2>' + codeLabel + '<small>' + (limits.length ? esc(limits.join(' · ')) + '<br>' : '') + (promo.startsAt ? C().date(promo.startsAt) : '—') + ' → ' + (promo.endsAt ? C().date(promo.endsAt) : '—') + '</small><div><button type="button" class="button button-outline button-small" data-action="edit-promotion" data-id="' + esc(promo.id) + '">' + t('edit') + '</button><button type="button" class="icon-button danger-icon" data-action="delete-promotion" data-id="' + esc(promo.id) + '" aria-label="' + t('delete') + '">' + C().icon('trash', 15) + '</button></div></div></article>';
      }).join('') : C().empty('info', t('noPromotions'), t('noPromotions'))) + '</div>';
  }
  async function settingsContent() {
    const settings = await Store.repo.getSettings();
    return '<section class="admin-panel settings-panel">' + sectionHead(t('settings'), t('settings'), '') + '<form id="settings-form" class="admin-form-grid"><label class="field"><span>' + t('storePhone') + '</span><input name="phone" type="tel" value="' + esc(settings.phone || '') + '"></label><label class="field"><span>' + t('storeEmail') + '</span><input name="email" type="email" value="' + esc(settings.email || '') + '"></label><label class="field"><span>' + t('storeAddressEn') + '</span><input name="addressEn" value="' + esc(settings.address && settings.address.en || '') + '"></label><label class="field"><span>' + t('storeAddressAr') + '</span><input name="addressAr" value="' + esc(settings.address && settings.address.ar || '') + '"></label><label class="field"><span>' + t('deliveryFeeLabel') + '</span><input name="deliveryFee" type="number" min="0" step="1" value="' + esc(settings.deliveryFee) + '"></label><label class="field"><span>' + t('freeDeliveryThreshold') + '</span><input name="freeDeliveryThreshold" type="number" min="0" step="50" value="' + esc(settings.freeDeliveryThreshold) + '"></label><label class="field"><span>' + t('lowStockThreshold') + '</span><input name="lowStockThreshold" type="number" min="0" value="' + esc(settings.lowStockThreshold || 4) + '"></label><label class="field field-wide"><span>' + t('deliveryMessageEn') + '</span><textarea name="deliveryNoteEn" rows="2">' + esc(settings.deliveryNote && settings.deliveryNote.en || '') + '</textarea></label><label class="field field-wide"><span>' + t('deliveryMessageAr') + '</span><textarea name="deliveryNoteAr" rows="2">' + esc(settings.deliveryNote && settings.deliveryNote.ar || '') + '</textarea></label><div class="settings-submit"><button class="button button-primary" type="submit">' + t('saveChanges') + C().icon('check', 16) + '</button></div></form></section><section class="admin-panel settings-note"><span>' + C().icon('shield', 19) + '</span><div><strong>' + (Store.i18n.locale === 'ar' ? 'إعداد تجريبي محلي' : 'Local preview settings') + '</strong><p>' + t('demoBanner') + '</p></div></section>';
  }
  async function modalOrder(order) {
    if (!order) return;
    const items = order.items.map(function (item) { return '<div class="order-line"><img src="' + Store.asset(Store.safeImage(item.image)) + '" alt=""><div><strong>' + esc(loc(item.name)) + '</strong><small>' + esc([item.size, item.color && loc(item.color.name), '× ' + item.quantity].filter(Boolean).join(' · ')) + '</small></div><b>' + C().money(item.lineTotal || item.price * item.quantity) + '</b></div>'; }).join('');
    const content = '<div class="admin-order-details"><div class="admin-order-meta"><div><span>' + t('customer') + '</span><strong>' + esc(order.customer.name) + '</strong><small>' + esc(order.customer.email) + ' · ' + esc(order.customer.phone) + '</small></div><div><span>' + t('deliveryDetails') + '</span><strong>' + esc(order.address.governorate || '') + ' · ' + esc(order.address.area || '') + '</strong><small>' + esc(order.address.address || '') + '</small></div><div><span>' + t('payment') + '</span><strong>' + t(order.paymentMethod === 'card_on_delivery' ? 'cardOnDelivery' : 'cashOnDelivery') + '</strong></div><div><span>' + t('orderStatus') + '</span>' + C().status(order.status) + '</div></div><div class="order-lines">' + items + '</div><div class="order-totals"><div class="summary-row"><span>' + t('subtotal') + '</span><strong>' + C().money(order.subtotal) + '</strong></div>' + (order.discount ? '<div class="summary-row discount-row"><span>' + t('discount') + '</span><strong>−' + C().money(order.discount) + '</strong></div>' : '') + '<div class="summary-row"><span>' + t('delivery') + '</span><strong>' + (order.deliveryFee ? C().money(order.deliveryFee) : t('free')) + '</strong></div><div class="summary-row summary-total"><span>' + t('total') + '</span><strong>' + C().money(order.total) + '</strong></div></div></div>';
    modalHost(C().modal(t('orderDetails') + ' · ' + order.orderNumber, content, '<button type="button" class="button button-outline" data-action="modal-close">' + t('close') + '</button>'));
  }
  const renderers = {
    'admin-dashboard': async function () { return { active: 'index', title: t('dashboard'), html: await dashboardContent() }; },
    'admin-products': async function () { const result = await productsContent(); return { active: 'products', title: t('adminProducts'), html: result.html, extra: result }; },
    'admin-categories': async function () { return { active: 'categories', title: t('adminCategories'), html: await categoriesContent() }; },
    'admin-inventory': async function () { return { active: 'inventory', title: t('inventory'), html: await inventoryContent() }; },
    'admin-attributes': async function () { return { active: 'attributes', title: t('attributes'), html: await attributesContent() }; },
    'admin-orders': async function () { return { active: 'orders', title: t('adminOrders'), html: await ordersContent() }; },
    'admin-customers': async function () { return { active: 'customers', title: t('customers'), html: await customersContent() }; },
    'admin-promotions': async function () { return { active: 'promotions', title: t('promotions'), html: await promotionsContent() }; },
    'admin-settings': async function () { return { active: 'settings', title: t('settings'), html: await settingsContent() }; }
  };
  async function render(page, root) {
    if (!Store.AdminGate || !Store.AdminGate.hasAccess()) { window.location.replace(Store.url('admin/login.html')); return; }
    const renderer = renderers[page] || renderers['admin-dashboard'];
    const result = await renderer();
    root.innerHTML = shell(result.active, result.title, result.html);
    if (result.active === 'products') bindProductList(result.extra);
    if (result.active === 'orders') bindOrderFilter();
    bindSettings();
    if (window.location.search.indexOf('new=1') >= 0) { history.replaceState({}, '', window.location.pathname); if (result.active === 'products') openProductEditor(null, await Store.repo.listCategories(true), await Store.repo.listSizes(), await Store.repo.listColors()); if (result.active === 'categories') openCategoryEditor(null); if (result.active === 'promotions') openPromotionEditor(null); }
  }
  function bindProductList(extra) {
    const search = document.getElementById('admin-product-search'); const status = document.getElementById('admin-product-status');
    function update() { Store.view.adminProducts = { q: search.value, status: status.value }; Store.renderCurrent(); }
    search.addEventListener('input', function () { Store.view.adminProducts = { q: search.value, status: status.value }; clearTimeout(search._timer); search._timer = setTimeout(function () { Store.renderCurrent(); }, 180); });
    status.addEventListener('change', update);
  }
  function bindOrderFilter() { const filter = document.getElementById('admin-order-filter'); if (filter) filter.addEventListener('change', function () { document.querySelectorAll('#admin-orders-body tr').forEach(function (row) { row.hidden = filter.value !== 'all' && row.dataset.orderStatus !== filter.value; }); }); }
  function bindSettings() {
    const form = document.getElementById('settings-form'); if (!form) return;
    form.addEventListener('submit', async function (event) { event.preventDefault(); if (!form.reportValidity()) return; const values = new FormData(form); const settings = await Store.repo.getSettings(); settings.phone = values.get('phone'); settings.email = values.get('email'); settings.address = { en: values.get('addressEn'), ar: values.get('addressAr') }; settings.deliveryFee = Number(values.get('deliveryFee') || 0); settings.freeDeliveryThreshold = Number(values.get('freeDeliveryThreshold') || 0); settings.lowStockThreshold = Number(values.get('lowStockThreshold') || 0); settings.deliveryNote = { en: values.get('deliveryNoteEn'), ar: values.get('deliveryNoteAr') }; try { await Store.repo.saveSettings(settings); C().toast(t('settingsSaved')); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } });
  }
  Store.Admin = { render: render, shell: shell, openProductEditor: openProductEditor, openCategoryEditor: openCategoryEditor, openSizeEditor: openSizeEditor, openColorEditor: openColorEditor, openPromotionEditor: openPromotionEditor, modalOrder: modalOrder, closeModal: closeModal, generateVariantRows: generateVariantRows, stockFor: stockFor };
})(window.Store);
