const test = require('node:test');
const assert = require('node:assert/strict');
const { SESSION_KEY, hasAccess, currentCode, revokeAccess } = require('../admin/gate.js');

function makeStorage() {
  const values = new Map();
  return {
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    },
    values
  };
}

test('recognizes an active server-issued session token in session storage', () => {
  const { storage, values } = makeStorage();
  const token = 'a'.repeat(64);
  values.set(SESSION_KEY, token);
  assert.equal(hasAccess(storage), true);
  assert.equal(currentCode(storage), token);
});

test('does not expose the raw administrator access code as a gate constant', () => {
  const gate = require('../admin/gate.js');
  assert.equal(Object.prototype.hasOwnProperty.call(gate, 'ADMIN_CODE'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(gate, 'CODE_KEY'), false);
});

test('revokes the local server-issued session token', async () => {
  const { storage, values } = makeStorage();
  values.set(SESSION_KEY, 'b'.repeat(64));
  await revokeAccess(storage);
  assert.equal(hasAccess(storage), false);
  assert.equal(values.has(SESSION_KEY), false);
});


test('signInAndVerify confirms the newly issued session before continuing', async () => {
  const values = new Map();
  const oldSessionStorage = global.sessionStorage;
  const oldScreen = global.screen;
  const oldConfig = global.CEG_CONFIG;
  const oldFetch = global.fetch;

  global.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
  global.screen = { width: 390, height: 844 };
  global.CEG_CONFIG = {
    supabaseUrl: 'https://example.test',
    supabaseAnonKey: 'public-test-key'
  };

  const requested = [];
  global.fetch = async (url) => {
    requested.push(String(url));
    return {
      ok: true,
      text: async () => String(url).endsWith('/admin_start_session') ? '{"expires_in":43200}' : 'true'
    };
  };

  try {
    assert.equal(await require('../admin/gate.js').signInAndVerify('VALID-CODE'), true);
    assert.equal(values.get(SESSION_KEY).length, 64);
    assert.equal(requested.length, 2);
    assert.match(requested[0], /\/rpc\/admin_start_session$/);
    assert.match(requested[1], /\/rpc\/is_valid_admin_code$/);
  } finally {
    global.sessionStorage = oldSessionStorage;
    global.screen = oldScreen;
    global.CEG_CONFIG = oldConfig;
    global.fetch = oldFetch;
  }
});
