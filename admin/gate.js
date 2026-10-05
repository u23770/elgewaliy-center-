(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.Store = root.Store || {}; root.Store.AdminGate = api; }
  if (root && root.document) api.initPage();
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const ACCESS_KEY = 'ceg-admin-access-v2';
  const CODE_KEY = 'ceg-admin-code-v2';

  function normalizeCode(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
  }

  function getStorage(storage) {
    if (storage) return storage;
    try { return root.sessionStorage; } catch (_) { return null; }
  }

  function hasAccess(storage) {
    const target = getStorage(storage);
    if (!target) return false;
    try { return target.getItem(ACCESS_KEY) === 'granted' && Boolean(target.getItem(CODE_KEY)); } catch (_) { return false; }
  }

  function currentCode(storage) {
    const target = getStorage(storage);
    if (!target) return '';
    try { return target.getItem(CODE_KEY) || ''; } catch (_) { return ''; }
  }

  function grantAccess(code, storage) {
    const target = getStorage(storage);
    if (!target) throw new Error('Session storage is unavailable.');
    target.setItem(ACCESS_KEY, 'granted');
    target.setItem(CODE_KEY, normalizeCode(code));
  }

  function revokeAccess(storage) {
    const target = getStorage(storage);
    if (!target) return;
    try {
      target.removeItem(ACCESS_KEY);
      target.removeItem(CODE_KEY);
    } catch (_) {}
  }

  function adminUser() {
    return {
      id: 'admin-code-session',
      email: 'admin-code@centerelgowaily.local',
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

  async function verifyAgainstLiveStore(value) {
    const config = root.CEG_CONFIG || {};
    if (config.dataMode !== 'supabase') {
      throw new Error('The live store backend is not configured.');
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error('The live store backend is not configured.');
    }
    const response = await root.fetch(String(config.supabaseUrl).replace(/\/$/, '') + '/rest/v1/rpc/is_valid_admin_code', {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_code: normalizeCode(value) })
    });
    if (!response.ok) throw new Error('Unable to reach the admin security service.');
    const raw = await response.text();
    try { return Boolean(JSON.parse(raw)); } catch (_) { return raw === 'true'; }
  }

  function handleLogin(form) {
    const codeField = form.elements.code;
    const error = root.document.getElementById('admin-code-error');
    if (error) error.hidden = true;
    const value = normalizeCode(codeField && codeField.value);
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    verifyAgainstLiveStore(value).then(function (valid) {
      if (!valid) throw new Error(root.document.documentElement.lang === 'ar' ? 'كود الإدارة غير صحيح.' : 'Invalid admin access code.');
      grantAccess(value);
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
    CODE_KEY: CODE_KEY,
    isValidCode: verifyAgainstLiveStore,
    hasAccess: hasAccess,
    currentCode: currentCode,
    grantAccess: grantAccess,
    revokeAccess: revokeAccess,
    adminUser: adminUser,
    adminCode: function () { return currentCode(); },
    openDashboard: openDashboard,
    initPage: initPage
  };
});
