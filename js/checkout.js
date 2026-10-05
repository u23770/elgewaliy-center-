(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const C = function () { return Store.Components; };
  const esc = function (value) { return Store.escape(value); };
  const Pages = Store.Pages = Store.Pages || {};
  const governorates = [
    { value: 'Cairo', ar: 'القاهرة', en: 'Cairo' }, { value: 'Giza', ar: 'الجيزة', en: 'Giza' }, { value: 'Alexandria', ar: 'الإسكندرية', en: 'Alexandria' },
    { value: 'Qalyubia', ar: 'القليوبية', en: 'Qalyubia' }, { value: 'Sharqia', ar: 'الشرقية', en: 'Sharqia' }, { value: 'Dakahlia', ar: 'الدقهلية', en: 'Dakahlia' },
    { value: 'Gharbia', ar: 'الغربية', en: 'Gharbia' }, { value: 'Monufia', ar: 'المنوفية', en: 'Monufia' }, { value: 'Beheira', ar: 'البحيرة', en: 'Beheira' },
    { value: 'Faiyum', ar: 'الفيوم', en: 'Faiyum' }, { value: 'Beni Suef', ar: 'بني سويف', en: 'Beni Suef' }, { value: 'Minya', ar: 'المنيا', en: 'Minya' },
    { value: 'Asyut', ar: 'أسيوط', en: 'Asyut' }, { value: 'Sohag', ar: 'سوهاج', en: 'Sohag' }, { value: 'Qena', ar: 'قنا', en: 'Qena' },
    { value: 'Luxor', ar: 'الأقصر', en: 'Luxor' }, { value: 'Aswan', ar: 'أسوان', en: 'Aswan' }, { value: 'Red Sea', ar: 'البحر الأحمر', en: 'Red Sea' },
    { value: 'Matrouh', ar: 'مطروح', en: 'Matrouh' }, { value: 'North Sinai', ar: 'شمال سيناء', en: 'North Sinai' }, { value: 'South Sinai', ar: 'جنوب سيناء', en: 'South Sinai' }
  ];
  function itemMarkup(line) { return '<div class="checkout-item"><img src="' + Store.asset(Store.safeImage(line.product.images && line.product.images[0])) + '" alt="" loading="lazy"><div><strong>' + esc(Store.i18n.localized(line.product.name)) + '</strong><small>' + esc(Store.Products.variantText(line.variant) || line.product.sku) + ' · ' + t('quantity') + ': ' + line.quantity + '</small></div><b>' + C().money(line.price * line.quantity) + '</b></div>'; }
  function summary(data, subtotal, discount, settings) {
    const threshold = Number(settings.freeDeliveryThreshold || 0);
    const fee = threshold > 0 && subtotal >= threshold ? 0 : Number(settings.deliveryFee || 0);
    const total = Math.max(0, subtotal - discount + fee);
    return { fee: fee, total: total, remaining: threshold > 0 ? Math.max(0, threshold - subtotal) : 0 };
  }
  function deliveryQuote(zones, subzones, zoneId, subzoneId, subtotal, settings) {
    const zone = (zones || []).find(function (item) { return item.id === zoneId; });
    const subzone = zone ? (subzones || []).find(function (item) { return item.id === subzoneId && item.zoneId === zone.id && item.active; }) : null;
    if (zone) {
      const threshold = Number(zone.freeThreshold || 0);
      const baseFee = subzone ? Number(subzone.fee || 0) : Number(zone.fee || 0);
      const fee = threshold > 0 && subtotal >= threshold ? 0 : baseFee;
      return { fee: fee, remaining: threshold > 0 ? Math.max(0, threshold - subtotal) : 0, zone: zone, subzone: subzone };
    }
    const threshold = Number(settings.freeDeliveryThreshold || 0);
    const fee = threshold > 0 && subtotal >= threshold ? 0 : Number(settings.deliveryFee || 0);
    return { fee: fee, remaining: threshold > 0 ? Math.max(0, threshold - subtotal) : 0, zone: null, subzone: null };
  }
  Pages.checkout = async function (root) {
    const data = await Store.Cart.summary();
    const user = Store.Auth.currentUser();
    const view = Store.view.checkout || (Store.view.checkout = { promoCode: '', promo: null, autoPromoDismissed: false, submitting: false, zoneId: '', subzoneId: '', governorate: '' });
    const [zones, subzones] = await Promise.all([
      Store.repo.listZones ? Store.repo.listZones(false) : Promise.resolve([]),
      Store.repo.listSubzones ? Store.repo.listSubzones(false) : Promise.resolve([])
    ]);
    if (!view.promo && !view.promoCode && !view.autoPromoDismissed && Store.repo.validatePromotion) {
      view.promo = await Store.repo.validatePromotion('', data.subtotal, data.lines);
      if (view.promo) view.promoCode = '';
    }
    const sum = deliveryQuote(zones, subzones, view.zoneId || '', view.subzoneId || '', data.subtotal, data.settings);
    if (!data.lines.length) { root.innerHTML = '<div class="page-wrap page-space">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('checkout') }]) + C().empty('bag', t('checkoutEmpty'), t('checkoutEmptyBody'), '<a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('continueShopping') + '</a>') + '</div>'; return; }
    const currentSubzones = zones.filter(function (zone) { return zone.id === view.zoneId; }).length ? subzones.filter(function (subzone) { return subzone.zoneId === view.zoneId && subzone.active; }) : [];
    if (view.subzoneId && !currentSubzones.some(function (subzone) { return subzone.id === view.subzoneId; })) view.subzoneId = '';
    const governorates = [
      { value: 'Cairo', ar: 'القاهرة', en: 'Cairo' }, { value: 'Giza', ar: 'الجيزة', en: 'Giza' }, { value: 'Alexandria', ar: 'الإسكندرية', en: 'Alexandria' },
      { value: 'Qalyubia', ar: 'القليوبية', en: 'Qalyubia' }, { value: 'Sharqia', ar: 'الشرقية', en: 'Sharqia' }, { value: 'Dakahlia', ar: 'الدقهلية', en: 'Dakahlia' },
      { value: 'Gharbia', ar: 'الغربية', en: 'Gharbia' }, { value: 'Monufia', ar: 'المنوفية', en: 'Monufia' }, { value: 'Beheira', ar: 'البحيرة', en: 'Beheira' },
      { value: 'Faiyum', ar: 'الفيوم', en: 'Faiyum' }, { value: 'Beni Suef', ar: 'بني سويف', en: 'Beni Suef' }, { value: 'Minya', ar: 'المنيا', en: 'Minya' },
      { value: 'Asyut', ar: 'أسيوط', en: 'Asyut' }, { value: 'Sohag', ar: 'سوهاج', en: 'Sohag' }, { value: 'Qena', ar: 'قنا', en: 'Qena' },
      { value: 'Luxor', ar: 'الأقصر', en: 'Luxor' }, { value: 'Aswan', ar: 'أسوان', en: 'Aswan' }, { value: 'Red Sea', ar: 'البحر الأحمر', en: 'Red Sea' },
      { value: 'Matrouh', ar: 'مطروح', en: 'Matrouh' }, { value: 'North Sinai', ar: 'شمال سيناء', en: 'North Sinai' }, { value: 'South Sinai', ar: 'جنوب سيناء', en: 'South Sinai' }
    ];
    const zoneRequired = zones.length > 0;
    const selectedGov = view.governorate || '';
    const subzoneRequired = Boolean(currentSubzones.length);
    root.innerHTML = '<div class="page-wrap page-space checkout-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('bag'), href: Store.url('cart.html') }, { label: t('checkout') }]) + '<header class="page-heading"><span class="eyebrow">' + t('checkout') + '</span><h1>' + t('checkoutTitle') + '</h1><p>' + t('checkoutSubtitle') + '</p></header><div class="checkout-layout"><form id="checkout-form" class="checkout-form" novalidate><section class="checkout-card"><div class="checkout-card-heading"><span>01</span><div><h2>' + t('contactDetails') + '</h2><p>' + t('accountSecurityNote') + '</p></div></div><div class="form-grid"><label class="field field-wide"><span>' + t('fullName') + ' <i>*</i></span><input name="customerName" autocomplete="name" required minlength="2" value="' + esc(user && user.fullName || '') + '"></label><label class="field"><span>' + t('email') + '</span><input name="email" type="email" autocomplete="email" value="' + esc(user && user.email || '') + '"></label><label class="field"><span>' + t('phone') + ' <i>*</i></span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+20 1XX XXX XXXX" required value="' + esc(user && user.phone || '') + '"></label></div></section><section class="checkout-card"><div class="checkout-card-heading"><span>02</span><div><h2>' + t('deliveryDetails') + '</h2><p>' + t('deliveryEstimate') + ': 2–5 ' + (Store.i18n.locale === 'ar' ? 'أيام عمل' : 'business days') + '</p></div></div><div class="form-grid"><label class="field"><span>' + (Store.i18n.locale === 'ar' ? 'منطقة التوصيل' : 'Delivery zone') + (zoneRequired ? ' <i>*</i>' : '') + '</span><select name="zoneId" id="delivery-zone" ' + (zoneRequired ? 'required' : '') + '><option value="">' + (Store.i18n.locale === 'ar' ? 'اختر منطقة التوصيل' : 'Select delivery zone') + '</option>' + zones.map(function (item) { return '<option value="' + esc(item.id) + '" ' + (view.zoneId === item.id ? 'selected' : '') + '>' + esc(Store.i18n.localized(item.name)) + '</option>'; }).join('') + '</select>' + (zoneRequired ? '' : '<small class="form-hint">' + (Store.i18n.locale === 'ar' ? 'يمكنك إتمام الطلب بالرسوم العامة حتى يحدد المتجر مناطق التوصيل.' : 'The store-wide delivery fee applies until delivery zones are configured.') + '</small>') + '</label><label class="field"><span>' + (Store.i18n.locale === 'ar' ? 'المنطقة الفرعية' : 'Subzone') + (subzoneRequired ? ' <i>*</i>' : '') + '</span><select name="subzoneId" id="delivery-subzone" ' + (subzoneRequired ? 'required' : '') + '><option value="">' + (Store.i18n.locale === 'ar' ? 'اختر المنطقة الفرعية' : 'Select subzone') + '</option>' + currentSubzones.map(function (item) { return '<option value="' + esc(item.id) + '" ' + (view.subzoneId === item.id ? 'selected' : '') + '>' + esc(Store.i18n.localized(item.name)) + '</option>'; }).join('') + '</select></label><label class="field"><span>' + t('governorate') + ' <i>*</i></span><select name="governorate" required><option value="">' + t('selectGovernorate') + '</option>' + governorates.map(function (item) { return '<option value="' + esc(item.value) + '" ' + (selectedGov === item.value ? 'selected' : '') + '>' + esc(Store.i18n.locale === 'ar' ? item.ar : item.en) + '</option>'; }).join('') + '</select></label><label class="field"><span>' + t('area') + ' <i>*</i></span><input name="area" required autocomplete="address-level3"></label><label class="field field-wide"><span>' + t('address') + ' <i>*</i></span><input name="address" required autocomplete="street-address"></label><label class="field field-wide"><span>' + t('notes') + '</span><textarea name="notes" rows="3"></textarea></label></div></section><section class="checkout-card"><div class="checkout-card-heading"><span>03</span><div><h2>' + t('paymentMethod') + '</h2><p>' + t('paymentNote') + '</p></div></div><div class="payment-options"><label class="payment-option"><input type="radio" name="paymentMethod" value="cash_on_delivery" checked><span class="payment-radio"></span><span><strong>' + t('cashOnDelivery') + '</strong><small>' + (Store.i18n.locale === 'ar' ? 'نقدًا عند وصول المندوب' : 'Pay in cash when your courier arrives') + '</small></span></label><label class="payment-option"><input type="radio" name="paymentMethod" value="card_on_delivery"><span class="payment-radio"></span><span><strong>' + t('cardOnDelivery') + '</strong><small>' + (Store.i18n.locale === 'ar' ? 'استخدم بطاقتك لدى المندوب' : 'Use your card with the courier') + '</small></span></label></div></section><div id="checkout-error" class="form-error" role="alert" hidden></div><button class="button button-primary checkout-submit" type="submit" ' + (view.submitting ? 'disabled' : '') + '>' + C().icon('shield', 17) + (view.submitting ? t('placingOrder') : t('placeOrder')) + C().icon('arrow', 16) + '</button><p class="checkout-footnote">' + C().icon('shield', 14) + t('paymentNote') + '</p></form><aside class="checkout-aside"><div class="checkout-summary-card"><span class="eyebrow">' + t('orderSummary') + '</span><h2>' + t('bag') + ' <small>(' + data.lines.reduce(function (count, line) { return count + line.quantity; }, 0) + ')</small></h2><div class="checkout-items">' + data.lines.map(itemMarkup).join('') + '</div><div class="promo-control"><label for="promo-code">' + t('promoCode') + '</label><div><input id="promo-code" name="promoCode" type="text" autocomplete="off" placeholder="' + t('promoPlaceholder') + '" value="' + esc(view.promoCode || '') + '"><button type="button" class="button button-dark" data-action="apply-promo">' + t('applyCode') + '</button></div>' + (view.promo ? '<p class="promo-success">' + esc(Store.i18n.localized(view.promo.title) || view.promo.code) + ' · ' + esc(view.promo.code) + ' <button type="button" data-action="remove-promo">× ' + t('removeCode') + '</button></p>' : '<small class="form-hint">' + (Store.i18n.locale === 'ar' ? 'أدخل كود الخصم إذا كان لديك كود صالح.' : 'Enter a discount code if you have one.') + '</small>') + '</div><div class="summary-row"><span>' + t('subtotal') + '</span><strong>' + C().money(data.subtotal) + '</strong></div>' + (view.promo ? '<div class="summary-row discount-row"><span>' + t('discount') + ' (' + esc(view.promo.code) + ')</span><strong>−' + C().money(view.promo.discount) + '</strong></div>' : '') + '<div class="summary-row"><span>' + t('delivery') + '</span><strong>' + (sum.fee ? C().money(sum.fee) : t('free')) + '</strong></div>' + (sum.remaining > 0 ? '<p class="free-delivery-hint">' + C().icon('truck', 15) + t('addMoreForFree', { amount: C().money(sum.remaining) }) + '</p>' : '') + '<div class="summary-row summary-total"><span>' + t('total') + '</span><strong>' + C().money(sum.total) + '</strong></div><p class="checkout-egp-note">EGP · ' + t('cairoEgypt') + '</p></div></aside></div></div>';
    const form = document.getElementById('checkout-form');
    const zoneField = document.getElementById('delivery-zone');
    const subzoneField = document.getElementById('delivery-subzone');
    if (zoneField) zoneField.addEventListener('change', function () { view.zoneId = zoneField.value; view.subzoneId = ''; Store.renderCurrent(); });
    if (subzoneField) subzoneField.addEventListener('change', function () { view.subzoneId = subzoneField.value; Store.renderCurrent(); });
    if (form) form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const errorBox = document.getElementById('checkout-error'); errorBox.hidden = true;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const digits = String(values.get('phone') || '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) { errorBox.textContent = t('invalidPhone'); errorBox.hidden = false; form.elements.phone.focus(); return; }
      view.submitting = true;
      const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = t('placingOrder');
      try {
        const cartLines = await Store.Cart.lines();
        const order = await Store.repo.createOrder({ customer: { name: values.get('customerName'), email: values.get('email'), phone: values.get('phone') }, address: { governorate: values.get('governorate'), area: values.get('area'), address: values.get('address'), notes: values.get('notes') }, paymentMethod: values.get('paymentMethod'), promotionCode: view.promo ? view.promo.code : '', zoneId: values.get('zoneId') || '', subzoneId: values.get('subzoneId') || '', items: cartLines.map(function (line) { return { productId: line.product.id, variantId: line.variant && line.variant.id || '', quantity: line.quantity }; }) });
        Store.storage.saveSession(Store.storage.session());
        Store.Cart.clear();
        view.submitting = false;
        Store.view.lastOrder = order;
        window.location.href = Store.url('order-success.html?order=' + encodeURIComponent(order.orderNumber));
      } catch (error) {
        view.submitting = false;
        const message = error && error.message ? error.message : t('orderError');
        errorBox.textContent = message; errorBox.hidden = false; button.disabled = false; button.innerHTML = C().icon('shield', 17) + t('placeOrder') + C().icon('arrow', 16);
      }
    });
  };
  Store.Checkout = {
    applyPromotion: async function () {
      const input = document.getElementById('promo-code'); const subtotal = (await Store.Cart.summary()).subtotal;
      const view = Store.view.checkout || (Store.view.checkout = { promoCode: '', promo: null, submitting: false });
      view.promoCode = input ? input.value.trim().toUpperCase() : '';
      const promo = await Store.repo.validatePromotion(view.promoCode, subtotal, (await Store.Cart.summary()).lines);
      if (!promo) { view.promo = null; C().toast(t('promoInvalid'), 'error'); Store.renderCurrent(); return; }
      view.promo = promo; C().toast(t('promoApplied'), 'success'); Store.renderCurrent();
    },
    removePromotion: function () { const view = Store.view.checkout || {}; view.promo = null; view.promoCode = ''; view.autoPromoDismissed = true; Store.view.checkout = view; Store.renderCurrent(); }
  };
})(window.Store);
