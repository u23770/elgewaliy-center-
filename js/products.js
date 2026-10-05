(function (Store) {
  const t = function (key, params) { return Store.i18n.t(key, params); };
  const C = function () { return Store.Components; };
  const esc = function (value) { return Store.escape(value); };
  const loc = function (value) { return Store.i18n.localized(value); };
  const Pages = Store.Pages = Store.Pages || {};
  function crumbs(parts) { return '<nav class="breadcrumbs" aria-label="Breadcrumb">' + parts.map(function (part, index) { return (index ? '<span aria-hidden="true">/</span>' : '') + (part.href ? '<a href="' + part.href + '">' + esc(part.label) + '</a>' : '<span>' + esc(part.label) + '</span>'); }).join('') + '</nav>'; }
  function collectionCard(category, index) {
    const image = Store.asset(Store.safeImage(category.image));
    return '<a class="collection-card collection-card-' + (index + 1) + '" href="' + Store.url('shop.html?category=' + encodeURIComponent(category.id)) + '"><img class="collection-photo" src="' + image + '" alt="' + esc(loc(category.name)) + '" loading="lazy" data-fallback="' + Store.asset('assets/images/fallback.svg') + '"><span class="collection-overlay"></span><span class="collection-content"><small>' + String(index + 1).padStart(2, '0') + ' · ' + t('category') + '</small><strong>' + esc(loc(category.name)) + '</strong><span>' + esc(loc(category.description)) + '</span><i>' + C().icon('arrow', 17) + '</i></span></a>';
  }
  function homeSiteDefaults() {
    return {
      identity: {
        storeName: { en: 'Center El Gowaily', ar: 'سنتر الجويلي' },
        tagline: { en: 'Everyday style, thoughtfully chosen', ar: 'أناقة يومية باختيارات مدروسة' },
        announcement: { en: 'Cairo style, delivered with care', ar: 'أناقة من القاهرة، وتوصيل باهتمام' },
        logoPath: ''
      },
      homepage: {
        hero: {
          eyebrow: { en: 'CENTER EL GOWAILY · CAIRO', ar: 'سنتر الجويلي · القاهرة' },
          title: { en: 'Everyday pieces.\\nMade to stay.', ar: 'قطع يومية.\\nتفضل معاك.' },
          body: { en: 'A focused wardrobe of easy layers, useful fits and pieces made for repeat wear.', ar: 'تشكيلة مركزة من القطع العملية والقصّات المريحة للاستخدام اليومي.' },
          image: 'assets/images/hero-editorial.jpg',
          primaryCta: { en: 'Shop the collection', ar: 'تسوق المجموعة' },
          secondaryCta: { en: 'Our story', ar: 'حكايتنا' }
        },
        promise: [
          { icon: 'truck', title: { en: 'Fast delivery', ar: 'توصيل سريع' } },
          { icon: 'shield', title: { en: 'Trusted quality', ar: 'جودة تثق بها' } },
          { icon: 'heart', title: { en: 'Easy exchanges', ar: 'استبدال سهل' } }
        ],
        story: {
          eyebrow: { en: 'OUR STORY', ar: 'حكايتنا' },
          title: { en: 'Clothes that work with your day.', ar: 'ملابس تمشي مع يومك.' },
          body: { en: 'Center El Gowaily brings together practical pieces, considered details and an easy shopping experience.', ar: 'سنتر الجويلي يجمع بين القطع العملية والتفاصيل المدروسة وتجربة شراء سهلة.' },
          image: 'assets/images/look-women.jpg',
          cta: { en: 'Our story', ar: 'حكايتنا' }
        },
        sectionTitles: {
          categories: { en: 'Shop by category', ar: 'تسوق حسب القسم' },
          featured: { en: 'Featured pieces', ar: 'قطع مختارة' },
          new: { en: 'New arrivals', ar: 'وصل حديثًا' },
          banners: { en: 'Store updates', ar: 'أحدث عروض المتجر' },
          gallery: { en: 'From Center El Gowaily', ar: 'من سنتر الجويلي' }
        },
        sections: {
          hero: { visible: true, order: 1 }, promise: { visible: true, order: 2 }, categories: { visible: true, order: 3 },
          featured: { visible: true, order: 4 }, story: { visible: true, order: 5 }, new: { visible: true, order: 6 },
          banners: { visible: true, order: 7 }, gallery: { visible: true, order: 8 }, newsletter: { visible: true, order: 9 }
        }
      }
    };
  }
  function homeSite(raw) {
    const base = homeSiteDefaults();
    if (window.StoreSiteConfig) return window.StoreSiteConfig.normalizeSiteConfig(raw || {});
    function merge(target, source) {
      Object.keys(source || {}).forEach(function(key) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
          merge(target[key], source[key]);
        } else if (source[key] !== undefined) target[key] = source[key];
      });
      return target;
    }
    return merge(base, raw || {});
  }

  Pages.home = async function (root) {
    const results = await Promise.all([
      Store.repo.listProducts(),
      Store.repo.listCategories(),
      Store.repo.getSiteConfig ? Store.repo.getSiteConfig() : Promise.resolve({})
    ]);
    const products = results[0] || [];
    const categories = results[1] || [];
    const site = homeSite(results[2] || {});
    const banners = Store.repo.listBanners ? await Store.repo.listBanners(false) : [];
    const gallery = Store.repo.listGallery ? await Store.repo.listGallery(false) : [];
    const featured = products.filter(function (product) { return product.featured; }).slice(0, 4);
    const newItems = products.slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }).slice(0, 4);
    const sections = site.homepage.sections || {};
    const order = window.StoreSiteConfig
      ? window.StoreSiteConfig.orderedVisibleSections(sections)
      : Object.keys(sections).filter(function (key) { return sections[key] && sections[key].visible !== false; }).sort(function (a,b) { return Number(sections[a].order || 0) - Number(sections[b].order || 0); });
    const sectionTitles = site.homepage.sectionTitles || {};
    const title = function (key, fallback) { return sectionTitles[key] ? loc(sectionTitles[key]) : fallback; };
    const parts = {};
    parts.hero = '<section class="home-hero"><div class="hero-image" role="img" aria-label="' + esc(loc(site.homepage.hero.title)) + '" style="background-image:url(\'' + Store.asset(Store.safeImage(site.homepage.hero.image)) + '\')"></div><div class="hero-grain"></div><div class="hero-copy page-wrap"><span class="eyebrow hero-eyebrow"><i></i>' + esc(loc(site.homepage.hero.eyebrow)) + '</span><h1>' + esc(loc(site.homepage.hero.title)).replace(/\\n/g, '<br>') + '</h1><p>' + esc(loc(site.homepage.hero.body)) + '</p><div class="hero-actions"><a class="button button-primary" href="' + Store.url('shop.html') + '">' + esc(loc(site.homepage.hero.primaryCta)) + C().icon('arrow', 16) + '</a><a class="text-link hero-secondary" href="' + Store.url('about.html') + '">' + esc(loc(site.homepage.hero.secondaryCta)) + '</a></div><div class="hero-footnote"><span>01</span><i></i><span>09</span><span>COLLECTION</span></div></div><div class="hero-side-note">' + esc(loc(site.identity.storeName)) + '</div></section>';
    parts.promise = '<section class="promise-strip page-wrap">' + site.homepage.promise.map(function (item) { return '<div><span class="promise-icon">' + C().icon(item.icon || 'shield', 20) + '</span><span>' + esc(loc(item.title)) + '</span></div>'; }).join('') + '</section>';
    parts.categories = '<section class="home-section categories-section page-wrap"><div class="section-heading"><div><span class="eyebrow">' + t('categoryEyebrow') + '</span><h2>' + esc(title('categories', t('categoryTitle'))) + '</h2></div><a class="section-link" href="' + Store.url('categories.html') + '">' + t('viewAll') + C().icon('arrow', 17) + '</a></div>' + (categories.length ? '<div class="collection-grid">' + categories.slice(0, 4).map(collectionCard).join('') + '</div>' : C().empty('box', t('emptyTitle'), t('categoriesEmpty'))) + '</section>';
    parts.featured = '<section class="home-section featured-section"><div class="page-wrap"><div class="section-heading"><div><span class="eyebrow">' + t('featuredEyebrow') + '</span><h2>' + esc(title('featured', t('featuredTitle'))) + '</h2></div><a class="section-link" href="' + Store.url('shop.html?featured=1') + '">' + t('viewAll') + C().icon('arrow', 17) + '</a></div>' + (featured.length ? '<div class="product-grid">' + featured.map(C().productCard).join('') + '</div>' : C().empty('box', t('noProducts'), t('noProductsBody'))) + '</div></section>';
    parts.story = '<section class="story-panel page-wrap"><div class="story-photo"><img loading="lazy" src="' + Store.asset(Store.safeImage(site.homepage.story.image)) + '" alt="' + esc(loc(site.homepage.story.title)) + '"></div><div class="story-copy"><span class="eyebrow">' + esc(loc(site.homepage.story.eyebrow)) + '</span><h2>' + esc(loc(site.homepage.story.title)) + '</h2><p>' + esc(loc(site.homepage.story.body)) + '</p><a class="button button-dark" href="' + Store.url('about.html') + '">' + esc(loc(site.homepage.story.cta)) + C().icon('arrow', 16) + '</a><span class="story-serial">CENTER EL GOWAILY</span></div></section>';
    parts.new = '<section class="home-section new-section page-wrap"><div class="section-heading"><div><span class="eyebrow">' + t('newEyebrow') + '</span><h2>' + esc(title('new', t('newTitle'))) + '</h2></div><a class="section-link" href="' + Store.url('shop.html?sort=newest') + '">' + t('viewAll') + C().icon('arrow', 17) + '</a></div>' + (newItems.length ? '<div class="product-grid">' + newItems.map(C().productCard).join('') + '</div>' : C().empty('box', t('noProducts'), t('noProductsBody'))) + '</section>';
    parts.banners = banners && banners.length ? '<section class="home-section page-wrap"><div class="section-heading"><div><span class="eyebrow">' + t('banners') + '</span><h2>' + esc(title('banners', t('banners'))) + '</h2></div></div><div class="home-banner-grid">' + banners.slice(0, 4).map(function (b) { return '<a class="home-banner-card" href="' + Store.safeExternalUrl(b.link || Store.url('shop.html')) + '"><img src="' + Store.asset(Store.safeImage(b.image)) + '" alt="' + esc(loc(b.title)) + '" loading="lazy"><div><strong>' + esc(loc(b.title)) + '</strong><span>' + esc(loc(b.text)) + '</span></div></a>'; }).join('') + '</div></section>' : '';
    parts.gallery = gallery && gallery.length ? '<section class="home-section page-wrap"><div class="section-heading"><div><span class="eyebrow">' + t('gallery') + '</span><h2>' + esc(title('gallery', t('gallery'))) + '</h2></div></div><div class="home-gallery-grid">' + gallery.slice(0, 6).map(function (g) { return '<a href="' + Store.safeExternalUrl(g.link || Store.url('shop.html')) + '"><img src="' + Store.asset(Store.safeImage(g.image)) + '" alt="' + esc(loc(g.title)) + '" loading="lazy"></a>'; }).join('') + '</div></section>' : '';
    parts.newsletter = '<section class="newsletter-band"><div class="page-wrap newsletter-band-inner"><div><span class="eyebrow">' + t('newsletterTitle') + '</span><h2>' + t('newsletterText') + '</h2></div><form id="newsletter-hero-form" class="newsletter-form"><label class="visually-hidden" for="newsletter-hero-email">' + t('emailAddress') + '</label><input id="newsletter-hero-email" name="email" type="email" required placeholder="' + t('emailAddress') + '"><button type="submit">' + t('subscribe') + C().icon('arrow', 17) + '</button></form></div></section>';
    root.innerHTML = order.map(function (name) { return sections[name] && sections[name].visible !== false ? (parts[name] || '') : ''; }).join('');
  };
  Pages.categories = async function (root) {
    const categories = await Store.repo.listCategories();
    root.innerHTML = '<div class="page-wrap page-space">' + crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('categories') }]) + '<header class="page-heading"><span class="eyebrow">' + t('categoryEyebrow') + '</span><h1>' + t('categoriesTitle') + '</h1><p>' + t('categoryDescription') + '</p></header>' + (categories.length ? '<div class="category-page-grid">' + categories.map(collectionCard).join('') + '</div>' : C().empty('box', t('emptyTitle'), t('categoriesEmpty'))) + '</div>';
  };
  function categoryOptions(categories, selected) { return '<option value="">' + t('allProducts') + '</option>' + categories.map(function (item) { return '<option value="' + esc(item.id) + '" ' + (selected === item.id || selected === item.slug ? 'selected' : '') + '>' + esc(loc(item.name)) + '</option>'; }).join(''); }
  function optionList(items, value, labelFn) { return '<option value="">—</option>' + items.map(function (item) { return '<option value="' + esc(value(item)) + '">' + esc(labelFn(item)) + '</option>'; }).join(''); }
  async function renderListing(root, searchOnly) {
    const query = Store.query('q');
    const incomingCategory = Store.query('category');
    const state = Store.view.shop || (Store.view.shop = {});
    if (state.initialized !== true) {
      state.q = query; state.category = incomingCategory; state.sort = Store.query('sort') === 'newest' ? 'newest' : (Store.query('featured') ? 'featured' : 'featured'); state.initialized = true;
    }
    const [categories, sizes, colors, products] = await Promise.all([
      Store.repo.listCategories(), Store.repo.listSizes(), Store.repo.listColors(),
      Store.repo.listProducts({ q: state.q || '', category: state.category || '', size: state.size || '', color: state.color || '', min: state.min, max: state.max, inStock: state.inStock, sale: state.sale, sort: state.sort || 'featured', featured: Store.query('featured') === '1' })
    ]);
    const chosenCategory = categories.find(function (category) { return category.id === state.category || category.slug === state.category; });
    const title = searchOnly ? (query ? t('searchResults') : t('shop')) : chosenCategory ? loc(chosenCategory.name) : t('productsTitle');
    const resultLabel = searchOnly && query ? '<p class="listing-query">' + t('resultsFor') + ' <strong>“' + esc(query) + '”</strong></p>' : '';
    root.innerHTML = '<div class="page-wrap page-space listing-page">' + crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: searchOnly ? t('search') : t('shop') }, ...(chosenCategory ? [{ label: loc(chosenCategory.name) }] : [])]) + '<header class="page-heading listing-heading"><div><span class="eyebrow">' + (chosenCategory ? esc(loc(chosenCategory.name)) : searchOnly ? t('search') : t('allProducts')) + '</span><h1>' + title + '</h1>' + (chosenCategory ? '<p>' + esc(loc(chosenCategory.description)) + '</p>' : resultLabel) + '</div><span class="listing-count">' + products.length + ' ' + t('products') + '</span></header>' +
      '<div class="listing-toolbar"><button class="filter-toggle" type="button" data-action="filter-toggle">' + C().icon('menu', 17) + t('filters') + '</button><label class="sort-field"><span>' + t('sortBy') + '</span><select id="sort-products"><option value="featured" ' + (state.sort === 'featured' ? 'selected' : '') + '>' + t('sortFeatured') + '</option><option value="newest" ' + (state.sort === 'newest' ? 'selected' : '') + '>' + t('sortNewest') + '</option><option value="price-low" ' + (state.sort === 'price-low' ? 'selected' : '') + '>' + t('sortPriceLow') + '</option><option value="price-high" ' + (state.sort === 'price-high' ? 'selected' : '') + '>' + t('sortPriceHigh') + '</option></select></label></div>' +
      '<div class="shop-layout"><aside class="filter-panel" id="shop-filter-panel"><div class="filter-panel-head"><h2>' + t('filters') + '</h2><button type="button" class="text-button" data-action="clear-filters">' + t('clearFilters') + '</button><button type="button" class="icon-button filter-close" data-action="filter-toggle" aria-label="' + t('close') + '">' + C().icon('close', 18) + '</button></div><form id="shop-filter-form"><label class="field"><span>' + t('category') + '</span><select name="category">' + categoryOptions(categories, state.category) + '</select></label><label class="field"><span>' + t('size') + '</span><select name="size">' + optionList(sizes, function (item) { return item.label; }, function (item) { return item.label; }) + '</select></label><label class="field"><span>' + t('colour') + '</span><select name="color">' + optionList(colors, function (item) { return item.key; }, function (item) { return loc(item.name); }) + '</select></label><div class="filter-price-row"><label class="field"><span>' + t('priceFrom') + '</span><input type="number" name="min" min="0" step="50" value="' + esc(state.min || '') + '"></label><label class="field"><span>' + t('priceTo') + '</span><input type="number" name="max" min="0" step="50" value="' + esc(state.max || '') + '"></label></div><label class="check-row"><input type="checkbox" name="inStock" ' + (state.inStock ? 'checked' : '') + '><span>' + t('inStockOnly') + '</span></label><label class="check-row"><input type="checkbox" name="sale" ' + (state.sale ? 'checked' : '') + '><span>' + t('onSaleOnly') + '</span></label><button type="submit" class="button button-dark filter-submit">' + t('applyFilters') + '</button></form></aside><div class="shop-results"><div class="shop-results-meta"><span>' + t('showing') + ' <strong>' + products.length + '</strong> ' + t('products') + '</span>' + (state.q ? '<button type="button" class="text-button" data-action="clear-query">' + t('clear') + ' ×</button>' : '') + '</div>' + (products.length ? '<div class="product-grid">' + products.map(C().productCard).join('') + '</div>' : C().empty('search', t('noProducts'), t('noProductsBody'), '<button class="button button-outline" type="button" data-action="clear-filters">' + t('clearFilters') + '</button>')) + '</div></div></div>';
    const form = document.getElementById('shop-filter-form');
    if (form) { const data = new FormData(form); if (state.size) form.elements.size.value = state.size; if (state.color) form.elements.color.value = state.color; form.addEventListener('submit', function (event) { event.preventDefault(); const values = new FormData(form); Store.view.shop = { initialized: true, q: state.q || '', category: values.get('category') || '', size: values.get('size') || '', color: values.get('color') || '', min: values.get('min') || '', max: values.get('max') || '', inStock: values.has('inStock'), sale: values.has('sale'), sort: (document.getElementById('sort-products') || {}).value || state.sort }; Store.renderCurrent(); }); }
    const sort = document.getElementById('sort-products'); if (sort) sort.addEventListener('change', function () { Store.view.shop.sort = sort.value; Store.view.shop.initialized = true; Store.renderCurrent(); });
  }
  Pages.shop = function (root) { return renderListing(root, false); };
  Pages.search = function (root) { if (!Store.view.shop || !Store.view.shop.initialized) Store.view.shop = { initialized: true, q: Store.query('q'), category: '', sort: 'featured' }; return renderListing(root, true); };
  Pages.product = async function (root) {
    const key = Store.query('id') || Store.query('slug');
    const product = await Store.repo.getProduct(key);
    if (!product) { root.innerHTML = '<div class="page-wrap page-space">' + C().error(t('pageNotFoundBody')) + '<a class="button button-primary" href="' + Store.url('shop.html') + '">' + t('allProducts') + '</a></div>'; return; }
    const selection = Store.view.productSelections || (Store.view.productSelections = {});
    const current = selection[product.id] || (selection[product.id] = { size: '', color: '', quantity: 1, image: 0 });
    const variants = (product.variants || []).filter(function (variant) { return variant.active !== false; });
    const hasSizes = variants.some(function (variant) { return Boolean(variant.size); });
    const hasColors = variants.some(function (variant) { return Boolean(variant.color); });
    let selected = variants.find(function (variant) { return (!hasSizes || variant.size === current.size) && (!hasColors || variant.color && variant.color.key === current.color); }) || null;
    if (!variants.length) selected = null;
    const sizeValues = Array.from(new Set(variants.filter(function (variant) { return variant.size; }).map(function (variant) { return variant.size; })));
    const colorValues = [];
    variants.forEach(function (variant) { if (variant.color && !colorValues.some(function (color) { return color.key === variant.color.key; })) colorValues.push(variant.color); });
    function sizeButtons() { return hasSizes ? '<fieldset class="variant-group"><legend>' + t('size') + '<span>' + (current.size ? esc(current.size) : t('selectSize')) + '</span></legend><div class="size-options">' + sizeValues.map(function (size) { const matching = variants.filter(function (variant) { return variant.size === size && (!current.color || !hasColors || variant.color && variant.color.key === current.color); }); const sold = matching.length && !matching.some(function (variant) { return Number(variant.stock) > 0; }); return '<button type="button" class="size-option ' + (current.size === size ? 'selected' : '') + '" data-action="select-size" data-size="' + esc(size) + '" ' + (sold ? 'disabled aria-disabled="true"' : 'aria-pressed="' + (current.size === size) + '"') + '>' + esc(size) + '</button>'; }).join('') + '</div></fieldset>' : ''; }
    function colorButtons() { return hasColors ? '<fieldset class="variant-group"><legend>' + t('colour') + '<span>' + esc(current.color ? loc((colorValues.find(function (color) { return color.key === current.color; }) || {}).name) : t('selectColour')) + '</span></legend><div class="color-options">' + colorValues.map(function (color) { const matching = variants.filter(function (variant) { return variant.color && variant.color.key === color.key && (!current.size || !hasSizes || variant.size === current.size); }); const sold = matching.length && !matching.some(function (variant) { return Number(variant.stock) > 0; }); return '<button type="button" class="color-option ' + (current.color === color.key ? 'selected' : '') + '" style="--swatch:' + esc(Store.safeColor(color.hex)) + '" data-action="select-color" data-color="' + esc(color.key) + '" ' + (sold ? 'disabled aria-disabled="true"' : 'aria-pressed="' + (current.color === color.key) + '"') + '><i></i><span>' + esc(loc(color.name)) + '</span></button>'; }).join('') + '</div></fieldset>' : ''; }
    const imageList = product.images && product.images.length ? product.images : ['assets/images/fallback.svg'];
    const activeImage = Store.asset(Store.safeImage(imageList[Math.min(current.image || 0, imageList.length - 1)]));
    const related = await Store.repo.listProducts({ category: product.categoryId });
    const relatedProducts = related.filter(function (item) { return item.id !== product.id; }).slice(0, 4);
    const category = product.category ? loc(product.category) : '';
    const isAvailable = variants.length ? selected && Number(selected.stock) > 0 : Number(product.stock) > 0;
    const quantity = Math.max(1, Number(current.quantity || 1));
    root.innerHTML = '<div class="page-wrap page-space product-page">' + crumbs([{ label: t('home'), href: Store.url('index.html') }, { label: t('shop'), href: Store.url('shop.html') }, { label: category, href: Store.url('shop.html?category=' + encodeURIComponent(product.categoryId)) }, { label: loc(product.name) }]) +
      '<div class="product-detail-layout"><div class="product-gallery"><div class="product-main-image"><img id="product-main-photo" src="' + activeImage + '" alt="' + esc(loc(product.name)) + '" data-fallback="' + Store.asset('assets/images/fallback.svg') + '">' + (product.salePrice ? '<span class="product-badge sale-badge">' + t('sale') + '</span>' : '') + '<span class="gallery-count">' + String((current.image || 0) + 1).padStart(2, '0') + ' / ' + String(imageList.length).padStart(2, '0') + '</span></div>' + (imageList.length > 1 ? '<div class="gallery-thumbnails">' + imageList.map(function (url, index) { return '<button type="button" class="gallery-thumb ' + (index === current.image ? 'selected' : '') + '" data-action="gallery-image" data-index="' + index + '" aria-label="Image ' + (index + 1) + '"><img src="' + Store.asset(Store.safeImage(url)) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') + '</div>' +
      '<section class="product-detail-copy"><span class="eyebrow product-category-eyebrow">' + esc(category) + '</span><h1>' + esc(loc(product.name)) + '</h1><div class="product-detail-price">' + C().price(product, selected) + '</div><p class="product-summary">' + esc(loc(product.description)) + '</p><div class="product-sku">' + t('sku') + ' <span>' + esc(selected && selected.sku || product.sku) + '</span></div>' + colorButtons() + sizeButtons() + '<div class="product-availability ' + (isAvailable ? 'available' : 'unavailable') + '"><i></i><span>' + (isAvailable ? (selected && selected.stock <= 4 ? t('lowStock', { count: selected.stock }) : t('stockAvailable')) : t('outOfStock')) + '</span></div><div class="product-purchase-row"><div class="quantity-control"><button type="button" data-action="product-qty" data-delta="-1" aria-label="' + t('remove') + '">−</button><output id="product-quantity">' + quantity + '</output><button type="button" data-action="product-qty" data-delta="1" aria-label="' + t('quantity') + '">+</button></div><button class="button button-primary product-add-button" type="button" data-action="add-product-detail" data-product-id="' + esc(product.id) + '" data-variant-id="' + esc(selected && selected.id || '') + '" data-quantity="' + quantity + '" ' + (!isAvailable || variants.length && !selected ? 'disabled' : '') + '>' + C().icon('bag', 17) + t('addToBag') + '</button></div>' + (variants.length && !selected ? '<p class="form-hint error-text">' + t('selectVariantFirst') + '</p>' : '') + '<div class="product-support"><details><summary>' + t('sizeGuide') + '<span>+</span></summary><p>' + t('sizeGuideBody') + '</p></details><details><summary>' + t('deliveryReturns') + '<span>+</span></summary><p>' + t('deliveryReturnsBody') + '</p></details></div></section></div>' +
      '<section class="related-section"><div class="section-heading"><div><span class="eyebrow">' + t('completeTheLook') + '</span><h2>' + t('completeTheLook') + '</h2></div><a class="section-link" href="' + Store.url('shop.html') + '">' + t('viewAll') + C().icon('arrow', 16) + '</a></div>' + (relatedProducts.length ? '<div class="product-grid">' + relatedProducts.map(C().productCard).join('') + '</div>' : '') + '</section></div>';
  };
  Store.Products = {
    crumbs: crumbs,
    variantFor: function (product, variantId) { return (product.variants || []).find(function (variant) { return variant.id === variantId && variant.active !== false; }) || null; },
    stock: function (product, variant) { return Store.repo.helpers.availableStock(product, variant); },
    price: function (product, variant) { return Store.repo.helpers.effectivePrice(product, variant); },
    variantText: function (variant) { if (!variant) return ''; return [variant.size, variant.color && loc(variant.color.name)].filter(Boolean).join(' · '); }
  };
})(window.Store);
