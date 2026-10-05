const test=require('node:test');
const assert=require('node:assert/strict');
const { normalizeSiteConfig, mergeSiteConfig, normalizeHexColor, orderedVisibleSections }=require('../js/site-config-utils');

test('normalizes theme colors and keeps safe defaults',()=>{
  const out=normalizeSiteConfig({theme:{colors:{primary:'not-a-color',accent:'#123456'}}});
  assert.equal(out.theme.colors.primary,'#252824');
  assert.equal(out.theme.colors.accent,'#123456');
});

test('merges partial website settings without losing existing sections',()=>{
  const out=mergeSiteConfig({content:{about:{title:{en:'New title'}}}});
  assert.equal(out.content.about.titleEn,'New title');
  assert.equal(out.homepage.sections.featured.visible,true);
  assert.equal(out.homepage.sections.featured.order,3);
});

test('orders only visible homepage sections by explicit order',()=>{
  const out=orderedVisibleSections({
    featured:{visible:true,order:3},
    hero:{visible:true,order:1},
    categories:{visible:false,order:2},
    story:{visible:true,order:2}
  });
  assert.deepEqual(out,['hero','story','featured']);
});

test('rejects unsafe colors',()=>{
  assert.equal(normalizeHexColor('rgb(1,2,3)'),'#252824');
  assert.equal(normalizeHexColor('#abcdef'),'#abcdef');
});

test('provides homepage section title defaults when settings are missing',()=>{
  const out=normalizeSiteConfig({homepage:{}});
  assert.equal(out.homepage.sectionTitles.featured.en,'Featured pieces');
  assert.equal(out.homepage.sectionTitles.categories.ar,'تسوق حسب القسم');
});
