(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const tx = function (en, ar) { return Store.i18n.locale === 'ar' ? ar : en; };
  const esc = function (value) { return Store.escape(value); };
  const loc = function (value) { return Store.i18n.localized(value); };
  const C = function () { return Store.Components; };
  const cfgUtil = function () { return window.StoreSiteConfig; };
  const modal = function (content, title) {
    const host = document.getElementById('admin-modal-root');
    if (!host) return;
    host.innerHTML = Store.Components.modal(title || '', content, '<button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button>');
  };
  const saveSite = async function (config) {
    const util = cfgUtil();
    const normalized = util ? util.normalizeSiteConfig(config) : config;
    await Store.repo.saveSiteConfig(normalized);
    return normalized;
  };
  const field = function (name, label, value, type, attrs) {
    return '<label class="field"><span>' + esc(label) + '</span><input name="' + esc(name) + '" type="' + (type || 'text') + '" value="' + esc(value == null ? '' : value) + '" ' + (attrs || '') + '></label>';
  };
  const area = function (name, label, value, attrs) {
    return '<label class="field field-wide"><span>' + esc(label) + '</span><textarea name="' + esc(name) + '" rows="4" ' + (attrs || '') + '>' + esc(value == null ? '' : value) + '</textarea></label>';
  };
  const local = function (value, fallback) { return { en: value && value.en != null ? value.en : (fallback && fallback.en || ''), ar: value && value.ar != null ? value.ar : (fallback && fallback.ar || '') }; };

  async function customizer() {
    const config = await Store.repo.getSiteConfig(true);
    const form = '<section class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">WEBSITE</span><h2>' + t('websiteCustomizer') + '</h2></div></div>' +
      '<form id="site-customizer-form" class="admin-form-grid">' +
      field('storeNameEn','Store name · English',config.identity.storeName.en) +
      field('storeNameAr','اسم المتجر · العربية',config.identity.storeName.ar) +
      field('taglineEn','Tagline · English',config.identity.tagline.en) +
      field('taglineAr','الشعار · العربية',config.identity.tagline.ar) +
      field('announcementEn','Announcement · English',config.identity.announcement.en) +
      field('announcementAr','الإعلان · العربية',config.identity.announcement.ar) +
      field('heroImage','Hero image path',config.homepage.hero.image) +
      area('heroTitleEn','Hero title · English',config.homepage.hero.title.en) +
      area('heroTitleAr','عنوان الـHero · العربية',config.homepage.hero.title.ar) +
      area('heroBodyEn','Hero text · English',config.homepage.hero.body.en) +
      area('heroBodyAr','نص الـHero · العربية',config.homepage.hero.body.ar) +
      field('heroCtaEn','Primary button · English',config.homepage.hero.primaryCta.en) +
      field('heroCtaAr','الزر الأساسي · العربية',config.homepage.hero.primaryCta.ar) +
      field('heroSecondaryEn','Secondary link · English',config.homepage.hero.secondaryCta.en) +
      field('heroSecondaryAr','الرابط الثانوي · العربية',config.homepage.hero.secondaryCta.ar) +
      field('storyImage','Story image path',config.homepage.story.image) +
      field('logoPath','Logo path',config.identity.logoPath || '') +
      field('faviconPath','Favicon path',config.identity.faviconPath || '') +
      field('primaryColor','Primary color',config.theme.colors.primary,'color') +
      field('secondaryColor','Secondary color',config.theme.colors.secondary,'color') +
      field('accentColor','Accent color',config.theme.colors.accent,'color') +
      field('backgroundColor','Page background',config.theme.colors.background,'color') +
      field('sectionBackgroundColor','Section background',config.theme.colors.sectionBackground,'color') +
      field('cardBackgroundColor','Card background',config.theme.colors.cardBackground,'color') +
      '<div class="settings-submit field-wide"><button class="button button-primary" type="submit">' + t('saveChanges') + C().icon('check',16) + '</button></div></form></section>';
    return Store.Admin.shell('customizer', t('websiteCustomizer'), form);
  }

  async function contentPage() {
    const config = await Store.repo.getSiteConfig(true);
    const a = config.content.about, c = config.content.contact, f = config.content.footer, seo = config.content.seo;
    const html = '<section class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">CONTENT</span><h2>' + t('websiteContent') + '</h2></div></div>' +
      '<form id="site-content-form" class="admin-form-grid">' +
      field('aboutEyebrowEn','About eyebrow · English',a.eyebrow.en) + field('aboutEyebrowAr','About eyebrow · العربية',a.eyebrow.ar) +
      field('aboutTitleEn','About title · English',a.title.en) + field('aboutTitleAr','About title · العربية',a.title.ar) +
      area('aboutBodyEn','About copy · English',a.body.en) + area('aboutBodyAr','About copy · العربية',a.body.ar) +
      field('aboutImage','About image path',a.image) +
      field('contactAddressEn','Address · English',c.address.en) + field('contactAddressAr','العنوان · العربية',c.address.ar) +
      field('contactPhone','Store phone',c.phone,'tel') + field('contactEmail','Store email',c.email,'email') +
      field('contactWhatsapp','WhatsApp link',c.whatsapp) + field('contactMaps','Maps link',c.mapsUrl) +
      field('hoursEn','Opening hours · English',config.content.hours.en) + field('hoursAr','مواعيد العمل · العربية',config.content.hours.ar) +
      area('footerBodyEn','Footer copy · English',f.body.en) + area('footerBodyAr','Footer copy · العربية',f.body.ar) +
      area('footerNoteEn','Footer note · English',f.note.en) + area('footerNoteAr','Footer note · العربية',f.note.ar) +
      field('seoTitleEn','SEO title · English',seo.title.en) + field('seoTitleAr','عنوان SEO · العربية',seo.title.ar) +
      area('seoDescriptionEn','SEO description · English',seo.description.en) + area('seoDescriptionAr','وصف SEO · العربية',seo.description.ar) +
      '<div class="settings-submit field-wide"><button class="button button-primary" type="submit">' + t('saveChanges') + C().icon('check',16) + '</button></div></form></section>';
    return Store.Admin.shell('content', t('websiteContent'), html);
  }

  async function sectionsPage() {
    const config = await Store.repo.getSiteConfig(true);
    const sections = config.homepage.sections;
    const order = cfgUtil().orderedVisibleSections(sections);
    const all = Object.keys(sections).sort(function(a,b){ return Number(sections[a].order)-Number(sections[b].order); });
    const rows = all.map(function(key, index){
      const s=sections[key];
      return '<div class="admin-panel section-editor-row"><div><strong>' + esc(key.replace(/-/g,' ')) + '</strong><small>' + tx('Homepage section '+(index+1),'قسم في الصفحة الرئيسية '+(index+1)) + '</small></div><label class="check-row"><input type="checkbox" data-section-visible="' + esc(key) + '" ' + (s.visible !== false ? 'checked' : '') + '><span>' + t('active') + '</span></label><input class="inline-stock-input" type="number" min="1" step="1" value="' + esc(s.order) + '" data-section-order="' + esc(key) + '" aria-label="Order"></div>';
    }).join('');
    const html='<div class="admin-toolbar"><span>' + order.length + ' ' + tx('visible sections','أقسام ظاهرة') + '</span><button class="button button-primary" type="button" id="save-sections">' + t('saveChanges') + '</button></div><div class="admin-stack" id="sections-editor">' + rows + '</div>';
    return Store.Admin.shell('sections', t('homepageSections'), html);
  }

  async function mediaPage() {
    const items = await Store.repo.listMedia(true);
    const builtIns = [
      ['Hero editorial','assets/images/hero-editorial.jpg'],['Editorial tee','assets/images/look-tee.jpg'],['Women editorial','assets/images/look-women.jpg'],['Kids collection','assets/images/look-kids.jpg'],['Cargo editorial','assets/images/look-cargo.jpg']
    ];
    const builtHtml=builtIns.map(function(item){return '<button type="button" class="quick-action" data-media-pick="' + esc(item[1]) + '"><i>＋</i><span>' + esc(item[0]) + '</span><small>' + esc(item[1]) + '</small></button>';}).join('');
    const cards=(items||[]).map(function(m){return '<article class="admin-panel"><div class="admin-product-cell"><img src="' + Store.asset(Store.safeImage(m.url)) + '" alt="' + esc(loc(m.alt)) + '"><div><strong>' + esc(m.name) + '</strong><small>' + esc(m.url) + '</small></div></div><div class="admin-row-actions"><button class="button button-outline button-small" type="button" data-media-edit="' + esc(m.id) + '">' + t('edit') + '</button><button class="icon-button danger-icon" type="button" data-media-delete="' + esc(m.id) + '" aria-label="' + t('delete') + '">' + C().icon('trash',15) + '</button></div></article>';}).join('');
    return Store.Admin.shell('media', t('mediaLibrary'), '<div class="admin-dashboard-grid"><section class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">' + tx('ADD MEDIA','إضافة وسائط') + '</span><h2>' + tx('Media item','عنصر وسائط') + '</h2></div></div><form id="media-form" class="admin-form-grid">' + field('name','Name','') + field('url','Image URL or asset path','assets/images/hero-editorial.jpg') + field('altEn','Alt · English','') + field('altAr','Alt · العربية','') + '<div class="settings-submit field-wide"><button class="button button-primary" type="submit">' + t('save') + '</button></div></form></section><section class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">' + tx('BUILT-IN ASSETS','الأصول الموجودة') + '</span><h2>' + tx('Project image library','مكتبة صور المشروع') + '</h2></div></div><div class="admin-stack">' + builtHtml + '</div></section></div><section><div class="admin-section-head"><div><span class="eyebrow">MEDIA</span><h2>' + items.length + '</h2></div></div><div class="admin-dashboard-grid">' + (cards || C().empty('box',tx('No media yet','لا توجد وسائط بعد'))) + '</div></section>');
  }

  function bannerForm(item) {
    item=item||{id:'',title:{en:'',ar:''},text:{en:'',ar:''},image:'assets/images/hero-editorial.jpg',link:'',active:true,order:0,startsAt:'',endsAt:''};
    return '<form id="banner-form" class="admin-editor-form">' +
      '<input type="hidden" name="id" value="' + esc(item.id) + '">' +
      field('titleEn','Title · English',item.title.en)+field('titleAr','العنوان · العربية',item.title.ar)+
      area('textEn','Text · English',item.text.en)+area('textAr','النص · العربية',item.text.ar)+
      field('image','Image path or URL',item.image)+field('link','Link URL',item.link)+field('order','Display order',item.order,'number','min="0" step="1"')+
      '<label class="check-row"><input name="active" type="checkbox" ' + (item.active?'checked':'') + '><span>' + t('active') + '</span></label>' +
      '<div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">' + t('cancel') + '</button><button class="button button-primary" type="submit">' + t('save') + '</button></div></form>';
  }
  async function bannersPage() {
    const items=await Store.repo.listBanners(true);
    const cards=items.map(function(b){return '<article class="promotion-card"><div class="promotion-ticket"><span>' + (b.active?t('active'):t('inactive')) + '</span><small>' + esc(b.order) + '</small></div><div class="promotion-copy"><h2>' + esc(loc(b.title)) + '</h2><code>' + esc(b.image) + '</code><small>' + esc(loc(b.text)) + '</small><div><button type="button" class="button button-outline button-small" data-banner-edit="' + esc(b.id) + '">' + t('edit') + '</button><button type="button" class="icon-button danger-icon" data-banner-delete="' + esc(b.id) + '">' + C().icon('trash',15) + '</button></div></div></article>';}).join('');
    return Store.Admin.shell('banners',t('banners'),'<div class="admin-toolbar"><span>' + items.length + ' · ' + t('banners') + '</span><button type="button" class="button button-primary" id="add-banner">' + t('createPromotion') + '</button></div><div class="promotion-grid">' + (cards||C().empty('info',tx('No banners yet','لا توجد بانرات بعد'))) + '</div>');
  }

  async function galleryPage() {
    const items=await Store.repo.listGallery(true);
    const cards=items.map(function(g){return '<article class="admin-panel"><img class="gallery-admin-photo" src="' + Store.asset(Store.safeImage(g.image)) + '" alt="' + esc(loc(g.title)) + '"><div class="admin-section-head"><div><strong>' + esc(loc(g.title)) + '</strong><small>' + esc(g.image) + '</small></div><div class="admin-row-actions"><button type="button" class="button button-outline button-small" data-gallery-edit="' + esc(g.id) + '">' + t('edit') + '</button><button type="button" class="icon-button danger-icon" data-gallery-delete="' + esc(g.id) + '">' + C().icon('trash',15) + '</button></div></div></article>';}).join('');
    return Store.Admin.shell('gallery',t('gallery'),'<div class="admin-toolbar"><span>' + items.length + ' · ' + t('gallery') + '</span><button type="button" class="button button-primary" id="add-gallery">＋ ' + t('save') + '</button></div><div class="admin-dashboard-grid">' + (cards||C().empty('info',tx('No gallery items yet','لا توجد صور في المعرض بعد'))) + '</div>');
  }
  function galleryForm(item){ item=item||{id:'',title:{en:'',ar:''},image:'assets/images/look-women.jpg',link:'',active:true,order:0}; return '<form id="gallery-form" class="admin-editor-form"><input type="hidden" name="id" value="'+esc(item.id)+'">'+field('titleEn','Title · English',item.title.en)+field('titleAr','العنوان · العربية',item.title.ar)+field('image','Image path or URL',item.image)+field('link','Link URL',item.link)+field('order','Display order',item.order,'number','min="0" step="1"')+'<label class="check-row"><input name="active" type="checkbox" '+(item.active?'checked':'')+'><span>'+t('active')+'</span></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">'+t('cancel')+'</button><button class="button button-primary" type="submit">'+t('save')+'</button></div></form>'; }

  async function socialsPage(){ const items=await Store.repo.listSocials(true); const cards=items.map(function(s){return '<article class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">'+esc(s.platform)+'</span><h2>'+esc(s.label||s.platform)+'</h2><small>'+esc(s.url)+'</small></div><div class="admin-row-actions"><button class="button button-outline button-small" type="button" data-social-edit="'+esc(s.id)+'">'+t('edit')+'</button><button class="icon-button danger-icon" type="button" data-social-delete="'+esc(s.id)+'">'+C().icon('trash',15)+'</button></div></div></article>';}).join(''); return Store.Admin.shell('socials',t('socialLinks'),'<div class="admin-toolbar"><span>'+items.length+' · '+t('socialLinks')+'</span><button class="button button-primary" type="button" id="add-social">＋ '+t('save')+'</button></div><div class="admin-dashboard-grid">'+(cards||C().empty('info',tx('No social links yet','لا توجد روابط تواصل بعد')))+( '</div>' );}
  function socialForm(item){ item=item||{id:'',platform:'instagram',label:'',url:'',active:true,order:0}; return '<form id="social-form" class="admin-editor-form"><input type="hidden" name="id" value="'+esc(item.id)+'">'+field('platform','Platform',item.platform)+field('label','Label',item.label)+field('url','URL',item.url,'url')+field('order','Display order',item.order,'number','min="0" step="1"')+'<label class="check-row"><input name="active" type="checkbox" '+(item.active?'checked':'')+'><span>'+t('active')+'</span></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">'+t('cancel')+'</button><button class="button button-primary" type="submit">'+t('save')+'</button></div></form>'; }

  async function zonesPage(){ const zones=await Store.repo.listZones(true), subzones=await Store.repo.listSubzones(true); const zoneCards=zones.map(function(z){const children=subzones.filter(function(s){return s.zoneId===z.id;}).map(function(s){return '<div class="quick-action"><i>•</i><span>'+esc(loc(s.name))+' · '+C().money(s.fee)+'</span><button class="icon-button danger-icon" type="button" data-subzone-delete="'+esc(s.id)+'">×</button></div>';}).join(''); return '<article class="admin-panel"><div class="admin-section-head"><div><h2>'+esc(loc(z.name))+'</h2><small>'+C().money(z.fee)+' · '+(z.freeThreshold?C().money(z.freeThreshold):tx('No free threshold','لا يوجد حد مجاني'))+'</small></div><div class="admin-row-actions"><button class="button button-outline button-small" type="button" data-zone-edit="'+esc(z.id)+'">'+t('edit')+'</button><button class="icon-button danger-icon" type="button" data-zone-delete="'+esc(z.id)+'">×</button></div></div><div class="admin-stack">'+(children||'<small>'+tx('No subzones','لا توجد مناطق فرعية')+'</small>')+'</div><button class="button button-outline button-small" type="button" data-subzone-add="'+esc(z.id)+'">＋ '+tx('Add subzone','إضافة منطقة فرعية')+'</button></article>';}).join('');
    return Store.Admin.shell('zones',t('deliveryZones'),'<div class="admin-toolbar"><span>'+zones.length+' · '+t('deliveryZones')+'</span><button class="button button-primary" type="button" id="add-zone">＋ '+t('save')+'</button></div><div class="admin-dashboard-grid">'+(zoneCards||C().empty('info',tx('No delivery zones yet','لا توجد مناطق توصيل بعد')) )+'</div>'); }
  function zoneForm(item){item=item||{id:'',name:{en:'',ar:''},fee:60,freeThreshold:0,active:true,order:0}; return '<form id="zone-form" class="admin-editor-form"><input type="hidden" name="id" value="'+esc(item.id)+'">'+field('nameEn','Name · English',item.name.en)+field('nameAr','الاسم · العربية',item.name.ar)+field('fee','Delivery fee (EGP)',item.fee,'number','min="0" step="1"')+field('freeThreshold','Free delivery above (EGP)',item.freeThreshold,'number','min="0" step="1"')+field('order','Display order',item.order,'number','min="0" step="1"')+'<label class="check-row"><input name="active" type="checkbox" '+(item.active?'checked':'')+'><span>'+t('active')+'</span></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">'+t('cancel')+'</button><button class="button button-primary" type="submit">'+t('save')+'</button></div></form>'; }
  function subzoneForm(zoneId,item){item=item||{id:'',zoneId:zoneId,name:{en:'',ar:''},fee:0,active:true,order:0}; return '<form id="subzone-form" class="admin-editor-form"><input type="hidden" name="id" value="'+esc(item.id)+'"><input type="hidden" name="zoneId" value="'+esc(item.zoneId)+'">'+field('nameEn','Name · English',item.name.en)+field('nameAr','الاسم · العربية',item.name.ar)+field('fee','Delivery fee (EGP)',item.fee,'number','min="0" step="1"')+field('order','Display order',item.order,'number','min="0" step="1"')+'<label class="check-row"><input name="active" type="checkbox" '+(item.active?'checked':'')+'><span>'+t('active')+'</span></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">'+t('cancel')+'</button><button class="button button-primary" type="submit">'+t('save')+'</button></div></form>'; }

  async function deliveriesPage(){ const [orders,drivers,zones,subzones]=await Promise.all([Store.repo.listOrders(),Store.repo.listDrivers(),Store.repo.listZones(),Store.repo.listSubzones()]); const cards=(orders||[]).slice(0,40).map(function(o){return '<article class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">'+esc(o.orderNumber)+'</span><h2>'+esc(o.customer.name)+'</h2><small>'+esc([o.address.governorate,o.address.area,o.address.address].filter(Boolean).join(' · '))+'</small></div>'+C().status(o.status)+'</div><form class="delivery-assign-form" data-order-id="'+esc(o.id)+'"><div class="admin-form-grid"><label class="field"><span>'+t('drivers')+'</span><select name="driverId"><option value="">—</option>'+drivers.filter(function(d){return d.active;}).map(function(d){return '<option value="'+esc(d.id)+'" '+(o.driverId===d.id?'selected':'')+'>'+esc(d.name)+'</option>';}).join('')+'</select></label><label class="field"><span>'+t('deliveryZones')+'</span><select name="zoneId"><option value="">—</option>'+zones.filter(function(z){return z.active;}).map(function(z){return '<option value="'+esc(z.id)+'" '+(o.zoneId===z.id?'selected':'')+'>'+esc(loc(z.name))+'</option>';}).join('')+'</select></label><label class="field"><span>'+tx('Subzone','المنطقة الفرعية')+'</span><select name="subzoneId"><option value="">—</option>'+subzones.filter(function(s){return s.active;}).map(function(s){return '<option value="'+esc(s.id)+'" '+(o.subzoneId===s.id?'selected':'')+'>'+esc(loc(s.name))+'</option>';}).join('')+'</select></label>'+field('note',tx('Admin note','ملاحظة داخلية'),o.adminNote)+'</div><button class="button button-primary" type="submit">'+tx('Save delivery assignment','حفظ بيانات التوصيل')+'</button></form></article>';}).join(''); return Store.Admin.shell('deliveries',t('deliveries'),'<div class="admin-toolbar"><span>'+orders.length+' · '+t('adminOrders')+'</span></div><div class="admin-stack">'+(cards||C().empty('bag',t('noAdminOrders')))+'</div>'); }

  async function driversPage(){ const items=await Store.repo.listDrivers(); const cards=items.map(function(d){return '<article class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">'+(d.active?t('active'):t('inactive'))+'</span><h2>'+esc(d.name)+'</h2><small>'+esc(d.phone)+' · '+esc(d.vehicle)+'</small></div><div class="admin-row-actions"><button class="button button-outline button-small" type="button" data-driver-edit="'+esc(d.id)+'">'+t('edit')+'</button><button class="icon-button danger-icon" type="button" data-driver-delete="'+esc(d.id)+'">×</button></div></div><p>'+esc(d.notes)+'</p></article>';}).join(''); return Store.Admin.shell('drivers',t('drivers'),'<div class="admin-toolbar"><span>'+items.length+' · '+t('drivers')+'</span><button class="button button-primary" type="button" id="add-driver">＋ '+t('save')+'</button></div><div class="admin-dashboard-grid">'+(cards||C().empty('user',tx('No drivers yet','لا يوجد مندوبون بعد')))+'</div>');}
  function driverForm(item){item=item||{id:'',name:'',phone:'',vehicle:'',notes:'',active:true}; return '<form id="driver-form" class="admin-editor-form"><input type="hidden" name="id" value="'+esc(item.id)+'">'+field('name','Name',item.name)+field('phone','Phone',item.phone,'tel')+field('vehicle','Vehicle',item.vehicle)+area('notes','Notes',item.notes)+'<label class="check-row"><input name="active" type="checkbox" '+(item.active?'checked':'')+'><span>'+t('active')+'</span></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">'+t('cancel')+'</button><button class="button button-primary" type="submit">'+t('save')+'</button></div></form>'; }

  async function reviewsPage(){ const [items,products]=await Promise.all([Store.repo.listReviews(),Store.repo.listProducts({includeInactive:true})]); const cards=items.map(function(r){return '<article class="admin-panel"><div class="admin-section-head"><div><span class="eyebrow">'+(r.approved?t('active'):t('inactive'))+' · '+r.rating+'/5</span><h2>'+esc(r.customerName)+'</h2><small>'+esc(r.title)+'</small></div><div class="admin-row-actions"><button class="button button-outline button-small" type="button" data-review-edit="'+esc(r.id)+'">'+t('edit')+'</button><button class="icon-button danger-icon" type="button" data-review-delete="'+esc(r.id)+'">×</button></div></div><p>'+esc(r.body)+'</p></article>';}).join(''); return Store.Admin.shell('reviews',t('reviews'),'<div class="admin-toolbar"><span>'+items.length+' · '+t('reviews')+'</span><button class="button button-primary" type="button" id="add-review">＋ '+t('save')+'</button></div><div class="admin-dashboard-grid">'+(cards||C().empty('user',tx('No reviews yet','لا توجد تقييمات بعد')))+'</div>');}
  function reviewForm(item,products){item=item||{id:'',productId:'',customerName:'',rating:5,title:'',body:'',approved:true}; return '<form id="review-form" class="admin-editor-form"><input type="hidden" name="id" value="'+esc(item.id)+'">'+field('customerName','Customer name',item.customerName)+'<label class="field"><span>'+t('adminProducts')+'</span><select name="productId"><option value="">—</option>'+products.map(function(p){return '<option value="'+esc(p.id)+'" '+(item.productId===p.id?'selected':'')+'>'+esc(loc(p.name))+'</option>';}).join('')+'</select></label>'+field('rating','Rating (1–5)',item.rating,'number','min="1" max="5" step="1"')+field('title','Review title',item.title)+area('body','Review',item.body)+'<label class="check-row"><input name="approved" type="checkbox" '+(item.approved?'checked':'')+'><span>'+t('active')+'</span></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="modal-close">'+t('cancel')+'</button><button class="button button-primary" type="submit">'+t('save')+'</button></div></form>'; }

  async function bind(page) {
    if(page==='customizer'){const form=document.getElementById('site-customizer-form');if(!form)return;const config=await Store.repo.getSiteConfig(true);form.addEventListener('submit',async function(e){e.preventDefault();if(!form.reportValidity())return;const v=new FormData(form);config.identity.storeName=local({en:v.get('storeNameEn'),ar:v.get('storeNameAr')});config.identity.tagline=local({en:v.get('taglineEn'),ar:v.get('taglineAr')});config.identity.announcement=local({en:v.get('announcementEn'),ar:v.get('announcementAr')});config.identity.logoPath=String(v.get('logoPath')||'').trim();config.identity.faviconPath=String(v.get('faviconPath')||'').trim();config.homepage.hero.image=v.get('heroImage');config.homepage.hero.title=local({en:v.get('heroTitleEn'),ar:v.get('heroTitleAr')});config.homepage.hero.body=local({en:v.get('heroBodyEn'),ar:v.get('heroBodyAr')});config.homepage.hero.primaryCta=local({en:v.get('heroCtaEn'),ar:v.get('heroCtaAr')});config.homepage.hero.secondaryCta=local({en:v.get('heroSecondaryEn'),ar:v.get('heroSecondaryAr')});config.homepage.story.image=v.get('storyImage');config.theme.colors.primary=v.get('primaryColor');config.theme.colors.secondary=v.get('secondaryColor');config.theme.colors.accent=v.get('accentColor');config.theme.colors.background=v.get('backgroundColor');config.theme.colors.sectionBackground=v.get('sectionBackgroundColor');config.theme.colors.cardBackground=v.get('cardBackgroundColor');await saveSite(config);C().toast(t('settingsSaved'),'success');});return;}
    if(page==='content'){const form=document.getElementById('site-content-form');if(!form)return;const config=await Store.repo.getSiteConfig(true);form.addEventListener('submit',async function(e){e.preventDefault();if(!form.reportValidity())return;const v=new FormData(form);config.content.about.eyebrow=local({en:v.get('aboutEyebrowEn'),ar:v.get('aboutEyebrowAr')});config.content.about.title=local({en:v.get('aboutTitleEn'),ar:v.get('aboutTitleAr')});config.content.about.body=local({en:v.get('aboutBodyEn'),ar:v.get('aboutBodyAr')});config.content.about.image=v.get('aboutImage');config.content.contact.address=local({en:v.get('contactAddressEn'),ar:v.get('contactAddressAr')});config.content.contact.phone=v.get('contactPhone');config.content.contact.email=v.get('contactEmail');config.content.contact.whatsapp=v.get('contactWhatsapp');config.content.contact.mapsUrl=v.get('contactMaps');config.content.hours=local({en:v.get('hoursEn'),ar:v.get('hoursAr')});config.content.footer.body=local({en:v.get('footerBodyEn'),ar:v.get('footerBodyAr')});config.content.footer.note=local({en:v.get('footerNoteEn'),ar:v.get('footerNoteAr')});config.content.seo.title=local({en:v.get('seoTitleEn'),ar:v.get('seoTitleAr')});config.content.seo.description=local({en:v.get('seoDescriptionEn'),ar:v.get('seoDescriptionAr')});await saveSite(config);C().toast(t('settingsSaved'),'success');});return;}
    if(page==='sections'){const config=await Store.repo.getSiteConfig(true);const wrap=document.getElementById('sections-editor');const button=document.getElementById('save-sections');if(!wrap||!button)return;button.addEventListener('click',async function(){wrap.querySelectorAll('[data-section-visible]').forEach(function(n){config.homepage.sections[n.dataset.sectionVisible].visible=n.checked;});wrap.querySelectorAll('[data-section-order]').forEach(function(n){config.homepage.sections[n.dataset.sectionOrder].order=Math.max(1,Number(n.value)||1);});await saveSite(config);C().toast(t('settingsSaved'),'success');});return;}
    if(page==='media'){const form=document.getElementById('media-form');if(form){form.addEventListener('submit',async function(e){e.preventDefault();if(!form.reportValidity())return;const v=new FormData(form);await Store.repo.saveMedia({name:String(v.get('name')||'').trim(),url:String(v.get('url')||'').trim(),alt:{en:String(v.get('altEn')||'').trim(),ar:String(v.get('altAr')||'').trim()},kind:'image',active:true});C().toast(t('settingsSaved'),'success');Store.renderCurrent();});}document.querySelectorAll('[data-media-pick]').forEach(function(b){b.addEventListener('click',function(){const input=document.querySelector('#media-form [name="url"]');if(input){input.value=b.dataset.mediaPick;input.focus();}});});document.querySelectorAll('[data-media-delete]').forEach(function(b){b.addEventListener('click',async function(){if(!window.confirm(t('confirmDelete')))return;await Store.repo.deleteMedia(b.dataset.mediaDelete);Store.renderCurrent();});});return;}
    if(page==='banners'){const items=await Store.repo.listBanners(true);document.getElementById('add-banner')?.addEventListener('click',()=>{modal(bannerForm(null),t('banners'));bindModal('banner');});document.querySelectorAll('[data-banner-edit]').forEach(function(b){b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.bannerEdit);modal(bannerForm(x),t('banners'));bindModal('banner');});});document.querySelectorAll('[data-banner-delete]').forEach(function(b){b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))) {await Store.repo.deleteBanner(b.dataset.bannerDelete);Store.renderCurrent();}});});return;}
    if(page==='gallery'){const items=await Store.repo.listGallery(true);document.getElementById('add-gallery')?.addEventListener('click',()=>{modal(galleryForm(null),t('gallery'));bindModal('gallery');});document.querySelectorAll('[data-gallery-edit]').forEach(b=>b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.galleryEdit);modal(galleryForm(x),t('gallery'));bindModal('gallery');}));document.querySelectorAll('[data-gallery-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))){await Store.repo.deleteGallery(b.dataset.galleryDelete);Store.renderCurrent();}}));return;}
    if(page==='socials'){const items=await Store.repo.listSocials(true);document.getElementById('add-social')?.addEventListener('click',()=>{modal(socialForm(null),t('socialLinks'));bindModal('social');});document.querySelectorAll('[data-social-edit]').forEach(b=>b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.socialEdit);modal(socialForm(x),t('socialLinks'));bindModal('social');}));document.querySelectorAll('[data-social-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))){await Store.repo.deleteSocial(b.dataset.socialDelete);Store.renderCurrent();}}));return;}
    if(page==='zones'){const zones=await Store.repo.listZones(true),sub=await Store.repo.listSubzones(true);document.getElementById('add-zone')?.addEventListener('click',()=>{modal(zoneForm(null),t('deliveryZones'));bindModal('zone');});document.querySelectorAll('[data-zone-edit]').forEach(b=>b.addEventListener('click',()=>{const x=zones.find(i=>i.id===b.dataset.zoneEdit);modal(zoneForm(x),t('deliveryZones'));bindModal('zone');}));document.querySelectorAll('[data-zone-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))){await Store.repo.deleteZone(b.dataset.zoneDelete);Store.renderCurrent();}}));document.querySelectorAll('[data-subzone-add]').forEach(b=>b.addEventListener('click',()=>{modal(subzoneForm(b.dataset.subzoneAdd,null),tx('Subzone','منطقة فرعية'));bindModal('subzone');}));document.querySelectorAll('[data-subzone-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))){await Store.repo.deleteSubzone(b.dataset.subzoneDelete);Store.renderCurrent();}}));return;}
    if(page==='drivers'){const items=await Store.repo.listDrivers();document.getElementById('add-driver')?.addEventListener('click',()=>{modal(driverForm(null),t('drivers'));bindModal('driver');});document.querySelectorAll('[data-driver-edit]').forEach(b=>b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.driverEdit);modal(driverForm(x),t('drivers'));bindModal('driver');}));document.querySelectorAll('[data-driver-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))){await Store.repo.deleteDriver(b.dataset.driverDelete);Store.renderCurrent();}}));return;}
    if(page==='reviews'){const [items,products]=await Promise.all([Store.repo.listReviews(),Store.repo.listProducts({includeInactive:true})]);document.getElementById('add-review')?.addEventListener('click',()=>{modal(reviewForm(null,products),t('reviews'));bindModal('review');});document.querySelectorAll('[data-review-edit]').forEach(b=>b.addEventListener('click',()=>{const x=items.find(i=>i.id===b.dataset.reviewEdit);modal(reviewForm(x,products),t('reviews'));bindModal('review');}));document.querySelectorAll('[data-review-delete]').forEach(b=>b.addEventListener('click',async()=>{if(confirm(t('confirmDelete'))){await Store.repo.deleteReview(b.dataset.reviewDelete);Store.renderCurrent();}}));return;}
    if(page==='deliveries'){document.querySelectorAll('.delivery-assign-form').forEach(function(form){form.addEventListener('submit',async function(e){e.preventDefault();const v=new FormData(form);await Store.repo.assignOrderDelivery(form.dataset.orderId,{driverId:v.get('driverId'),zoneId:v.get('zoneId'),subzoneId:v.get('subzoneId'),note:v.get('note')});C().toast(t('settingsSaved'),'success');});});}
  }

  function bindModal(kind){
    const form=document.getElementById(kind+'-form'); if(!form)return;
    form.addEventListener('submit',async function(e){
      e.preventDefault();if(!form.reportValidity())return;const v=new FormData(form);
      try{
        if(kind==='banner') await Store.repo.saveBanner({id:v.get('id')||'',title:{en:v.get('titleEn'),ar:v.get('titleAr')},text:{en:v.get('textEn'),ar:v.get('textAr')},image:v.get('image'),link:v.get('link'),active:v.has('active'),order:Number(v.get('order')||0)});
        if(kind==='gallery') await Store.repo.saveGallery({id:v.get('id')||'',title:{en:v.get('titleEn'),ar:v.get('titleAr')},image:v.get('image'),link:v.get('link'),active:v.has('active'),order:Number(v.get('order')||0)});
        if(kind==='social') await Store.repo.saveSocial({id:v.get('id')||'',platform:v.get('platform'),label:v.get('label'),url:v.get('url'),active:v.has('active'),order:Number(v.get('order')||0)});
        if(kind==='zone') await Store.repo.saveZone({id:v.get('id')||'',name:{en:v.get('nameEn'),ar:v.get('nameAr')},fee:Number(v.get('fee')||0),freeThreshold:Number(v.get('freeThreshold')||0),active:v.has('active'),order:Number(v.get('order')||0)});
        if(kind==='subzone') await Store.repo.saveSubzone({id:v.get('id')||'',zoneId:v.get('zoneId'),name:{en:v.get('nameEn'),ar:v.get('nameAr')},fee:Number(v.get('fee')||0),active:v.has('active'),order:Number(v.get('order')||0)});
        if(kind==='driver') await Store.repo.saveDriver({id:v.get('id')||'',name:v.get('name'),phone:v.get('phone'),vehicle:v.get('vehicle'),notes:v.get('notes'),active:v.has('active')});
        if(kind==='review') await Store.repo.saveReview({id:v.get('id')||'',productId:v.get('productId'),customerName:v.get('customerName'),rating:Number(v.get('rating')||5),title:v.get('title'),body:v.get('body'),approved:v.has('approved')});
        Store.Admin.closeModal(); Store.renderCurrent();
      }catch(error){C().toast(error.message||t('errorBody'),'error');}
    });
  }

  async function render(page, root) {
    const table = {
      'admin-customizer': customizer,
      'admin-content': contentPage,
      'admin-media': mediaPage,
      'admin-sections': sectionsPage,
      'admin-banners': bannersPage,
      'admin-gallery': galleryPage,
      'admin-socials': socialsPage,
      'admin-zones': zonesPage,
      'admin-deliveries': deliveriesPage,
      'admin-drivers': driversPage,
      'admin-reviews': reviewsPage
    };
    const key=page.replace(/^admin-/,'');
    if(!table[page]) return false;
    root.innerHTML=await table[page]();
    await bind(key);
    return true;
  }
  Store.AdminSite = { render: render };
})(window.Store);
