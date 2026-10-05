const test=require('node:test');
const assert=require('node:assert/strict');
const { normalizeSubscriberEmail }=require('../js/newsletter-utils');

test('normalizes valid newsletter emails',()=>{
  assert.equal(normalizeSubscriberEmail('  Customer@Example.COM '),'customer@example.com');
});

test('rejects malformed and oversized newsletter emails',()=>{
  assert.throws(()=>normalizeSubscriberEmail('not-an-email'),/valid/i);
  assert.throws(()=>normalizeSubscriberEmail('a@b.'+'x'.repeat(260)),/valid/i);
});
