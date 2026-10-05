(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.StoreMapsUtils = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function isGoogleMapsLink(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.toLowerCase();
      const path = url.pathname.toLowerCase();
      const isGoogleHost = host === 'google.com' || host.endsWith('.google.com') || /^google\.[a-z]{2,}$/i.test(host) || /\.google\.[a-z]{2,}$/i.test(host);
      const isMapsShortHost = host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps'));
      if (isMapsShortHost) return true;
      return isGoogleHost && (host === 'maps.google.com' || path.startsWith('/maps') || path.includes('/maps/'));
    } catch (_) {
      return false;
    }
  }
  return { isGoogleMapsLink };
});
