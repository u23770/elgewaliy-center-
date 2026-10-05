const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACCESS_KEY,
  CODE_KEY,
  hasAccess,
  currentCode,
  grantAccess,
  revokeAccess
} = require('../admin/gate.js');

test('stores the entered admin code only in the session access store', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };

  assert.equal(hasAccess(storage), false);
  grantAccess('GOWAILY-ADMIN-2026', storage);
  assert.equal(values.get(ACCESS_KEY), 'granted');
  assert.equal(values.get(CODE_KEY), 'GOWAILY-ADMIN-2026');
  assert.equal(currentCode(storage), 'GOWAILY-ADMIN-2026');
  assert.equal(hasAccess(storage), true);
  revokeAccess(storage);
  assert.equal(hasAccess(storage), false);
  assert.equal(currentCode(storage), '');
});

test('does not expose an admin secret as a public gate constant', () => {
  const gate = require('../admin/gate.js');
  assert.equal(Object.prototype.hasOwnProperty.call(gate, 'ADMIN_CODE'), false);
});
