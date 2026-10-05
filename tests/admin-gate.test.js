const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ADMIN_CODE,
  ACCESS_KEY,
  isValidCode,
  hasAccess,
  grantAccess,
  revokeAccess
} = require('../admin/gate.js');

test('accepts the configured admin access code and rejects other codes', async () => {
  assert.equal(await isValidCode(ADMIN_CODE), true);
  assert.equal(await isValidCode('wrong-code'), false);
  assert.equal(await isValidCode(''), false);
});

test('stores admin access separately in session storage', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };

  assert.equal(hasAccess(storage), false);
  grantAccess(storage);
  assert.equal(values.get(ACCESS_KEY), 'granted');
  assert.equal(hasAccess(storage), true);
  revokeAccess(storage);
  assert.equal(hasAccess(storage), false);
});
