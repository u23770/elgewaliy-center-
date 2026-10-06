const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('admin API exposes shell required by website-admin pages', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'admin.js'), 'utf8');
  assert.match(
    source,
    /Store\.Admin\s*=\s*\{[\s\S]*?shell:\s*shell[\s\S]*?render:\s*render/
  );
});
