(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StoreAdminAccess = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function normalizeAdminCode(value) {
    return String(value == null ? '' : value).trim().toUpperCase();
  }

  function isAllowedAdminOrigin(value) {
    const raw = String(value || '').trim();
    if (!raw) return true;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:') return false;
      return url.hostname === 'elgewaliy-center.vercel.app'
        || /^elgewaliy-center-[a-z0-9-]+-yousry\.vercel\.app$/i.test(url.hostname);
    } catch (_) {
      return false;
    }
  }

  function nextRateLimitState(previous, success, nowMs) {
    const now = Number(nowMs);
    const current = previous || { failedAttempts: 0, windowStartedAt: now, lockedUntil: null };
    if (success) return { failedAttempts: 0, windowStartedAt: now, lockedUntil: null };
    const windowAge = now - Number(current.windowStartedAt || 0);
    const base = windowAge >= 15 * 60 * 1000
      ? { failedAttempts: 0, windowStartedAt: now, lockedUntil: null }
      : { failedAttempts: Number(current.failedAttempts || 0), windowStartedAt: Number(current.windowStartedAt || now), lockedUntil: current.lockedUntil || null };
    base.failedAttempts += 1;
    if (base.failedAttempts >= 5) base.lockedUntil = now + 15 * 60 * 1000;
    return base;
  }

  return { normalizeAdminCode, isAllowedAdminOrigin, nextRateLimitState };
});
