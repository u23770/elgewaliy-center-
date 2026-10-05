(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const C = function () { return Store.Components; };
  function lineKey(item) { return item.productId + '|' + (item.variantId || ''); }
  function read() { return Store.storage.cart(); }
  function write(items) { Store.storage.saveCart(items); updateHeaderCount(); }
  function updateHeaderCount() { const node = document.getElementById('bag-count'); if (node) node.textContent = String(count()); }
  function count() { return read().reduce(function (total, item) { return total + Math.max(0, Number(item.quantity || 0)); }, 0); }
  async function lines() {
    const cart = read();
    const result = [];
    const valid = [];
    for (const item of cart) {
      const product = await Store.repo.getProduct(item.productId);
      if (!product) continue;
      const variant = item.variantId ? Store.Products.variantFor(product, item.variantId) : null;
      if (item.variantId && !variant) continue;
      result.push({ key: lineKey(item), product: product, variant: variant, quantity: Number(item.quantity || 1), price: Store.Products.price(product, variant), stock: Store.Products.stock(product, variant) });
      valid.push(item);
    }
    if (valid.length !== cart.length) write(valid);
    return result;
  }
  async function add(productId, variantId, quantity) {
    const product = await Store.repo.getProduct(productId);
    if (!product) throw new Error(t('outOfStock'));
    const variant = variantId ? Store.Products.variantFor(product, variantId) : null;
    if (product.variants && product.variants.length && !variant) throw new Error(t('selectVariantFirst'));
    if (variantId && !variant) throw new Error(t('outOfStock'));
    const amount = Math.max(1, Math.floor(Number(quantity || 1)));
    const stock = Store.Products.stock(product, variant);
    const items = read();
    const key = productId + '|' + (variantId || '');
    const existing = items.find(function (item) { return lineKey(item) === key; });
    const next = (existing ? Number(existing.quantity) : 0) + amount;
    if (stock < next) throw new Error(t('stockLimit', { count: stock }));
    if (existing) existing.quantity = next;
    else items.push({ productId: productId, variantId: variantId || '', quantity: amount });
    write(items);
    C().toast(t('addedToBag'), 'success');
    Store.Cart.openDrawer();
  }
  async function setQuantity(key, quantity) {
    const items = read();
    const item = items.find(function (entry) { return lineKey(entry) === key; });
    if (!item) return;
    const value = Math.floor(Number(quantity));
    if (value <= 0) return remove(key);
    const product = await Store.repo.getProduct(item.productId);
    const variant = item.variantId && product ? Store.Products.variantFor(product, item.variantId) : null;
    const stock = product ? Store.Products.stock(product, variant) : 0;
    if (value > stock) throw new Error(t('stockLimit', { count: stock }));
    item.quantity = value; write(items);
  }
  function remove(key) { write(read().filter(function (item) { return lineKey(item) !== key; })); C().toast(t('itemRemoved'), 'success'); }
  function clear() { write([]); }
  async function summary() {
    const current = await lines();
    const subtotal = current.reduce(function (total, item) { return total + item.price * item.quantity; }, 0);
    const settings = await Store.repo.getSettings();
    const threshold = Number(settings.freeDeliveryThreshold || 0);
    const delivery = subtotal >= threshold && threshold > 0 ? 0 : Number(settings.deliveryFee || 0);
    return { lines: current, subtotal: subtotal, delivery: delivery, total: subtotal + delivery, settings: settings, remaining: threshold > 0 ? Math.max(0, threshold - subtotal) : 0 };
  }
  function lineMarkup(line, compact) {
    const name = Store.escape(Store.i18n.localized(line.product.name));
    const image = Store.asset(Store.safeImage(line.product.images && line.product.images[0]));
    const variantLabel = Store.Products.variantText(line.variant);
    return '<article class="cart-line ' + (compact ? 'cart-line-compact' : '') + '" data-cart-line="' + Store.escape(line.key) + '"><a class="cart-line-image" href="' + Store.url('product.html?id=' + encodeURIComponent(line.product.id)) + '"><img src="' + image + '" alt="' + name + '" loading="lazy" data-fallback="' + Store.asset('assets/images/fallback.svg') + '"></a><div class="cart-line-info"><a class="cart-line-name" href="' + Store.url('product.html?id=' + encodeURIComponent(line.product.id)) + '">' + name + '</a>' + (variantLabel ? '<span class="cart-line-variant">' + Store.escape(variantLabel) + '</span>' : '') + '<span class="cart-line-sku">' + Store.escape(line.variant && line.variant.sku || line.product.sku) + '</span><div class="cart-line-controls"><div class="quantity-control small"><button type="button" data-action="cart-quantity" data-line="' + Store.escape(line.key) + '" data-delta="-1" aria-label="' + t('remove') + '">−</button><output>' + line.quantity + '</output><button type="button" data-action="cart-quantity" data-line="' + Store.escape(line.key) + '" data-delta="1" aria-label="' + t('quantity') + '">+</button></div><button type="button" class="text-button remove-line" data-action="cart-remove" data-line="' + Store.escape(line.key) + '">' + t('remove') + '</button></div></div><div class="cart-line-price">' + C().money(line.price * line.quantity) + '</div></article>';
  }
  function summaryMarkup(summary, drawer) {
    return '<div class="cart-summary-box"><div class="summary-row"><span>' + t('subtotal') + '</span><strong>' + C().money(summary.subtotal) + '</strong></div><div class="summary-row"><span>' + t('delivery') + '</span><strong>' + (summary.delivery === 0 ? t('free') : C().money(summary.delivery)) + '</strong></div>' + (summary.remaining > 0 ? '<p class="free-delivery-hint">' + C().icon('truck', 16) + t('addMoreForFree', { amount: C().money(summary.remaining) }) + '</p>' : '') + '<div class="summary-row summary-total"><span>' + t('total') + '</span><strong>' + C().money(summary.total) + '</strong></div><a class="button button-primary button-full" href="' + Store.url('checkout.html') + '">' + t('checkout') + C().icon('arrow', 16) + '</a>' + (drawer ? '<a class="drawer-view-bag" href="' + Store.url('cart.html') + '">' + t('viewBag') + '</a>' : '') + '</div>';
  }
  async function renderDrawer() {
    const host = document.getElementById('cart-drawer-host');
    if (!host) return;
    const opened = Boolean(Store.view.cartDrawerOpen);
    const summaryData = await summary();
    host.innerHTML = '<div class="cart-drawer-backdrop ' + (opened ? 'visible' : '') + '" data-action="cart-drawer-close" aria-hidden="' + (!opened) + '"></div><aside class="cart-drawer ' + (opened ? 'open' : '') + '" role="dialog" aria-modal="' + opened + '" aria-label="' + t('bagDrawerTitle') + '"><header class="cart-drawer-header"><div><span class="eyebrow">' + t('cart') + '</span><h2>' + t('bagDrawerTitle') + ' <small>(' + count() + ')</small></h2></div><button type="button" class="icon-button" data-action="cart-drawer-close" aria-label="' + t('close') + '">' + C().icon('close', 20) + '</button></header><div class="cart-drawer-items">' + (summaryData.lines.length ? summaryData.lines.map(function (line) { return lineMarkup(line, true); }).join('') : C().empty('bag', t('cartEmpty'), t('cartEmptyBody'), '<a class="button button-outline" href="' + Store.url('shop.html') + '">' + t('continueShopping') + '</a>')) + '</div>' + (summaryData.lines.length ? summaryMarkup(summaryData, true) : '') + '</aside>';
  }
  function openDrawer() { Store.view.cartDrawerOpen = true; renderDrawer(); document.body.classList.add('drawer-open'); }
  function closeDrawer() { Store.view.cartDrawerOpen = false; const drawer = document.querySelector('.cart-drawer'); if (drawer) drawer.classList.remove('open'); const backdrop = document.querySelector('.cart-drawer-backdrop'); if (backdrop) backdrop.classList.remove('visible'); document.body.classList.remove('drawer-open'); }
  async function renderCartPage(root) {
    const data = await summary();
    root.innerHTML = '<div class="page-wrap page-space cart-page">' + Store.Products.crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('bag') }]) + '<header class="page-heading"><span class="eyebrow">' + t('cart') + '</span><h1>' + t('bag') + ' <small>(' + count() + ')</small></h1></header>' + (data.lines.length ? '<div class="cart-page-layout"><section class="cart-items-list">' + data.lines.map(function (line) { return lineMarkup(line, false); }).join('') + '<a class="text-link continue-link" href="' + Store.url('shop.html') + '">' + C().icon('arrow', 16) + t('continueShopping') + '</a></section><aside class="cart-summary-card"><span class="eyebrow">' + t('orderSummary') + '</span><h2>' + t('bag') + '</h2>' + summaryMarkup(data, false) + '<p class="checkout-reassurance">' + C().icon('shield', 16) + t('paymentNote') + '</p></aside></div>' : C().empty('bag', t('cartEmpty'), t('cartEmptyBody'), '<a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('continueShopping') + C().icon('arrow', 16) + '</a>')) + '</div>';
  }
  Store.Cart = { count: count, lines: lines, add: add, setQuantity: setQuantity, remove: remove, clear: clear, summary: summary, renderDrawer: renderDrawer, openDrawer: openDrawer, closeDrawer: closeDrawer, lineKey: lineKey, renderPage: renderCartPage };
  window.addEventListener('ceg:cart-changed', function () { updateHeaderCount(); if (Store.view.cartDrawerOpen) renderDrawer(); });
  window.addEventListener('storage', function () { updateHeaderCount(); if (Store.view.cartDrawerOpen) renderDrawer(); });
})(window.Store);
