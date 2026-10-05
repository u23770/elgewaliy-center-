const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('info pages do not depend on removed demo runtime data', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'orders.js'), 'utf8');
  const components = fs.readFileSync(path.join(__dirname, '..', 'js', 'components.js'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-config-utils.js'), 'utf8');
  assert.equal(source.includes('Store.demoData'), false);
  assert.equal(source.includes('demoData.settings'), false);
  assert.equal(components.includes('CAIRO · EGYPT'), false);
  assert.equal(components.includes('Store.demoData'), false);
  assert.equal(config.includes('Cairo style'), false);
  assert.equal(config.includes('Cairo, Egypt'), false);
});
