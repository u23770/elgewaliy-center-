const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeSiteConfig,themeCssVariables,orderedVisibleSections}=require('../js/site-config-utils');

test('normalizes site settings safely',()=>{
  const out=normalizeSiteConfig({theme:{colors:{primary:'bad'}},homepage:{}});
  assert.equal(out.theme.colors.primary,'#252824');
  assert.equal(out.homepage.sectionTitles.featured.en,'Featured pieces');
  assert.deepEqual(orderedVisibleSections(out.homepage.sections),['hero','promise','categories','featured','story','new','banners','gallery','newsletter']);
});

test('builds safe CSS variables from the configured theme',()=>{
  const out=normalizeSiteConfig({theme:{colors:{primary:'#112233',accent:'#445566'}}});
  const vars=themeCssVariables(out);
  assert.equal(vars['--color-primary'],'#112233');
  assert.equal(vars['--color-accent'],'#445566');
  assert.equal(vars['--color-background'],'#f1efe9');
});
