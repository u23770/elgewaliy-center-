const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACCESS_KEY,
  TOKEN_KEY,
  hasAccess,
  currentCode,
  grantAccess,
  revokeAccess
} = require('../admin/gate.js');

test('stores only the admin session token in the session access store', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };

  assert.equal(hasAccess(storage), false);
  const token = 'a'.repeat(64);
  grantAccess(token, new Date(Date.now() + 60_000).toISOString(), storage);
  assert.equal(values.get(ACCESS_KEY), 'granted');
  assert.equal(values.get(TOKEN_KEY), token);
  assert.equal(currentCode(storage), token);
  assert.equal(values.has('ceg-admin-code-v2'), false);
  assert.equal(hasAccess(storage), true);
  revokeAccess(storage);
  assert.equal(hasAccess(storage), false);
  assert.equal(currentCode(storage), '');
});

test('expired admin sessions are rejected', () => {
  const values = new Map([
    [ACCESS_KEY, 'granted'],
    [TOKEN_KEY, 'a'.repeat(64)],
    ['ceg-admin-session-expires-v1', String(Date.now() - 1)]
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  assert.equal(hasAccess(storage), false);
});

test('does not expose an admin secret as a public gate constant', () => {
  const gate = require('../admin/gate.js');
  assert.equal(Object.prototype.hasOwnProperty.call(gate, 'ADMIN_CODE'), false);
});
