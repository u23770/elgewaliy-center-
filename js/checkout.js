(function (Store) {
  const Pages = Store.Pages = Store.Pages || {};
  const C = () => Store.Components;
  const t = (key, params) => Store.i18n.t(key, params);
  const tx = (en, ar) => Store.i18n.locale === 'ar' ? ar : en;
  const esc = (value) => Store.escape(value);
  const loc = (value) => Store.i18n.localized(value);
  const isMapsUrl = (value) => {
    try {
      const u = new URL(String(value || '').trim());
      return u.protocol === 'https:' && /(^|\.)google\.com$|(^|\.)google\.co\./i.test(u.hostname) && /maps/i.test(u.pathname + u.search + u.hostname);
    } catch (_) { return false; }
  };
  let zonesCache = null;

  async function getZones() {
    if (!zonesCache) zonesCache = await Store.repo.listZones(false);
    return zonesCache || [];
  }
  function getSubzones(zones, zoneId) {
    return (Store.view.checkoutSubzones || []).filter((s) => s.zoneId === zoneId && s.active !== false);
  }
  function selectedZone(zones, id) { return zones.find((z) => z.id === id) || null; }
  function deliveryFee(zone, subzone, subtotal) {
    if (!zone) return 0;
    const free = Number(zone.freeThreshold || 0);
    if (free > 0 && subtotal >= free) return 0;
    return subzone ? Number(subzone.fee || 0) : Number(zone.fee || 0);
  }

  async function renderCheckout(root) {
    const data = await Store.Cart.summary();
    if (!data.lines.length) {
      root.innerHTML = '<div class="page-wrap page-space">' + C().empty('bag', t('emptyBag'), '', '<a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('continueShopping') + '</a>') + '</div>';
      return;
    }
    const [zones, settings] = await Promise.all([getZones(), Store.repo.getSettings()]);
    const view = Store.view.checkout || (Store.view.checkout = { submitting: false, promo: null, promoCode: '', selectedZone: '', selectedSubzone: '', mapsLink: '' });
    const session = Store.Auth && Store.Auth.currentUser ? Store.Auth.currentUser() : null;
    const user = session && (session.user || session);
    Store.view.checkoutSubzones = await Store.repo.listSubzones(false);
    const zone = selectedZone(zones, view.selectedZone);
    const subzones = getSubzones(zones, view.selectedZone);
    const subzone = subzones.find((s) => s.id === view.selectedSubzone) || null;
    const fee = deliveryFee(zone, subzone, data.subtotal);
    const discount = view.promo ? Number(view.promo.discount || 0) : 0;
    const total = Math.max(0, Number(data.subtotal) - discount + fee);
    const zoneOptions = zones.length
      ? '<option value="">' + esc(tx('Select delivery area','اختر منطقة التوصيل')) + '</option>' + zones.filter((z) => z.active !== false).map((z) => '<option value="' + esc(z.id) + '" ' + (view.selectedZone === z.id ? 'selected' : '') + '>' + esc(loc(z.name)) + '</option>').join('')
      : '<option value="">' + esc(tx('Delivery areas are not configured yet','لم يتم إعداد مناطق التوصيل بعد')) + '</option>';
    const subzoneOptions = subzones.length
      ? '<option value="">' + esc(tx('Select district','اختر المنطقة الفرعية')) + '</option>' + subzones.map((s) => '<option value="' + esc(s.id) + '" ' + (view.selectedSubzone === s.id ? 'selected' : '') + '>' + esc(loc(s.name)) + '</option>').join('')
      : '<option value="">' + esc(tx('No sub-areas for this zone','لا توجد مناطق فرعية لهذه المنطقة')) + '</option>';
    const mapValue = view.mapsLink || '';
    root.innerHTML =
      '<div class="page-wrap page-space checkout-page">' +
      Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('bag'), href: Store.url('cart.html') }, { label: t('checkout') }]) +
      '<header class="page-heading"><span class="eyebrow">' + t('checkout') + '</span><h1>' + t('checkoutTitle') + '</h1><p>' + t('checkoutSubtitle') + '</p></header>' +
      '<div class="checkout-layout">' +
      '<form id="checkout-form" class="checkout-form" novalidate>' +
      '<section class="checkout-card"><div class="checkout-card-heading"><span>01</span><div><h2>' + t('contactDetails') + '</h2><p>' + tx('We use these details to contact you about your order.','سنستخدم هذه البيانات للتواصل معك بخصوص الطلب.') + '</p></div></div>' +
      '<div class="form-grid"><label class="field field-wide"><span>' + t('fullName') + ' <i>*</i></span><input name="customerName" autocomplete="name" required minlength="2" value="' + esc(user && (user.user_metadata?.full_name || user.fullName) || '') + '"></label>' +
      '<label class="field"><span>' + t('email') + '</span><input name="email" type="email" autocomplete="email" value="' + esc(user && user.email || '') + '"></label>' +
      '<label class="field"><span>' + t('phone') + ' <i>*</i></span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" required value="' + esc(user && user.user_metadata?.phone || '') + '"></label></div></section>' +
      '<section class="checkout-card"><div class="checkout-card-heading"><span>02</span><div><h2>' + t('deliveryDetails') + '</h2><p>' + tx('Choose your area and share the exact Google Maps location.','اختر منطقتك وأرسل موقعك الدقيق على Google Maps.') + '</p></div></div>' +
      '<div class="form-grid">' +
      '<label class="field"><span>' + tx('Delivery area','منطقة التوصيل') + ' <i>*</i></span><select name="zoneId" id="checkout-zone" required>' + zoneOptions + '</select></label>' +
      '<label class="field"><span>' + tx('District','المنطقة الفرعية') + '</span><select name="subzoneId" id="checkout-subzone" ' + (subzones.length ? '' : 'disabled') + '>' + subzoneOptions + '</select></label>' +
      '<label class="field"><span>' + t('governorate') + ' <i>*</i></span><input name="governorate" autocomplete="address-level1" required placeholder="' + esc(tx('Governorate','المحافظة')) + '"></label>' +
      '<label class="field"><span>' + t('area') + ' <i>*</i></span><input name="area" autocomplete="address-level3" required value="' + esc(zone ? loc(zone.name) : '') + '"></label>' +
      '<label class="field field-wide"><span>' + t('address') + ' <i>*</i></span><textarea name="address" rows="2" autocomplete="street-address" required placeholder="' + esc(tx('Building, street, apartment...','الشارع، رقم العقار، الدور، الشقة...')) + '"></textarea></label>' +
      '<label class="field field-wide"><span>' + tx('Google Maps location','موقع Google Maps') + ' <i>*</i></span><input name="mapsLink" type="url" required value="' + esc(mapValue) + '" placeholder="https://maps.google.com/..."><small class="form-hint">' + tx('Open Google Maps, choose your location, then share and paste the link here.','افتح Google Maps وحدد موقعك ثم اختر مشاركة وانسخ الرابط هنا.') + '</small></label>' +
      '<label class="field field-wide"><span>' + t('notes') + '</span><textarea name="notes" rows="2" placeholder="' + esc(tx('Optional delivery notes','ملاحظات إضافية للتوصيل')) + '"></textarea></label>' +
      '</div></section>' +
      '<section class="checkout-card"><div class="checkout-card-heading"><span>03</span><div><h2>' + t('paymentMethod') + '</h2><p>' + t('paymentNote') + '</p></div></div>' +
      '<div class="payment-options"><label class="payment-option"><input type="radio" name="paymentMethod" value="cash_on_delivery" checked><span class="payment-radio"></span><span><strong>' + t('cashOnDelivery') + '</strong><small>' + tx('Pay in cash when your order arrives','الدفع نقدًا عند استلام الطلب') + '</small></span></label>' +
      '<label class="payment-option"><input type="radio" name="paymentMethod" value="card_on_delivery"><span class="payment-radio"></span><span><strong>' + t('cardOnDelivery') + '</strong><small>' + tx('Pay by card with the courier','الدفع بالبطاقة مع المندوب') + '</small></span></label></div></section>' +
      '<div id="checkout-error" class="form-error" role="alert" hidden></div>' +
      '<button class="button button-primary checkout-submit" type="submit" ' + (view.submitting || !zones.length ? 'disabled' : '') + '>' + C().icon('shield', 17) + (view.submitting ? t('placingOrder') : (zones.length ? t('placeOrder') : tx('Delivery unavailable','التوصيل غير متاح حاليًا'))) + C().icon('arrow', 16) + '</button>' +
      '<p class="checkout-footnote">' + C().icon('shield', 14) + tx('Prices, stock, discount and delivery fee are verified securely when the order is created.','يتم التحقق من الأسعار والمخزون والخصم ورسوم التوصيل بشكل آمن عند إنشاء الطلب.') + '</p>' +
      '</form>' +
      '<aside class="checkout-aside"><div class="checkout-summary-card"><span class="eyebrow">' + t('orderSummary') + '</span><h2>' + t('bag') + ' <small>(' + data.lines.reduce((n,l)=>n+l.quantity,0) + ')</small></h2>' +
      '<div class="checkout-items">' + data.lines.map((item) => '<div class="checkout-item"><img src="' + esc(Store.asset(Store.safeImage(item.image))) + '" alt=""><div><strong>' + esc(loc(item.name)) + '</strong><small>' + esc([item.size, item.color && loc(item.color.name), '× ' + item.quantity].filter(Boolean).join(' · ')) + '</small></div><b>' + C().money(item.lineTotal || item.price * item.quantity) + '</b></div>').join('') + '</div>' +
      '<div class="summary-row"><span>' + t('subtotal') + '</span><strong>' + C().money(data.subtotal) + '</strong></div>' +
      (view.promo ? '<div class="summary-row discount-row"><span>' + t('discount') + ' (' + esc(view.promo.code) + ')</span><strong>−' + C().money(discount) + '</strong></div>' : '') +
      '<div class="summary-row"><span>' + tx('Delivery','التوصيل') + '</span><strong>' + (zone ? (fee ? C().money(fee) : t('free')) : '—') + '</strong></div>' +
      '<div class="summary-row summary-total"><span>' + t('total') + '</span><strong>' + C().money(total) + '</strong></div><p class="checkout-egp-note">EGP</p>' +
      (view.promo ? '<p class="promo-success">' + esc(loc(view.promo.title) || view.promo.code) + ' · ' + esc(view.promo.code) + ' <button type="button" data-action="remove-promo">× ' + t('removeCode') + '</button></p>' : '') +
      '<div class="promo-control"><label for="promo-code">' + t('promoCode') + '</label><div><input id="promo-code" type="text" autocomplete="off" placeholder="' + t('promoPlaceholder') + '" value="' + esc(view.promoCode || '') + '"><button type="button" class="button button-dark" data-action="apply-promo">' + t('applyCode') + '</button></div></div>' +
      '</div></aside></div></div>';

    const form = document.getElementById('checkout-form');
    if (!form) return;
    form.addEventListener('change', async (event) => {
      if (event.target.id === 'checkout-zone') {
        view.selectedZone = event.target.value;
        view.selectedSubzone = '';
        view.checkoutSubzones = await Store.repo.listSubzones(false);
        await renderCheckout(root);
      }
      if (event.target.id === 'checkout-subzone') {
        view.selectedSubzone = event.target.value;
        await renderCheckout(root);
      }
    });
    form.addEventListener('input', (event) => {
      if (event.target.name === 'mapsLink') view.mapsLink = event.target.value;
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!zones.length || !form.reportValidity()) return;
      const values = new FormData(form);
      const mapsLink = String(values.get('mapsLink') || '').trim();
      if (!isMapsUrl(mapsLink)) {
        const errorBox = document.getElementById('checkout-error');
        errorBox.textContent = tx('Please paste a valid Google Maps link.','من فضلك أدخل رابط Google Maps صحيح.');
        errorBox.hidden = false;
        form.elements.mapsLink.focus();
        return;
      }
      view.submitting = true;
      Store.view.checkout = view;
      await renderCheckout(root);
      try {
        const order = await Store.repo.createOrder({
          customer: { name: String(values.get('customerName') || '').trim(), email: String(values.get('email') || '').trim(), phone: String(values.get('phone') || '').trim() },
          address: { governorate: String(values.get('governorate') || '').trim(), area: String(values.get('area') || '').trim(), address: String(values.get('address') || '').trim(), notes: String(values.get('notes') || '').trim(), mapsLink, zoneId: String(values.get('zoneId') || ''), subzoneId: String(values.get('subzoneId') || '') },
          paymentMethod: values.get('paymentMethod'),
          promotionCode: view.promo ? view.promo.code : '',
          items: data.lines.map((line) => ({ productId: line.product.id, variantId: line.variant ? line.variant.id : '', quantity: line.quantity }))
        });
        Store.view.lastOrder = order;
        Store.view.checkout = null;
        Store.storage.set ? Store.storage.set('lastOrderNumber', order.orderNumber) : null;
        window.location.href = Store.url('order-success.html?order=' + encodeURIComponent(order.orderNumber));
      } catch (error) {
        view.submitting = false;
        Store.view.checkout = view;
        await renderCheckout(root);
        const box = document.getElementById('checkout-error');
        if (box) { box.textContent = error.message || t('orderError'); box.hidden = false; }
      }
    });
  }

  Pages.checkout = renderCheckout;
  Store.Checkout = {
    applyPromotion: async function () {
      const view = Store.view.checkout || (Store.view.checkout = { submitting: false, promo: null, promoCode: '' });
      const input = document.getElementById('promo-code');
      const code = String(input && input.value || '').trim().toUpperCase();
      if (!code) return;
      const summary = await Store.Cart.summary();
      const promo = await Store.repo.validatePromotion(code, summary.subtotal, summary.lines);
      if (!promo) { C().toast(t('invalidPromo'), 'error'); return; }
      view.promoCode = code;
      view.promo = promo;
      zonesCache = null;
      await Store.renderCurrent();
    },
    removePromotion: function () {
      const view = Store.view.checkout || {};
      view.promo = null;
      view.promoCode = '';
      Store.view.checkout = view;
      Store.renderCurrent();
    }
  };
})(window.Store);