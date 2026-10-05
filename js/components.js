(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  function icon(name, size) {
    const paths = {
      search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
      bag: '<path d="M5 8h14l1 13H4L5 8Z"></path><path d="M9 8a3 3 0 0 1 6 0"></path>',
      user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
      close: '<path d="m6 6 12 12M18 6 6 18"></path>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
      chevron: '<path d="m7 10 5 5 5-5"></path>',
      plus: '<path d="M12 5v14M5 12h14"></path>',
      minus: '<path d="M5 12h14"></path>',
      check: '<path d="m5 12 4 4L19 6"></path>',
      pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
      truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"></path><circle cx="7" cy="19" r="1.5"></circle><circle cx="18" cy="19" r="1.5"></circle>',
      shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"></path><path d="m9 12 2 2 4-4"></path>',
      phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1.1.4 2.1.7 3.1a2 2 0 0 1-.5 2.1L8 10.2a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .6 3.1.7a2 2 0 0 1 1.5 1.8Z"></path>',
      trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"></path>',
      edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>',
      box: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"></path>',
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
      info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4m0-4h.01"></path>',
      instagram: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><path d="M17.5 6.5h.01"></path>'
    };
    return '<svg aria-hidden="true" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.info) + '</svg>';
  }
  function money(amount) {
    const locale = Store.i18n.locale === 'ar' ? 'ar-EG' : 'en-EG';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(Number(amount || 0));
  }
  function date(value, options) {
    if (!value) return '—';
    const locale = Store.i18n.locale === 'ar' ? 'ar-EG' : 'en-GB';
    return new Intl.DateTimeFormat(locale, options || { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  }
  function status(statusKey) {
    return '<span class="status-pill status-' + Store.escape(statusKey) + '"><i></i>' + Store.escape(t('status_' + statusKey)) + '</span>';
  }
  function price(product, variant) {
    const current = Number(variant && variant.price || product.salePrice || product.price || 0);
    return '<span class="price-now">' + money(current) + '</span>' + (product.salePrice && !(variant && variant.price) ? '<del class="price-was">' + money(product.price) + '</del>' : '');
  }
  function productCard(product) {
    const name = Store.escape(Store.i18n.localized(product.name));
    const image = Store.asset(Store.safeImage(product.images && product.images[0]));
    const category = product.category && Store.i18n.localized(product.category) || '';
    const variantLabel = product.variants && product.variants.length ? t('chooseOptions') : t('addToBag');
    const action = product.variants && product.variants.length ? 'product-link' : 'quick-add';
    const href = Store.url('product.html?id=' + encodeURIComponent(product.id));
    return '<article class="product-card" data-product-card="' + Store.escape(product.id) + '">' +
      '<a class="product-card-image" href="' + href + '" aria-label="' + name + '"><img loading="lazy" src="' + image + '" alt="' + name + '" data-fallback="' + Store.asset('assets/images/fallback.svg') + '">' +
      (product.salePrice ? '<span class="product-badge sale-badge">' + t('sale') + '</span>' : product.featured ? '<span class="product-badge">' + t('featured') + '</span>' : '') +
      '<span class="card-arrow" aria-hidden="true">' + icon('arrow', 16) + '</span></a>' +
      '<div class="product-card-info"><div class="product-category-label">' + Store.escape(category) + '</div><a class="product-card-title" href="' + href + '">' + name + '</a>' +
      '<div class="product-card-bottom"><div class="product-card-price">' + price(product) + '</div>' +
      '<button class="quick-add" type="button" data-action="' + action + '" data-product-id="' + Store.escape(product.id) + '" aria-label="' + Store.escape(variantLabel + ': ' + Store.i18n.localized(product.name)) + '">' + (action === 'quick-add' ? icon('plus', 17) : icon('arrow', 17)) + '</button></div></div></article>';
  }
  function empty(iconName, title, body, actionHtml) {
    return '<section class="empty-state"><span class="empty-icon">' + icon(iconName || 'bag', 26) + '</span><h2>' + Store.escape(title) + '</h2><p>' + Store.escape(body || '') + '</p>' + (actionHtml || '') + '</section>';
  }
  function errorState(message, retryAction) {
    return '<section class="error-state"><span class="empty-icon">' + icon('info', 25) + '</span><h2>' + Store.escape(t('errorTitle')) + '</h2><p>' + Store.escape(message || t('errorBody')) + '</p>' + (retryAction ? '<button class="button button-outline" type="button" data-action="retry-render">' + t('retry') + '</button>' : '') + '</section>';
  }
  function skeletons(count) {
    return '<div class="product-grid skeleton-grid" aria-label="' + t('loading') + '">' + Array.from({ length: count || 4 }).map(function () { return '<div class="skeleton-card"><div class="skeleton-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>'; }).join('') + '</div>';
  }
  function header(categories, config) {
    const user = Store.Auth && Store.Auth.currentUser();
    const site = config || (Store.StoreSiteConfig ? Store.StoreSiteConfig.normalizeSiteConfig({}) : {});
    const identity = site.identity || {};
    const storeName = Store.i18n.localized(identity.storeName) || t('brand');
    const logo = Store.asset(Store.safeImage(identity.logoPath || 'assets/icon.svg'));
    const announcement = Store.i18n.localized(identity.announcement) || t('announcement');
    const categoryLinks = (categories || []).filter(function (category) { return category.active; }).slice(0, 6).map(function (category) {
      return '<a href="' + Store.url('shop.html?category=' + encodeURIComponent(category.id)) + '">' + Store.escape(Store.i18n.localized(category.name)) + '</a>';
    }).join('');
    const accountLink = user ? Store.url('profile.html') : Store.url('login.html');
    return '<div class="announcement"><span class="announcement-mark">✳</span><span>' + Store.escape(announcement) + '</span><span class="announcement-divider">·</span><a href="' + Store.url('track.html') + '">' + t('trackOrder') + '</a></div>' +
      '<header class="site-header"><div class="header-main page-wrap">' +
      '<a class="brand-lockup" href="' + Store.url('index.html') + '" aria-label="' + Store.escape(storeName) + ' home"><span class="brand-mark"><img src="' + logo + '" alt="" onerror="this.remove()"><b>ج</b><i></i></span><span class="brand-copy"><strong>' + Store.escape(storeName) + '</strong><small>' + Store.escape(Store.i18n.localized(identity.tagline) || 'CAIRO · EGYPT') + '</small></span></a> +
      '<nav class="primary-nav" aria-label="' + t('categories') + '"><a href="' + Store.url('index.html') + '">' + t('home') + '</a><a href="' + Store.url('shop.html') + '">' + t('shop') + '</a><a href="' + Store.url('categories.html') + '">' + t('categories') + '</a><a href="' + Store.url('shop.html?sort=newest') + '">' + t('newArrivals') + '</a></nav>' +
      '<form class="header-search" action="' + Store.url('search.html') + '" method="get"><label class="visually-hidden" for="header-search-input">' + t('search') + '</label><input id="header-search-input" name="q" type="search" placeholder="' + t('searchPlaceholder') + '" autocomplete="off"><button type="submit" aria-label="' + t('search') + '">' + icon('search', 17) + '</button></form>' +
      '<div class="header-actions"><button type="button" class="language-toggle" data-action="switch-language" aria-label="' + t('language') + '">' + t('language') + '</button><a class="header-account" href="' + accountLink + '" aria-label="' + (user ? t('account') : t('signIn')) + '">' + icon('user', 19) + '<span>' + (user ? t('account') : t('signIn')) + '</span></a><button class="header-bag" type="button" data-action="cart-open" aria-label="' + t('bag') + '">' + icon('bag', 20) + '<span class="bag-count" id="bag-count">' + (Store.Cart ? Store.Cart.count() : 0) + '</span></button><button class="mobile-search-button" type="button" data-action="mobile-search" aria-label="' + t('search') + '">' + icon('search', 19) + '</button><button class="mobile-menu-button" type="button" data-action="mobile-menu" aria-expanded="false" aria-controls="mobile-navigation" aria-label="' + t('menu') + '">' + icon('menu', 21) + '</button></div>' +
      '</div><div class="category-rail page-wrap"><a class="category-rail-all" href="' + Store.url('shop.html') + '">' + t('allProducts') + '</a>' + categoryLinks + '<a class="category-rail-help" href="' + Store.url('about.html') + '">' + t('about') + '</a></div>' +
      '<div id="mobile-navigation" class="mobile-navigation" aria-hidden="true"><div class="mobile-navigation-head"><a class="brand-lockup" href="' + Store.url('index.html') + '"><span class="brand-mark"><b>ج</b><i></i></span><span class="brand-copy"><strong>' + t('brand') + '</strong><small>CAIRO · EGYPT</small></span></a><button type="button" class="icon-button" data-action="mobile-menu-close" aria-label="' + t('close') + '">' + icon('close', 20) + '</button></div><form class="mobile-search" action="' + Store.url('search.html') + '" method="get"><label class="visually-hidden" for="mobile-search-input">' + t('search') + '</label><input id="mobile-search-input" name="q" type="search" placeholder="' + t('searchPlaceholder') + '"><button aria-label="' + t('search') + '">' + icon('search', 18) + '</button></form><nav aria-label="' + t('menu') + '"><a href="' + Store.url('index.html') + '">' + t('home') + '</a><a href="' + Store.url('shop.html') + '">' + t('allProducts') + '</a><a href="' + Store.url('categories.html') + '">' + t('categories') + '</a>' + categoryLinks + '<a href="' + Store.url('orders.html') + '">' + t('orders') + '</a><a href="' + Store.url('track.html') + '">' + t('trackOrder') + '</a><a href="' + Store.url('help.html') + '">' + t('help') + '</a><a href="' + Store.url('admin/login.html') + '">' + t('admin') + '</a></nav><div class="mobile-navigation-bottom"><button type="button" class="language-toggle" data-action="switch-language">' + t('language') + '</button><a href="' + accountLink + '">' + icon('user', 17) + t('account') + '</a></div></div><button class="mobile-nav-backdrop" data-action="mobile-menu-close" aria-label="' + t('close') + '"></button></header>' +
      '<div id="cart-drawer-host"></div>';
  }
  async function renderHeader(target) {
    const host = target || document.getElementById('site-header');
    if (!host) return;
    host.innerHTML = header([], {});
    try { const results = await Promise.all([Store.repo.listCategories(), Store.repo.getSiteConfig(false)]); host.innerHTML = header(results[0], results[1]); }
    catch (_) { host.innerHTML = header([], {}); }
  }
  async function renderFooter(target) {
    const host = target || document.getElementById('site-footer');
    if (!host) return;
    const [categories, config] = await Promise.all([
      Store.repo.listCategories().catch(function () { return []; }),
      Store.repo.getSiteConfig(false).catch(function () { return {}; })
    ]);
    const site = config || {};
    const identity = site.identity || {};
    const content = site.content || {};
    const contact = content.contact || {};
    const footerCfg = content.footer || {};
    const storeName = Store.i18n.localized(identity.storeName) || t('brand');
    const logo = Store.asset(Store.safeImage(identity.logoPath || 'assets/icon.svg'));
    const categoriesHtml = categories.slice(0, 4).map(function (category) { return '<a href="' + Store.url('shop.html?category=' + encodeURIComponent(category.id)) + '">' + Store.escape(Store.i18n.localized(category.name)) + '</a>'; }).join('');
    const phone = String(contact.phone || '');
    const phoneLink = phone ? 'tel:' + phone.replace(/[^+\d]/g, '') : '#';
    const footerText = Store.i18n.localized(footerCfg.body) || Store.i18n.localized(identity.tagline) || '';
    const footerNote = Store.i18n.localized(footerCfg.note) || '';
    host.innerHTML = '<footer class="site-footer"><div class="footer-main page-wrap"><div class="footer-brand"><a class="brand-lockup" href="' + Store.url('index.html') + '"><span class="brand-mark"><img src="' + logo + '" alt="" onerror="this.remove()"><b>ج</b><i></i></span><span class="brand-copy"><strong>' + Store.escape(storeName) + '</strong><small>' + Store.escape(Store.i18n.localized(identity.tagline) || 'CAIRO · EGYPT') + '</small></span></a><p>' + Store.escape(footerText) + '</p>' + (phone ? '<a class="footer-contact-link" href="' + phoneLink + '">' + icon('phone', 16) + Store.escape(phone) + '</a>' : '') + '</div><div class="footer-column"><h3>' + t('footerExplore') + '</h3><a href="' + Store.url('shop.html') + '">' + t('allProducts') + '</a><a href="' + Store.url('categories.html') + '">' + t('categories') + '</a>' + categoriesHtml + '</div><div class="footer-column"><h3>' + t('footerHelp') + '</h3><a href="' + Store.url('track.html') + '">' + t('trackOrder') + '</a><a href="' + Store.url('orders.html') + '">' + t('orders') + '</a><a href="' + Store.url('help.html') + '">' + t('help') + '</a><a href="' + Store.url('about.html') + '">' + t('about') + '</a></div><div class="footer-signup"><span class="eyebrow">' + t('newsletterTitle') + '</span><p>' + t('newsletterText') + '</p><form id="newsletter-form" class="newsletter-form"><label class="visually-hidden" for="newsletter-email">' + t('emailAddress') + '</label><input id="newsletter-email" name="email" type="email" required placeholder="' + t('emailAddress') + '"><button type="submit" aria-label="' + t('subscribe') + '">' + icon('arrow', 18) + '</button></form></div></div><div class="footer-bottom page-wrap"><span>' + Store.escape(footerNote) + '</span><span>EGP</span><a href="' + Store.url('admin/login.html') + '">' + t('admin') + '</a></div></footer>';
  }
  function toast(message, type) {
    let host = document.getElementById('toast-stack');
    if (!host) { host = document.createElement('div'); host.id = 'toast-stack'; host.className = 'toast-stack'; host.setAttribute('aria-live', 'polite'); host.setAttribute('aria-atomic', 'true'); document.body.appendChild(host); }
    const item = document.createElement('div'); item.className = 'toast toast-' + (type || 'success'); item.innerHTML = '<span class="toast-icon">' + icon(type === 'error' ? 'info' : 'check', 16) + '</span><span>' + Store.escape(message) + '</span><button type="button" aria-label="' + t('close') + '">' + icon('close', 15) + '</button>';
    host.appendChild(item);
    const remove = function () { item.classList.add('toast-leaving'); window.setTimeout(function () { item.remove(); }, 220); };
    item.querySelector('button').addEventListener('click', remove);
    window.setTimeout(remove, 3600);
  }
  function modal(title, content, actions) {
    return '<div class="modal-backdrop" data-modal-backdrop><section class="modal-panel" role="dialog" aria-modal="true" aria-label="' + Store.escape(title) + '"><header class="modal-header"><h2>' + Store.escape(title) + '</h2><button type="button" class="icon-button" data-action="modal-close" aria-label="' + t('close') + '">' + icon('close', 19) + '</button></header><div class="modal-body">' + content + '</div>' + (actions ? '<footer class="modal-actions">' + actions + '</footer>' : '') + '</section></div>';
  }
  Store.Components = { icon: icon, money: money, date: date, status: status, price: price, productCard: productCard, empty: empty, error: errorState, skeletons: skeletons, renderHeader: renderHeader, renderFooter: renderFooter, toast: toast, modal: modal };
})(window.Store);
