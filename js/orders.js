(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const C = function () { return Store.Components; };
  const esc = function (value) { return Store.escape(value); };
  const loc = function (value) { return Store.i18n.localized(value); };
  const Pages = Store.Pages = Store.Pages || {};
  function orderLine(item, compact) {
    return '<div class="order-line ' + (compact ? 'compact' : '') + '"><img src="' + Store.asset(Store.safeImage(item.image)) + '" alt="" loading="lazy" data-fallback="' + Store.asset('assets/images/fallback.svg') + '"><div><strong>' + esc(loc(item.name)) + '</strong><small>' + esc([item.size, item.color && loc(item.color.name), '× ' + item.quantity].filter(Boolean).join(' · ')) + '</small></div><b>' + C().money(item.lineTotal || item.price * item.quantity) + '</b></div>';
  }
  function statusTimeline(order) {
    const flow = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    if (order.status === 'cancelled') return '<div class="cancelled-note"><span>' + C().icon('info', 18) + '</span><div><strong>' + t('status_cancelled') + '</strong><p>' + (Store.i18n.locale === 'ar' ? 'تواصل مع المتجر إذا كنت بحاجة إلى مساعدة بخصوص طلبك.' : 'Contact the store if you need help with this order.') + '</p></div></div>';
    const current = flow.indexOf(order.status);
    return '<ol class="order-timeline">' + flow.map(function (status, index) { const event = (order.events || []).filter(function (item) { return item.status === status; }).slice(-1)[0]; const done = index <= current; return '<li class="' + (done ? 'done' : '') + (index === current ? ' current' : '') + '"><span class="timeline-dot">' + (done ? C().icon('check', 12) : '') + '</span><div><strong>' + t('status_' + status) + '</strong>' + (event ? '<small>' + C().date(event.at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '</small>' : '') + '</div></li>'; }).join('') + '</ol>';
  }
  function orderSummaryRows(order) {
    return '<div class="summary-row"><span>' + t('subtotal') + '</span><strong>' + C().money(order.subtotal) + '</strong></div>' + (order.discount ? '<div class="summary-row discount-row"><span>' + t('discount') + (order.promotionCode ? ' (' + esc(order.promotionCode) + ')' : '') + '</span><strong>−' + C().money(order.discount) + '</strong></div>' : '') + '<div class="summary-row"><span>' + t('delivery') + '</span><strong>' + (order.deliveryFee ? C().money(order.deliveryFee) : t('free')) + '</strong></div><div class="summary-row summary-total"><span>' + t('total') + '</span><strong>' + C().money(order.total) + '</strong></div>';
  }
  function orderCard(order, detailed) {
    return '<article class="order-card"><header class="order-card-header"><div><span class="eyebrow">' + t('orderNumber') + '</span><h2>' + esc(order.orderNumber) + '</h2><small>' + C().date(order.createdAt) + '</small></div><div>' + C().status(order.status) + '<strong class="order-card-total">' + C().money(order.total) + '</strong></div></header>' + (detailed ? '<div class="order-card-content"><div class="order-lines">' + order.items.map(function (item) { return orderLine(item); }).join('') + '</div><div class="order-details-grid"><div><span>' + t('deliveryDetails') + '</span><strong>' + esc(order.customer.name) + '</strong><small>' + esc(order.customer.phone) + '</small><small>' + esc([order.address.address, order.address.area, order.address.governorate].filter(Boolean).join(', ')) + '</small></div><div><span>' + t('payment') + '</span><strong>' + t(order.paymentMethod === 'card_on_delivery' ? 'cardOnDelivery' : 'cashOnDelivery') + '</strong></div></div><div class="order-totals">' + orderSummaryRows(order) + '</div></div>' : '<div class="order-card-preview">' + order.items.slice(0, 3).map(function (item) { return '<img src="' + Store.asset(Store.safeImage(item.image)) + '" alt="" title="' + esc(loc(item.name)) + '" loading="lazy">'; }).join('') + '<span>' + order.items.length + ' ' + t('items') + '</span></div>') + '<footer class="order-card-footer"><a class="text-link" href="' + Store.url('orders.html?order=' + encodeURIComponent(order.orderNumber)) + '">' + t('orderDetails') + C().icon('arrow', 15) + '</a>' + (!detailed ? '<a class="button button-outline button-small" href="' + Store.url('track.html?order=' + encodeURIComponent(order.orderNumber)) + '">' + t('trackOrder') + '</a>' : '') + '</footer>' + (detailed ? '<div class="order-status-area"><h3>' + t('orderStatus') + '</h3>' + statusTimeline(order) + '</div>' : '') + '</article>';
  }
  Pages.orderSuccess = async function (root) {
    const key = Store.query('order');
    let order = Store.view.lastOrder && Store.view.lastOrder.orderNumber === key ? Store.view.lastOrder : null;
    if (!order && key) { try { order = await Store.repo.getOrder(key); } catch (_) {} }
    if (!order && !key) { root.innerHTML = '<div class="page-wrap page-space">' + C().empty('bag', t('pageNotFound'), t('orderConfirmationBody'), '<a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('shopNow') + '</a>') + '</div>'; return; }
    const name = order && order.customer && order.customer.name ? order.customer.name.split(' ')[0] : (Store.i18n.locale === 'ar' ? 'صديقنا' : 'there');
    root.innerHTML = '<div class="page-wrap page-space success-page"><div class="success-mark"><span>' + C().icon('check', 28) + '</span><i></i></div><span class="eyebrow">' + t('orderConfirmed') + '</span><h1>' + t('thankYou', { name: esc(name) }) + '</h1><p class="success-copy">' + t('orderConfirmationBody') + '</p><div class="success-number"><span>' + t('orderNumber') + '</span><strong>' + esc(key) + '</strong><button type="button" class="text-button" data-action="copy-order" data-order="' + esc(key) + '">' + (Store.i18n.locale === 'ar' ? 'نسخ' : 'Copy') + '</button></div>' + (order ? '<div class="success-order-card"><div class="success-order-head"><span>' + t('orderStatus') + '</span>' + C().status(order.status) + '</div>' + order.items.map(function (item) { return orderLine(item, true); }).join('') + '<div class="order-totals">' + orderSummaryRows(order) + '</div></div>' : '') + '<div class="success-actions"><a class="button button-primary" href="' + Store.url('track.html?order=' + encodeURIComponent(key)) + '">' + t('trackThisOrder') + C().icon('arrow', 16) + '</a><a class="button button-outline" href="' + Store.url('orders.html') + '">' + t('viewOrders') + '</a></div></div>';
  };
  Pages.orders = async function (root) {
    const user = Store.Auth.currentUser();
    const key = Store.query('order');
    if (!user) { root.innerHTML = '<div class="page-wrap page-space orders-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('orders') }]) + C().empty('box', t('profileNeedsLogin'), t('loginBody'), '<a class="button button-primary" href="' + Store.url('login.html') + '">' + t('signIn') + '</a><a class="button button-outline" href="' + Store.url('track.html') + '">' + t('trackOrder') + '</a>') + '</div>'; return; }
    const orders = await Store.repo.listCustomerOrders(user.id).catch(function () { return []; });
    const selected = key ? orders.find(function (order) { return order.orderNumber === key || order.id === key; }) : null;
    root.innerHTML = '<div class="page-wrap page-space orders-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('orders') }]) + '<header class="page-heading orders-heading"><div><span class="eyebrow">' + t('account') + '</span><h1>' + (selected ? t('orderDetails') : t('orderHistory')) + '</h1></div><a class="text-link" href="' + Store.url('profile.html') + '">' + t('profileTitle') + C().icon('arrow', 15) + '</a></header>' + (selected ? orderCard(selected, true) + '<a class="text-link back-orders" href="' + Store.url('orders.html') + '">← ' + t('orderHistory') + '</a>' : orders.length ? '<div class="orders-list">' + orders.map(function (order) { return orderCard(order, false); }).join('') + '</div>' : C().empty('bag', t('noOrders'), t('noOrdersBody'), '<a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('shopNow') + C().icon('arrow', 16) + '</a>')) + '</div>';
  };
  Pages.track = function (root) {
    const state = Store.view.track || (Store.view.track = { orderNumber: Store.query('order'), phone: '', order: null, error: '' });
    if (Store.query('order') && !state.orderNumber) state.orderNumber = Store.query('order');
    root.innerHTML = '<div class="page-wrap page-space track-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('trackOrder') }]) + '<section class="track-intro"><div class="track-illustration"><span>' + C().icon('truck', 44) + '</span><i>EG</i></div><span class="eyebrow">' + t('orders') + '</span><h1>' + t('trackTitle') + '</h1><p>' + t('trackBody') + '</p><form id="track-form" class="track-form"><label class="field"><span>' + t('orderNumber') + '</span><input name="orderNumber" value="' + esc(state.orderNumber) + '" required placeholder="EG-20261005-ABC123"></label><label class="field"><span>' + t('phone') + '</span><input name="phone" type="tel" value="' + esc(state.phone) + '" required autocomplete="tel"></label>' + (state.error ? '<p class="form-error">' + esc(state.error) + '</p>' : '') + '<button class="button button-primary button-full" type="submit">' + t('lookupOrder') + C().icon('arrow', 16) + '</button></form></section>' + (state.order ? '<section class="track-result"><div class="track-result-header"><div><span class="eyebrow">' + t('orderNumber') + '</span><h2>' + esc(state.order.orderNumber) + '</h2></div>' + C().status(state.order.status) + '</div>' + statusTimeline(state.order) + '<div class="order-lines">' + state.order.items.map(function (item) { return orderLine(item, true); }).join('') + '</div><div class="order-totals">' + orderSummaryRows(state.order) + '</div></section>' : '') + '</div>';
    document.getElementById('track-form').addEventListener('submit', async function (event) { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; const values = new FormData(form); state.orderNumber = values.get('orderNumber'); state.phone = values.get('phone'); state.error = ''; try { state.order = await Store.repo.trackOrder(state.orderNumber, state.phone); if (!state.order) state.error = t('orderNotFound'); } catch (error) { state.order = null; state.error = error.message || t('errorBody'); } Store.renderCurrent(); });
  };
  Pages.about = async function (root) {
    const site = await Store.repo.getSiteConfig(false).catch(function () { return {}; });
    const content = site.content || {};
    const about = content.about || {};
    const contact = content.contact || {};
    const aboutTitle = loc(about.title) || t('aboutTitle');
    const aboutBody = loc(about.body) || t('aboutBody');
    const aboutEyebrow = loc(about.eyebrow) || t('about');
    const aboutImage = Store.asset(Store.safeImage(about.image || 'assets/images/hero-editorial.jpg'));
    const phone = String(contact.phone || '').trim();
    const address = loc(contact.address);
    const mapsUrl = String(contact.mapsUrl || '').trim();
    const phoneMarkup = phone ? '<a href="tel:' + esc(phone.replace(/[^+\d]/g, '')) + '">' + C().icon('phone', 17) + esc(phone) + '</a>' : '';
    const addressMarkup = address ? '<p class="about-contact-address">' + esc(address) + '</p>' : '';
    const mapsLabel = Store.i18n.locale === 'ar' ? 'عرض الموقع على الخريطة' : 'View on map';
    const mapsMarkup = mapsUrl ? '<a href="' + esc(mapsUrl) + '" target="_blank" rel="noopener">' + mapsLabel + C().icon('arrow', 16) + '</a>' : '';
    root.innerHTML = '<div class="page-wrap page-space info-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('about') }]) + '<section class="about-hero"><div class="about-hero-photo"><img src="' + aboutImage + '" alt="' + esc(aboutTitle) + '"></div><div class="about-hero-copy"><span class="eyebrow">' + esc(aboutEyebrow) + '</span><h1>' + esc(aboutTitle) + '</h1><p>' + esc(aboutBody) + '</p><a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('shopNow') + C().icon('arrow', 16) + '</a></div></section><section class="about-values"><article><b>01</b><h2>' + (Store.i18n.locale === 'ar' ? 'اختيارات مدروسة' : 'Considered picks') + '</h2><p>' + (Store.i18n.locale === 'ar' ? 'نركز على القطع التي تستحق مكانًا في خزانتك.' : 'We focus on pieces that earn their place in your wardrobe.') + '</p></article><article><b>02</b><h2>' + (Store.i18n.locale === 'ar' ? 'راحة كل يوم' : 'Everyday comfort') + '</h2><p>' + (Store.i18n.locale === 'ar' ? 'قصّات سهلة وخامات تواكب تفاصيل يومك.' : 'Easy fits and thoughtful fabrics that move with your day.') + '</p></article><article><b>03</b><h2>' + (Store.i18n.locale === 'ar' ? 'اختيار قريب منك' : 'A store close to you') + '</h2><p>' + (Store.i18n.locale === 'ar' ? 'وجهة محلية للأناقة العملية وخدمة واضحة.' : 'A local destination for useful style and friendly service.') + '</p></article></section><section class="about-contact"><span class="eyebrow">' + t('contactUs') + '</span><h2>' + t('helpTitle') + '</h2>' + addressMarkup + phoneMarkup + mapsMarkup + '<a href="' + Store.url('help.html') + '">' + t('help') + C().icon('arrow', 16) + '</a></section></div>';
  };
  Pages.help = async function (root) {
    const site = await Store.repo.getSiteConfig(false).catch(function () { return {}; });
    const content = site.content || {};
    const contact = content.contact || {};
    const phone = String(contact.phone || '').trim();
    const whatsapp = String(contact.whatsapp || '').trim();
    const mapsUrl = String(contact.mapsUrl || '').trim();
    const phoneMarkup = phone ? '<a class="button button-primary" href="tel:' + esc(phone.replace(/[^+\d]/g, '')) + '">' + t('contactPhone') + ' · ' + esc(phone) + '</a>' : '<p class="form-note">' + t('footerHelp') + '</p>';
    const whatsappLabel = Store.i18n.locale === 'ar' ? 'واتساب' : 'WhatsApp';
    const mapLabel = Store.i18n.locale === 'ar' ? 'عرض الموقع على الخريطة' : 'View on map';
    const whatsappMarkup = whatsapp ? '<a href="' + esc(whatsapp) + '" target="_blank" rel="noopener">' + whatsappLabel + C().icon('arrow', 15) + '</a>' : '';
    const mapsMarkup = mapsUrl ? '<a href="' + esc(mapsUrl) + '" target="_blank" rel="noopener">' + mapLabel + C().icon('arrow', 15) + '</a>' : '';
    const faqs = ['faqTrack', 'faqPayment', 'faqDelivery', 'faqSize'];
    root.innerHTML = '<div class="page-wrap page-space help-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('help') }]) + '<header class="page-heading"><span class="eyebrow">' + t('help') + '</span><h1>' + t('helpTitle') + '</h1><p>' + t('footerHelp') + '</p></header><div class="help-layout"><div class="faq-list">' + faqs.map(function (key, index) { return '<details class="faq-item" ' + (index === 0 ? 'open' : '') + '><summary>' + t(key) + '<span>+</span></summary><p>' + t(key + 'Answer') + '</p></details>'; }).join('') + '</div><aside class="help-contact-card"><span class="help-contact-icon">' + C().icon('phone', 21) + '</span><h2>' + t('contactUs') + '</h2><p>' + t('promiseExchange') + '</p>' + phoneMarkup + whatsappMarkup + mapsMarkup + '<a href="' + Store.url('track.html') + '">' + t('trackOrder') + C().icon('arrow', 15) + '</a></aside></div></div>';
  };
  Store.Orders = { timeline: statusTimeline, orderCard: orderCard };
})(window.Store);
