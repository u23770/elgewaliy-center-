(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.Store = root.Store || {}; root.Store.AdminGate = api; }
  if (root && root.document) api.initPage();
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const ACCESS_KEY = 'ceg-admin-access-v2';
  const TOKEN_KEY = 'ceg-admin-session-v1';
  const EXPIRES_KEY = 'ceg-admin-session-expires-v1';
  const FINGERPRINT_KEY = 'ceg-admin-fingerprint-v1';

  function normalizeCode(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
  }

  function storage(storage) {
    if (storage) return storage;
    try { return root.sessionStorage; } catch (_) { return null; }
  }

  function randomToken() {
    const bytes = new Uint8Array(32);
    if (root.crypto && root.crypto.getRandomValues) {
      root.crypto.getRandomValues(bytes);
      return Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    return String(Date.now()) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function currentFingerprint(target) {
    const store = storage(target);
    if (!store) return '';
    let value = '';
    try { value = store.getItem(FINGERPRINT_KEY) || ''; } catch (_) {}
    if (value.length >= 16) return value;
    value = randomToken();
    try { store.setItem(FINGERPRINT_KEY, value); } catch (_) {}
    return value;
  }

  function hasAccess(target) {
    const store = storage(target);
    if (!store) return false;
    try {
      const token = store.getItem(TOKEN_KEY) || '';
      const expires = Number(store.getItem(EXPIRES_KEY) || 0);
      if (!token || token.length < 32 || !Number.isFinite(expires) || expires <= Date.now()) {
        revokeAccess(store);
        return false;
      }
      return store.getItem(ACCESS_KEY) === 'granted';
    } catch (_) { return false; }
  }

  function currentToken(target) {
    const store = storage(target);
    if (!store) return '';
    try { return store.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
  }

  function grantAccess(token, expiresAt, target) {
    const store = storage(target);
    if (!store) throw new Error('Session storage is unavailable.');
    store.setItem(ACCESS_KEY, 'granted');
    store.setItem(TOKEN_KEY, String(token || ''));
    store.setItem(EXPIRES_KEY, String(new Date(expiresAt).getTime()));
  }

  function revokeAccess(target) {
    const store = storage(target);
    if (!store) return;
    let token = '';
    try {
      token = store.getItem(TOKEN_KEY) || '';
      store.removeItem(ACCESS_KEY);
      store.removeItem(TOKEN_KEY);
      store.removeItem(EXPIRES_KEY);
    } catch (_) {}
    if (token && root && root.fetch) {
      const config = root.CEG_CONFIG || {};
      root.fetch(String(config.supabaseUrl || '').replace(/\/$/, '') + '/rest/v1/rpc/admin_revoke_session', {
        method: 'POST',
        headers: {
          apikey: config.supabaseAnonKey || '',
          Authorization: 'Bearer ' + (config.supabaseAnonKey || ''),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_session_token: token }),
        keepalive: true
      }).catch(function () {});
    }
  }

  function adminUser() {
    return {
      id: 'admin-code-session',
      email: 'admin@centerelgowaily.local',
      fullName: 'Gowaily Admin',
      phone: '',
      role: 'admin'
    };
  }

  function dashboardUrl() {
    const body = root.document && root.document.body;
    return (body && body.dataset.root ? body.dataset.root : '../') + 'admin/index.html';
  }

  function loginUrl() {
    const body = root.document && root.document.body;
    return (body && body.dataset.root ? body.dataset.root : '../') + 'admin/login.html';
  }

  function openDashboard() {
    if (root.location) root.location.href = dashboardUrl();
  }

  async function createLiveSession(value) {
    const config = root.CEG_CONFIG || {};
    if (config.dataMode !== 'supabase' || !config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error(root.document.documentElement.lang === 'ar' ? 'المتجر الحي غير مُعد بشكل صحيح.' : 'The live store backend is not configured.');
    }

    const sessionToken = randomToken();
    const fingerprint = currentFingerprint();

    const response = await root.fetch(String(config.supabaseUrl).replace(/\/$/, '') + '/rest/v1/rpc/admin_start_session', {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_admin_code: normalizeCode(value),
        p_session_token: sessionToken,
        p_fingerprint: fingerprint
      })
    });

    const raw = await response.text();
    let payload = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch (_) {}

    if (!response.ok) {
      throw new Error((payload && (payload.message || payload.error)) || (root.document.documentElement.lang === 'ar' ? 'تعذر التحقق من كود الإدارة.' : 'Unable to verify the admin access code.'));
    }

    return {
      token: sessionToken,
      expiresAt: payload && payload.expires_at ? payload.expires_at : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    };
  }

  function handleLogin(form) {
    const codeField = form.elements.code;
    const error = root.document.getElementById('admin-code-error');
    if (error) error.hidden = true;
    const value = normalizeCode(codeField && codeField.value);
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    createLiveSession(value).then(function (session) {
      grantAccess(session.token, session.expiresAt);
      openDashboard();
    }).catch(function (reason) {
      if (error) {
        error.textContent = reason.message || 'Unable to verify the admin code.';
        error.hidden = false;
      }
      if (codeField) {
        codeField.focus();
        codeField.select();
      }
    }).finally(function () {
      if (submit) submit.disabled = false;
    });
  }

  function initPage() {
    if (!root || !root.document) return;
    const init = function () {
      const form = root.document.getElementById('admin-code-form');
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          handleLogin(form);
        });
      }
      const page = root.document.body && root.document.body.dataset.page;
      if (page && page !== 'admin-login' && !hasAccess()) {
        root.location.replace(loginUrl());
      }
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }

  return {
    ACCESS_KEY: ACCESS_KEY,
    TOKEN_KEY: TOKEN_KEY,
    isValidCode: async function () { return false; },
    hasAccess: hasAccess,
    currentCode: currentToken,
    grantAccess: grantAccess,
    revokeAccess: revokeAccess,
    adminUser: adminUser,
    adminCode: function () { return currentToken(); },
    openDashboard: openDashboard,
    initPage: initPage
  };
});
