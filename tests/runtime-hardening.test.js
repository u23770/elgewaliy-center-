const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadSupabase(fetchImpl) {
  const Store = {
    config: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-key' },
    storage: { session: () => null }
  };
  const context = {
    window: { Store },
    Headers,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: fetchImpl,
    console
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/supabase.js'), 'utf8'), context);
  return Store.supabase;
}

test('Supabase requests fail with a clear timeout instead of hanging forever', async () => {
  const supabase = loadSupabase((_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    setTimeout(() => resolve({
      ok: true,
      text: async () => '[]'
    }), 1000);
  }));

  await assert.rejects(
    () => supabase.rest('products', { select: 'id' }, { timeoutMs: 20 }),
    (error) => error && error.code === 'ETIMEDOUT' && /timed out/i.test(error.message)
  );
});

test('site config defaults to the repository brand logo path', () => {
  const config = require('../js/site-config-utils.js');
  assert.equal(config.DEFAULTS.identity.logoPath, 'assets/brand/logo.png');
});
