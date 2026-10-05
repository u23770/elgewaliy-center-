(function (Store) {
  const STATE_KEY = 'ceg-production-store-v1';
  const CART_KEY = 'ceg-static-cart-v1';
  const SESSION_KEY = 'ceg-static-session-v1';
  const LOCALE_KEY = 'ceg-static-locale-v1';
  let memory = Object.create(null);
  function readRaw(key) {
    try { const value = window.localStorage.getItem(key); return value == null ? null : JSON.parse(value); }
    catch (_) { return memory[key] == null ? null : Store.clone(memory[key]); }
  }
  function writeRaw(key, value) {
    memory[key] = Store.clone(value);
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Keep this tab usable when storage is blocked. */ }
    Store.fire('ceg:storage', { key: key });
  }
  function state() {
    let current = readRaw(STATE_KEY);
    if (!current || typeof current !== 'object') {
      current = { products: [], categories: [], sizes: [], colors: [], promotions: [], orders: [], customers: [], settings: {} };
      writeRaw(STATE_KEY, current);
    }
    return current;
  }
  const storage = {
    state: state,
    saveState: function (value) { writeRaw(STATE_KEY, value); Store.fire('ceg:data-changed'); },
    updateState: function (mutator) { const current = state(); const result = mutator(current) || current; writeRaw(STATE_KEY, result); Store.fire('ceg:data-changed'); return result; },
    cart: function () { const value = readRaw(CART_KEY); return Array.isArray(value) ? value : []; },
    saveCart: function (value) { writeRaw(CART_KEY, value); Store.fire('ceg:cart-changed', { cart: value }); },
    session: function () { return readRaw(SESSION_KEY); },
    saveSession: function (value) { if (value) writeRaw(SESSION_KEY, value); else { try { localStorage.removeItem(SESSION_KEY); } catch (_) { delete memory[SESSION_KEY]; } Store.fire('ceg:session-changed'); } },
    locale: function () { const value = readRaw(LOCALE_KEY); return value === 'en' || value === 'ar' ? value : 'ar'; },
    saveLocale: function (value) { writeRaw(LOCALE_KEY, value); },
    clearLocalCache: function () { try { ['ceg-static-store-v1','ceg-static-cart-v1','ceg-static-session-v1','ceg-static-newsletter',STATE_KEY,CART_KEY,SESSION_KEY].forEach(function (key) { localStorage.removeItem(key); }); } catch (_) {} memory = Object.create(null); }
  };
  Store.storage = storage;
})(window.Store);
