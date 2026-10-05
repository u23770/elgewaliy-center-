(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const C = function () { return Store.Components; };
  const esc = function (value) { return Store.escape(value); };
  const adminPages = ['admin-dashboard', 'admin-products', 'admin-categories', 'admin-inventory', 'admin-attributes', 'admin-orders', 'admin-customers', 'admin-promotions', 'admin-settings', 'admin-customizer', 'admin-content', 'admin-media', 'admin-sections', 'admin-banners', 'admin-gallery', 'admin-socials', 'admin-zones', 'admin-deliveries', 'admin-drivers', 'admin-reviews'];
  const renderers = {
    home: Store.Pages.home, shop: Store.Pages.shop, search: Store.Pages.search, categories: Store.Pages.categories, product: Store.Pages.product,
    cart: Store.Cart.renderPage, checkout: Store.Pages.checkout, 'order-success': Store.Pages.orderSuccess, login: Store.Pages.login,
    register: Store.Pages.register, forgot: Store.Pages.forgot, profile: Store.Pages.profile, orders: Store.Pages.orders,
    track: Store.Pages.track, about: Store.Pages.about, help: Store.Pages.help,
    'admin-login': Store.Pages.login
  };
  function titleFor(page) {
    const seoTitle = Store.view && Store.view.siteConfig && Store.view.siteConfig.content && Store.view.siteConfig.content.seo ? Store.i18n.localized(Store.view.siteConfig.content.seo.title) : ''; const map = { home: seoTitle || t('brand'), shop: t('shop'), search: t('searchResults'), categories: t('categories'), product: t('productDetails'), cart: t('bag'), checkout: t('checkout'), 'order-success': t('orderConfirmed'), login: t('signIn'), register: t('register'), forgot: t('resetTitle'), profile: t('profileTitle'), orders: t('orders'), track: t('trackTitle'), about: t('about'), help: t('help'), 'admin-login': t('adminLogin'), 'admin-dashboard': t('dashboard'), 'admin-products': t('adminProducts'), 'admin-categories': t('adminCategories'), 'admin-inventory': t('inventory'), 'admin-attributes': t('attributes'), 'admin-orders': t('adminOrders'), 'admin-customers': t('customers'), 'admin-promotions': t('promotions'), 'admin-settings': t('settings'), 'admin-customizer': t('websiteCustomizer'), 'admin-content': t('websiteContent'), 'admin-media': t('mediaLibrary'), 'admin-sections': t('homepageSections'), 'admin-banners': t('banners'), 'admin-gallery': t('gallery'), 'admin-socials': t('socialLinks'), 'admin-zones': t('deliveryZones'), 'admin-deliveries': t('deliveries'), 'admin-drivers': t('drivers'), 'admin-reviews': t('reviews') };
    return (map[page] || t('brand')) + ' — ' + t('brand');
  }
  async function applySiteChrome() {
    if (!Store.repo || !Store.repo.getSiteConfig) return;
    try {
      const config = await Store.repo.getSiteConfig(false);
      Store.view.siteConfig = config || {};
      const util = window.StoreSiteConfig;
      if (util && util.themeCssVariables) {
        const vars = util.themeCssVariables(Store.view.siteConfig);
        Object.keys(vars).forEach(function (key) { document.documentElement.style.setProperty(key, vars[key]); });
      }
      const identity = Store.view.siteConfig.identity || {};
      const content = Store.view.siteConfig.content || {};
      const name = Store.i18n.localized(identity.storeName) || t('brand');
      const seo = content.seo || {};
      const description = Store.i18n.localized(seo.description) || '';
      if (document.body && !document.body.dataset.page.startsWith('admin-')) {
        const favicon = identity.faviconPath || identity.logoPath;
        if (favicon) {
          let link = document.querySelector('link[rel="icon"]');
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = Store.asset(Store.safeImage(favicon));
        }
        document.title = name;
        if (description) {
          let meta = document.querySelector('meta[name="description"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'description';
            document.head.appendChild(meta);
          }
          meta.content = description;
        }
      }
    } catch (_) {}
  }

  function captureFormState() {
    const values = [];
    document.querySelectorAll('#page-root input, #page-root select, #page-root textarea').forEach(function (field, index) {
      if (field.type === 'file') return;
      values.push({ key: field.id ? 'id:' + field.id : 'index:' + index, type: field.type, value: field.value, checked: field.checked, selected: field.tagName === 'SELECT' ? field.value : undefined, start: field.selectionStart, end: field.selectionEnd });
    });
    const active = document.activeElement;
    return { values: values, focused: active && active.id ? active.id : '' };
  }
  function restoreFormState(snapshot) {
    if (!snapshot) return;
    snapshot.values.forEach(function (saved) {
      let field = saved.key.indexOf('id:') === 0 ? document.getElementById(saved.key.slice(3)) : null;
      if (!field && saved.key.indexOf('index:') === 0) field = document.querySelectorAll('#page-root input, #page-root select, #page-root textarea')[Number(saved.key.slice(6))];
      if (!field || field.type === 'password' && !saved.value) return;
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = saved.checked;
      else if (field.tagName === 'SELECT') field.value = saved.selected;
      else field.value = saved.value;
    });
    if (snapshot.focused) { const focus = document.getElementById(snapshot.focused); if (focus) { focus.focus({ preventScroll: true }); if (typeof focus.setSelectionRange === 'function' && snapshot.values.length) { try { focus.setSelectionRange(focus.value.length, focus.value.length); } catch (_) {} } } }
  }
  async function renderCurrent(options) {
    const snapshot = options && options.snapshot ? options.snapshot : captureFormState();
    const page = document.body.dataset.page || 'home';
    const root = document.getElementById('page-root');
    if (!root) return;
    document.title = titleFor(page);
    const customerChrome = !page.startsWith('admin-');
    if (customerChrome) {
      const header = document.getElementById('site-header'); const footer = document.getElementById('site-footer');
      if (header) header.innerHTML = '<div class="page-wrap header-loading"></div>';
      if (footer) footer.innerHTML = '';
      const tasks = [Store.Components.renderHeader(header), Store.Components.renderFooter(footer)];
      if (renderers[page]) tasks.push(renderers[page](root));
      else if (adminPages.indexOf(page) >= 0) tasks.push(Store.Admin.render(page, root));
      else tasks.push(PagesNotFound(root));
      try { await Promise.all(tasks); } catch (error) { root.innerHTML = C().error(error.message || t('errorBody'), true); }
    } else {
      const header = document.getElementById('site-header'); const footer = document.getElementById('site-footer');
      if (header) header.innerHTML = ''; if (footer) footer.innerHTML = '';
      try {
        const websiteAdmin = ['admin-customizer','admin-content','admin-media','admin-sections','admin-banners','admin-gallery','admin-socials','admin-zones','admin-deliveries','admin-drivers','admin-reviews'];
        if (page === 'admin-login') await renderers[page](root);
        else if (websiteAdmin.indexOf(page) >= 0 && Store.AdminSite) await Store.AdminSite.render(page, root);
        else if (adminPages.indexOf(page) >= 0) await Store.Admin.render(page, root);
        else await PagesNotFound(root);
      } catch (error) { root.innerHTML = C().error(error.message || t('errorBody'), true); }
    }
    restoreFormState(snapshot);
    document.body.classList.toggle('is-admin-page', page.startsWith('admin-'));
    if (page === 'cart' && Store.view.cartDrawerOpen) Store.Cart.closeDrawer();
  }
  async function PagesNotFound(root) {
    root.innerHTML = '<div class="page-wrap page-space not-found-page"><span class="not-found-number">404</span><span class="eyebrow">' + t('brand') + '</span><h1>' + t('pageNotFound') + '</h1><p>' + t('pageNotFoundBody') + '</p><a class="button button-primary" href="' + Store.url('index.html') + '">' + t('backHome') + '</a></div>';
  }
  Store.renderCurrent = renderCurrent;
  function setMobileMenu(open) {
    const header = document.querySelector('.site-header'); const menu = document.getElementById('mobile-navigation'); const trigger = document.querySelector('.mobile-menu-button');
    if (header) header.classList.toggle('mobile-nav-open', Boolean(open));
    if (menu) menu.setAttribute('aria-hidden', String(!open));
    if (trigger) trigger.setAttribute('aria-expanded', String(Boolean(open)));
    document.body.classList.toggle('nav-open', Boolean(open));
  }
  function setAdminMenu(open) { const sidebar = document.getElementById('admin-sidebar'); if (sidebar) sidebar.classList.toggle('open', Boolean(open)); document.body.classList.toggle('admin-menu-open', Boolean(open)); }
  async function handleClick(event) {
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    const action = actionNode.dataset.action;
    if (action === 'switch-language') { event.preventDefault(); const snapshot = captureFormState(); const modal = document.querySelector('.modal-backdrop'); if (modal) modal.remove(); Store.i18n.set(Store.i18n.locale === 'ar' ? 'en' : 'ar'); await renderCurrent({ snapshot: snapshot }); if (modal) { const host = document.getElementById('admin-modal-root'); if (host) host.appendChild(modal); } return; }
    if (action === 'mobile-menu') { setMobileMenu(true); return; }
    if (action === 'mobile-menu-close') { setMobileMenu(false); return; }
    if (action === 'mobile-search') { setMobileMenu(true); window.setTimeout(function () { const field = document.getElementById('mobile-search-input'); if (field) field.focus(); }, 80); return; }
    if (action === 'cart-open') { Store.Cart.openDrawer(); return; }
    if (action === 'cart-drawer-close') { if (event.target.closest('.cart-drawer') && !event.target.closest('[data-action="cart-drawer-close"]')) return; Store.Cart.closeDrawer(); return; }
    if (action === 'modal-close') { if (actionNode.closest('.modal-backdrop') && event.target !== actionNode && actionNode.classList.contains('modal-backdrop')) Store.Admin.closeModal(); else Store.Admin.closeModal(); return; }
    if (action === 'quick-add') { try { await Store.Cart.add(actionNode.dataset.productId, '', 1); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } return; }
    if (action === 'product-link') { window.location.href = Store.url('product.html?id=' + encodeURIComponent(actionNode.dataset.productId)); return; }
    if (action === 'add-product-detail') { try { await Store.Cart.add(actionNode.dataset.productId, actionNode.dataset.variantId, actionNode.dataset.quantity); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } return; }
    if (action === 'cart-remove') { Store.Cart.remove(actionNode.dataset.line); await renderCurrent(); return; }
    if (action === 'cart-quantity') { const key = actionNode.dataset.line; const item = Store.storage.cart().find(function (entry) { return Store.Cart.lineKey(entry) === key; }); if (!item) return; try { await Store.Cart.setQuantity(key, Number(item.quantity) + Number(actionNode.dataset.delta)); await renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } return; }
    if (action === 'product-qty') { const productId = actionNode.dataset.productId || Store.query('id'); const selections = Store.view.productSelections || {}; const state = selections[productId] || (selections[productId] = { size: '', color: '', quantity: 1, image: 0 }); state.quantity = Math.max(1, Number(state.quantity || 1) + Number(actionNode.dataset.delta)); await renderCurrent(); return; }
    if (action === 'select-size' || action === 'select-color' || action === 'gallery-image') {
      const productId = Store.query('id') || Store.query('slug'); const product = await Store.repo.getProduct(productId); if (!product) return;
      const selections = Store.view.productSelections || (Store.view.productSelections = {}); const state = selections[product.id] || (selections[product.id] = { size: '', color: '', quantity: 1, image: 0 });
      if (action === 'select-size') state.size = state.size === actionNode.dataset.size ? '' : actionNode.dataset.size;
      if (action === 'select-color') state.color = state.color === actionNode.dataset.color ? '' : actionNode.dataset.color;
      if (action === 'gallery-image') state.image = Number(actionNode.dataset.index || 0);
      await renderCurrent(); return;
    }
    if (action === 'filter-toggle') { const panel = document.getElementById('shop-filter-panel'); if (panel) { panel.classList.toggle('open'); document.body.classList.toggle('filter-open', panel.classList.contains('open')); } return; }
    if (action === 'clear-filters') { const old = Store.view.shop || {}; Store.view.shop = { initialized: true, q: old.q || '', category: '', size: '', color: '', min: '', max: '', inStock: false, sale: false, sort: 'featured' }; await renderCurrent(); return; }
    if (action === 'clear-query') { Store.view.shop = { initialized: true, q: '', category: '', sort: 'featured' }; history.replaceState({}, '', Store.url('search.html')); await renderCurrent(); return; }
    if (action === 'apply-promo') { await Store.Checkout.applyPromotion(); return; }
    if (action === 'remove-promo') { Store.Checkout.removePromotion(); return; }
    if (action === 'sign-out') { if (document.body.dataset.page && document.body.dataset.page.startsWith('admin-')) { if (Store.AdminGate) Store.AdminGate.revokeAccess(); window.location.replace(Store.url('admin/login.html')); } else { await Store.Auth.logout(); window.location.href = Store.url('index.html'); } return; }
    
    if (action === 'admin-menu-open') { setAdminMenu(true); return; }
    if (action === 'admin-menu-close') { setAdminMenu(false); return; }
    if (action === 'add-product' || action === 'edit-product') { const categories = await Store.repo.listCategories(true); const sizes = await Store.repo.listSizes(); const colors = await Store.repo.listColors(); let product = null; if (action === 'edit-product') product = await Store.repo.getProduct(actionNode.dataset.id, true); Store.Admin.openProductEditor(product, categories, sizes, colors); return; }
    if (action === 'delete-product') { if (window.confirm(t('confirmDeleteProduct'))) { try { await Store.repo.deleteProduct(actionNode.dataset.id); C().toast(t('productDeleted')); await renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } } return; }
    if (action === 'add-category' || action === 'edit-category') { const categories = await Store.repo.listCategories(true); const category = action === 'edit-category' ? categories.find(function (item) { return item.id === actionNode.dataset.id; }) : null; Store.Admin.openCategoryEditor(category); return; }
    if (action === 'delete-category') { if (window.confirm(t('confirmDelete'))) { try { await Store.repo.deleteCategory(actionNode.dataset.id); C().toast(t('categoryDeleted')); await renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } } return; }
    if (action === 'add-size') { Store.Admin.openSizeEditor(null); return; }
    if (action === 'delete-size') { if (window.confirm(t('confirmDelete'))) { await Store.repo.deleteSize(actionNode.dataset.id); await renderCurrent(); } return; }
    if (action === 'add-color') { Store.Admin.openColorEditor(null); return; }
    if (action === 'delete-color') { if (window.confirm(t('confirmDelete'))) { await Store.repo.deleteColor(actionNode.dataset.id); await renderCurrent(); } return; }
    if (action === 'generate-variants') { const form = document.getElementById('product-editor-form'); if (form) Store.Admin.generateVariantRows(form, await Store.repo.listSizes(), await Store.repo.listColors()); return; }
    if (action === 'save-stock') { const row = actionNode.closest('tr'); const input = row && row.querySelector('[data-stock-input]'); if (!input) return; try { await Store.repo.updateInventory(actionNode.dataset.productId, actionNode.dataset.variantId, input.value); C().toast(t('stockSaved')); await renderCurrent(); } catch (error) { C().toast(error.message || t('errorBody'), 'error'); } return; }
    if (action === 'view-order') { const order = await Store.repo.getOrder(actionNode.dataset.id); Store.Admin.modalOrder(order); return; }
    if (action === 'print-order') { const order = await Store.repo.getOrder(actionNode.dataset.id); if (order && Store.OrderPrint) Store.OrderPrint.print(order); return; }
    if (action === 'add-promotion' || action === 'edit-promotion') { const results = await Promise.all([Store.repo.listPromotions(true), Store.repo.listProducts({ includeInactive: true }), Store.repo.listCategories(true)]); const promo = action === 'edit-promotion' ? results[0].find(function (item) { return item.id === actionNode.dataset.id; }) : null; Store.Admin.openPromotionEditor(promo, results[1], results[2]); return; }
    if (action === 'delete-promotion') { if (window.confirm(t('confirmDeletePromotion'))) { await Store.repo.deletePromotion(actionNode.dataset.id); C().toast(t('promotionDeleted')); await renderCurrent(); } return; }
    if (action === 'copy-order') { try { await navigator.clipboard.writeText(actionNode.dataset.order || ''); C().toast(Store.i18n.locale === 'ar' ? 'تم نسخ رقم الطلب.' : 'Order number copied.'); } catch (_) { window.prompt(t('orderNumber'), actionNode.dataset.order || ''); } return; }
    if (action === 'retry-render') { await renderCurrent(); return; }
  }
  document.addEventListener('click', function (event) {
    if (event.target.matches('.modal-backdrop')) { Store.Admin.closeModal(); return; }
    handleClick(event).catch(function (error) { C().toast(error.message || t('errorBody'), 'error'); });
  });
  document.addEventListener('change', function (event) {
    const node = event.target;
    if (node.matches('[data-action="order-status"]')) {
      Store.repo.updateOrderStatus(node.dataset.orderId, node.value).then(function () { C().toast(t('orderUpdated')); }).catch(function (error) { C().toast(error.message || t('errorBody'), 'error'); });
    }
  });
  document.addEventListener('submit', async function (event) {
    const form = event.target;
    if (form.id === 'newsletter-form' || form.id === 'newsletter-hero-form') {
      event.preventDefault(); if (!form.reportValidity()) return; const values = new FormData(form); const email = String(values.get('email') || '').trim().toLowerCase();
      try { await Store.supabase.rpc('subscribe_newsletter', { p_email: email }); form.reset(); C().toast(t('subscriptionThanks'), 'success'); }
      catch (error) { C().toast(error.message || t('errorBody'), 'error'); }
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (Store.view.cartDrawerOpen) Store.Cart.closeDrawer();
    setMobileMenu(false); setAdminMenu(false);
    const modal = document.querySelector('.modal-backdrop'); if (modal) Store.Admin.closeModal();
    const filter = document.getElementById('shop-filter-panel'); if (filter && filter.classList.contains('open')) { filter.classList.remove('open'); document.body.classList.remove('filter-open'); }
  });
  document.addEventListener('error', function (event) {
    const image = event.target;
    if (image && image.tagName === 'IMG' && image.dataset.fallback && image.src !== image.dataset.fallback) image.src = image.dataset.fallback;
  }, true);
  window.addEventListener('ceg:cart-changed', function () { const page = document.body.dataset.page; if (page === 'cart' || page === 'checkout') renderCurrent(); });
  window.addEventListener('ceg:session-changed', function () { const countNode = document.getElementById('bag-count'); if (countNode) countNode.textContent = String(Store.Cart.count()); });
  async function start() {
    try { await Store.Auth.init(); } catch (_) {}
    await applySiteChrome();
    await renderCurrent({ snapshot: null });
    if (document.body.dataset.page.startsWith('admin-') && Store.query('new') === '1') history.replaceState({}, '', window.location.pathname);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})(window.Store);
