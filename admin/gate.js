(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.Store = root.Store || {}; root.Store.AdminGate = api; }
  if (root && root.document) api.initPage();
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const ADMIN_CODE_HASH = 'f51362d824786cefd69239558b4002f60be7914ba52bcf5a68b72ce0004c2ba7';
  const ADMIN_CODE_LABEL = 'GOWAILY-ADMIN-2026';
  const ACCESS_KEY = 'ceg-admin-access-v1';

  function normalizeCode(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
  }

  async function sha256(value) {
    if (!root.crypto || !root.crypto.subtle || typeof root.TextEncoder === 'undefined') {
      throw new Error('Secure code verification is unavailable in this browser.');
    }
    const bytes = new TextEncoder().encode(normalizeCode(value));
    const buffer = await root.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buffer)).map(function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  async function isValidCode(value) {
    const candidate = await sha256(value);
    return candidate === ADMIN_CODE_HASH;
  }

  function getStorage(storage) {
    if (storage) return storage;
    try { return root.sessionStorage; } catch (_) { return null; }
  }

  function hasAccess(storage) {
    const target = getStorage(storage);
    if (!target) return false;
    try { return target.getItem(ACCESS_KEY) === 'granted'; } catch (_) { return false; }
  }

  function grantAccess(storage) {
    const target = getStorage(storage);
    if (!target) throw new Error('Session storage is unavailable.');
    target.setItem(ACCESS_KEY, 'granted');
  }

  function revokeAccess(storage) {
    const target = getStorage(storage);
    if (!target) return;
    try { target.removeItem(ACCESS_KEY); } catch (_) {}
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

  function handleLogin(form) {
    const codeField = form.elements.code;
    const error = root.document.getElementById('admin-code-error');
    if (error) error.hidden = true;
    const value = normalizeCode(codeField && codeField.value);
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    isValidCode(value).then(function (valid) {
      if (!valid) {
        if (error) {
          error.textContent = root.document.documentElement.lang === 'ar' ? 'كود الإدارة غير صحيح.' : 'Invalid admin access code.';
          error.hidden = false;
        }
        if (codeField) {
          codeField.focus();
          codeField.select();
        }
        return;
      }
      grantAccess();
      openDashboard();
    }).catch(function (reason) {
      if (error) {
        error.textContent = reason.message || 'Unable to verify the admin code.';
        error.hidden = false;
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
    ADMIN_CODE: ADMIN_CODE_LABEL,
    ACCESS_KEY: ACCESS_KEY,
    isValidCode: isValidCode,
    hasAccess: hasAccess,
    grantAccess: grantAccess,
    revokeAccess: revokeAccess,
    adminUser: adminUser,
    openDashboard: openDashboard,
    initPage: initPage
  };
});
