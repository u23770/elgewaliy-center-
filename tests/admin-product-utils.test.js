const test=require('node:test');
const assert=require('node:assert/strict');
const { normalizeVariantSavePayload }=require('../js/admin-product-utils');

test('preserves existing variant ids when saving an edited product',()=>{
  const result=normalizeVariantSavePayload([
    {id:'variant-1',sku:'SKU-1',size:'M',stock:8,active:true},
    {id:'',sku:'SKU-2',size:'L',stock:5,active:true}
  ]);
  assert.equal(result[0].id,'variant-1');
  assert.equal(result[1].id,null);
});

test('normalizes missing variant ids to null instead of inventing a new id',()=>{
  const result=normalizeVariantSavePayload([{sku:'SKU-1',size:'M',stock:3}]);
  assert.equal(result[0].id,null);
});
