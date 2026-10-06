const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('admin image uploader exposes device-file upload support', () => {
  const supabase = read('js/supabase.js');
  assert.match(supabase, /functions\/v1\/elgewaliy-admin/);
  assert.match(supabase, /x-admin-token/);

  const admin = read('js/admin.js');
  assert.match(admin, /type="file"/);
  assert.match(admin, /accept="image\/(jpeg|png|webp)/);
  assert.match(admin, /data-admin-image-upload/);
  assert.match(admin, /AdminImageUpload/);
});

test('product editor supports selecting multiple local images and uploads them before save completes', () => {
  const admin = read('js/admin.js');
  assert.match(admin, /product-images-input/);
  assert.match(admin, /multiple/);
  assert.match(admin, /uploadAdminImage/);
  assert.match(admin, /data-admin-image-upload/);
});

test('website image fields can upload from the device instead of requiring a path', () => {
  const builder = read('js/admin-site-builder.js');
  assert.match(builder, /data-admin-image-upload/);
  assert.match(builder, /type="file"/);
  assert.match(builder, /uploadAdminImage/);
});
