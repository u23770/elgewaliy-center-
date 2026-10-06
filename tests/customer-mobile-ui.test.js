const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('customer header keeps search and navigation as separate mobile surfaces', () => {
  const source = read('js/components.js');
  assert.match(source, /mobile-search-panel/);
  assert.match(source, /data-action="mobile-search"/);
  assert.match(source, /data-action="mobile-search-close"/);
  assert.match(source, /aria-controls="mobile-search-panel"/);

  const app = read('js/app.js');
  assert.match(app, /function setMobileSearch\(open\)/);
  assert.match(app, /action === 'mobile-search-close'/);
  assert.match(app, /setMobileSearch\(true\)/);
});

test('customer home loading and account affordances use the store identity', () => {
  const app = read('js/app.js');
  assert.match(app, /initial-loader/);
  assert.match(app, /loader-logo/);

  const home = read('js/products.js');
  assert.match(home, /accountHref/);
  assert.match(home, /accountLabel/);
  assert.match(home, /profile\.html/);
  assert.match(home, /login\.html/);
});

test('mobile navigation and search surfaces have opaque backgrounds', () => {
  const css = read('css/style.css');
  assert.match(css, /\.mobile-navigation\{[^}]*background:var\(--paper\)/);
  assert.match(css, /\.mobile-search-panel\{[^}]*background:var\(--paper\)/);
});
