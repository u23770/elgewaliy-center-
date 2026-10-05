(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.StoreNewsletter = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function normalizeSubscriberEmail(value) {
    const email = String(value == null ? '' : value).trim().toLowerCase();
    if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.');
    }
    return email;
  }
  return { normalizeSubscriberEmail };
});
