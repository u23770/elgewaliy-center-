/* Static-site configuration. Only the Supabase URL and anon/public key may be placed here. */
window.CEG_CONFIG = window.CEG_CONFIG || {
  dataMode: 'demo',
  supabaseUrl: '',
  supabaseAnonKey: '',
  emailConfirmation: false
};
window.Store = window.Store || {};
Object.assign(window.Store, {
  config: window.CEG_CONFIG,
  view: {},
  root: function () { return document.body && document.body.dataset.root ? document.body.dataset.root : './'; },
  url: function (path) { return this.root() + String(path || '').replace(/^\/+/, ''); },
  asset: function (path) {
    if (!path) return this.url('assets/images/fallback.svg');
    const value = String(path);
    if (/^(https?:|data:image\/|blob:)/i.test(value)) return value;
    return this.url(value.replace(/^\/+/, ''));
  },
  escape: function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  },
  safeImage: function (value) {
    const candidate = String(value || '');
    return /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif|avif);base64,|assets\/|\.\.\/)/i.test(candidate) ? candidate : 'assets/images/fallback.svg';
  },
  id: function () {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'ceg-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  },
  clone: function (value) { return JSON.parse(JSON.stringify(value)); },
  query: function (key) { return new URLSearchParams(window.location.search).get(key) || ''; },
  fire: function (name, detail) { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); },
  safeColor: function (value) { return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : '#777e60'; },
  safeExternalUrl: function (value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(assets\/|\.\.\/)/i.test(raw) || /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(raw)) return raw;
    try { const parsed = new URL(raw, window.location.href); return ['http:', 'https:'].includes(parsed.protocol) ? raw : ''; }
    catch (_) { return ''; }
  }
});
