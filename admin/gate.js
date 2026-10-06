(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.Store = root.Store || {}; root.Store.AdminGate = api; }
  if (root && root.document) api.initPage();
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const SESSION_KEY = 'ceg-admin-session-v3';
  const FINGERPRINT_KEY = 'ceg-admin-fingerprint-v1';

  function storage(storage) {
    if (storage) return storage;
    try { return root.sessionStorage; } catch (_) { return null; }
  }
  function read(key, target) {
    const s = storage(target);
    if (!s) return '';
    try { return s.getItem(key) || ''; } catch (_) { return ''; }
  }
  function write(key, value, target) {
    const s = storage(target);
    if (!s) throw new Error('Session storage is unavailable.');
    s.setItem(key, String(value || ''));
  }
  function remove(key, target) {
    const s = storage(target);
    if (!s) return;
    try { s.removeItem(key); } catch (_) {}
  }
  function token() { return read(SESSION_KEY); }
  function currentFingerprint() {
    let value = read(FINGERPRINT_KEY);
    if (value) return value;
    value = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.platform || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String(screen.width || 0) + 'x' + String(screen.height || 0)
    ].join('|');
    try { write(FINGERPRINT_KEY, value); } catch (_) {}
    return value;
  }
  function randomToken() {
    const bytes = new Uint8Array(32);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function hasAccess(target) { return token(target).length >= 32; }
  async function verifySession(value) {
    const sessionToken = value || token();
    if (sessionToken.length < 32) return false;
    const config = root.CEG_CONFIG || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) return false;
    const response = await root.fetch(String(config.supabaseUrl).replace(/\/$/, '') + '/rest/v1/rpc/is_valid_admin_code', {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_code: sessionToken })
    });
    if (!response.ok) return false;
    const raw = await response.text();
    return raw === 'true' || raw === '"true"' || raw === '1';
  }
  async function signIn(code) {
    const clean = String(code || '').trim();
    if (clean.length < 6) throw new Error('Invalid admin access code.');
    const sessionToken = randomToken();
    const fingerprint = currentFingerprint();
    const config = root.CEG_CONFIG || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('The live store backend is not configured.');
    const response = await root.fetch(String(config.supabaseUrl).replace(/\/$/, '') + '/rest/v1/rpc/admin_start_session', {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_admin_code: clean, p_session_token: sessionToken, p_fingerprint: fingerprint })
    });
    const raw = await response.text();
    if (!response.ok) {
      let message = 'Unable to verify the admin access code.';
      try { const payload = JSON.parse(raw); message = payload.message || payload.msg || message; } catch (_) {}
      throw new Error(message);
    }
    write(SESSION_KEY, sessionToken);
    return true;
  }

  async function signInAndVerify(code) {
    await signIn(code);
    const sessionToken = token();
    const valid = await verifySession(sessionToken);
    if (!valid) {
      await revokeAccess();
      throw new Error('The admin session could not be verified. Please try again.');
    }
    return true;
  }
  async function revokeAccess(target) {
    const sessionToken = token(target);
    if (sessionToken) {
      const config = root.CEG_CONFIG || {};
      try {
        if (config.supabaseUrl && config.supabaseAnonKey) {
          await root.fetch(String(config.supabaseUrl).replace(/\/$/, '') + '/rest/v1/rpc/admin_revoke_session', {
            method: 'POST',
            headers: {
              apikey: config.supabaseAnonKey,
              Authorization: 'Bearer ' + config.supabaseAnonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_session_token: sessionToken })
          });
        }
      } catch (_) {}
    }
    remove(SESSION_KEY, target);
  }
  function adminUser() {
    return { id: 'admin-session', email: '', fullName: 'Gowaily Admin', phone: '', role: 'admin' };
  }
  function dashboardUrl() {
    const body = root.document && root.document.body;
    return (body && body.dataset.root ? body.dataset.root : '../') + 'admin/index.html';
  }
  function loginUrl() {
    const body = root.document && root.document.body;
    return (body && body.dataset.root ? body.dataset.root : '../') + 'admin/login.html';
  }
  function openDashboard() { if (root.location) root.location.href = dashboardUrl(); }

  function initPage() {
    if (!root || !root.document) return;
    const init = function () {
      const form = root.document.getElementById('admin-code-form');
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          const field = form.elements.code;
          const error = root.document.getElementById('admin-code-error');
          if (error) error.hidden = true;
          const submit = form.querySelector('button[type="submit"]');
          if (submit) submit.disabled = true;
          signInAndVerify(field && field.value).then(function () {
            if (field) field.value = '';
            openDashboard();
          }).catch(function (reason) {
            if (error) { error.textContent = reason.message || 'Invalid admin access code.'; error.hidden = false; }
            if (field) { field.focus(); field.select(); }
          }).finally(function () { if (submit) submit.disabled = false; });
        });
      }
      const page = root.document.body && root.document.body.dataset.page;
      if (page && page !== 'admin-login') {
        if (!hasAccess()) {
          root.location.replace(loginUrl());
        } else {
          verifySession().then(function (valid) {
            if (!valid) return revokeAccess().then(function () { root.location.replace(loginUrl()); });
          }).catch(function () { revokeAccess().then(function () { root.location.replace(loginUrl()); }); });
        }
      }
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }

  return {
    SESSION_KEY,
    hasAccess,
    verifySession,
    signIn,
    revokeAccess,
    currentCode: token,
    adminCode: token,
    adminUser,
    openDashboard,
    initPage
  };
});