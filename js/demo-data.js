(function (Store) {
  const colors = [
    { id: 'color-navy', key: 'navy', name: { ar: 'كحلي', en: 'Navy' }, hex: '#29374d', active: true },
    { id: 'color-ivory', key: 'ivory', name: { ar: 'عاجي', en: 'Ivory' }, hex: '#e7dfd0', active: true },
    { id: 'color-olive', key: 'olive', name: { ar: 'زيتي', en: 'Olive' }, hex: '#777e60', active: true },
    { id: 'color-black', key: 'black', name: { ar: 'أسود', en: 'Black' }, hex: '#292a28', active: true },
    { id: 'color-sand', key: 'sand', name: { ar: 'رملي', en: 'Sand' }, hex: '#c2ad8e', active: true },
    { id: 'color-rust', key: 'rust', name: { ar: 'طوبي', en: 'Rust' }, hex: '#b96749', active: true },
    { id: 'color-sky', key: 'sky', name: { ar: 'أزرق سماوي', en: 'Sky blue' }, hex: '#a9bfca', active: true }
  ];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '30', '32', '34', '36', '6–8', '8–10', '10–12'].map(function (label, index) {
    return { id: 'size-' + index, label: label, order: index, active: true };
  });
  function variant(productKey, size, colorKey, colorName, colorAr, hex, stock, suffix, price) {
    return { id: productKey + '-' + (size || 'one') + '-' + (colorKey || 'plain'), sku: suffix, size: size || '', color: colorKey ? { key: colorKey, name: { en: colorName, ar: colorAr }, hex: hex } : null, stock: stock, price: price || null, active: true };
  }
  function variantsFor(productKey, sizeList, colorList, stocks, skuPrefix) {
    const items = [];
    if (sizeList.length && colorList.length) {
      sizeList.forEach(function (size, si) { colorList.forEach(function (color, ci) {
        items.push(variant(productKey, size, color.key, color.name.en, color.name.ar, color.hex, stocks[si * colorList.length + ci] || 0, skuPrefix + '-' + size.replace(/[^A-Z0-9]/gi, '') + '-' + color.key.toUpperCase()));
      }); });
    } else if (sizeList.length) {
      sizeList.forEach(function (size, si) { items.push(variant(productKey, size, null, '', '', '', stocks[si] || 0, skuPrefix + '-' + size.replace(/[^A-Z0-9]/gi, ''))); });
    } else if (colorList.length) {
      colorList.forEach(function (color, ci) { items.push(variant(productKey, '', color.key, color.name.en, color.name.ar, color.hex, stocks[ci] || 0, skuPrefix + '-' + color.key.toUpperCase())); });
    }
    return items;
  }
  const categories = [
    { id: 'cat-men', slug: 'men', name: { ar: 'رجالي', en: 'Men' }, description: { ar: 'أساسيات يومية وقصّات عملية بتفاصيل مدروسة.', en: 'Everyday essentials and useful fits with considered details.' }, image: 'assets/images/look-tee.jpg', active: true, order: 1 },
    { id: 'cat-women', slug: 'women', name: { ar: 'حريمي', en: 'Women' }, description: { ar: 'قطع سهلة وأنيقة تتحرك مع يومك.', en: 'Easy, considered pieces that move with your day.' }, image: 'assets/images/look-women.jpg', active: true, order: 2 },
    { id: 'cat-kids', slug: 'kids', name: { ar: 'أطفال', en: 'Kids' }, description: { ar: 'راحة ومرونة لمغامرات كل يوم.', en: 'Comfort and room to move for every day.' }, image: 'assets/images/look-kids.jpg', active: true, order: 3 },
    { id: 'cat-tops', slug: 'tops', name: { ar: 'تيشيرتات وقمصان', en: 'Tops & shirts' }, description: { ar: 'طبقات أساسية بخامات مريحة.', en: 'Comfortable layers made for repeat wear.' }, image: 'assets/images/look-tee.jpg', active: true, order: 4 },
    { id: 'cat-bottoms', slug: 'bottoms', name: { ar: 'بناطيل', en: 'Trousers' }, description: { ar: 'قصّات عملية براحة تدوم.', en: 'Useful cuts with all-day comfort.' }, image: 'assets/images/look-cargo.jpg', active: true, order: 5 },
    { id: 'cat-accessories', slug: 'accessories', name: { ar: 'إكسسوارات', en: 'Accessories' }, description: { ar: 'تفاصيل تكمل إطلالتك اليومية.', en: 'The finishing touches for everyday looks.' }, image: 'assets/images/look-women.jpg', active: true, order: 6 }
  ];
  const products = [
    {
      id: 'prod-tee', slug: 'everyday-cotton-tee', name: { ar: 'تيشيرت القطن اليومي', en: 'Everyday cotton tee' },
      description: { ar: 'قطن ناعم بوزن مريح وقصّة سهلة. قطعة أساسية متعددة التنسيق من الصباح إلى المساء.', en: 'Soft mid-weight cotton with an easy relaxed fit. A dependable layer from morning to evening.' },
      categoryId: 'cat-tops', images: ['assets/images/look-tee.jpg'], price: 790, salePrice: 645, sku: 'EG-M-TEE-01', active: true, featured: true, stock: 0,
      variants: variantsFor('tee', ['S', 'M', 'L', 'XL'], [colors[0], colors[1]], [8, 5, 12, 8, 9, 7, 4, 3], 'TEE')
    },
    {
      id: 'prod-cargo', slug: 'city-cargo-trouser', name: { ar: 'بنطال سيتي كارغو', en: 'City cargo trouser' },
      description: { ar: 'قصّة مستقيمة وجيوب عملية بخامة ناعمة ومتينة تناسب الحركة طوال اليوم.', en: 'A straight leg and useful pockets in a soft, durable fabric made to move through the day.' },
      categoryId: 'cat-bottoms', images: ['assets/images/look-cargo.jpg'], price: 1390, salePrice: null, sku: 'EG-M-TR-02', active: true, featured: true, stock: 0,
      variants: variantsFor('cargo', ['30', '32', '34', '36'], [colors[2], colors[3]], [4, 2, 8, 7, 6, 5, 3, 2], 'CRG')
    },
    {
      id: 'prod-overshirt', slug: 'olive-linen-overshirt', name: { ar: 'قميص لينن أوفرشيرت', en: 'Linen blend overshirt' },
      description: { ar: 'طبقة خفيفة من مزيج الكتان بملمس طبيعي وأزرار هادئة. ارتديه مفتوحًا أو كقميص مستقل.', en: 'A light linen blend with a natural texture and quiet buttons. Wear it open as a layer or on its own.' },
      categoryId: 'cat-women', images: ['assets/images/look-women.jpg'], price: 1680, salePrice: 1490, sku: 'EG-W-SH-08', active: true, featured: true, stock: 0,
      variants: variantsFor('overshirt', ['S', 'M', 'L', 'XL'], [colors[2]], [3, 6, 6, 2], 'OVS')
    },
    {
      id: 'prod-wide-pant', slug: 'wide-leg-everyday-pant', name: { ar: 'بنطال يومي واسع', en: 'Wide-leg everyday pant' },
      description: { ar: 'خصر مريح وقصّة واسعة تنسدل بخفة؛ قطعة متعددة الاستخدامات بتفاصيل بسيطة.', en: 'A comfortable waist and fluid wide leg make this an easy, versatile piece with a clean finish.' },
      categoryId: 'cat-bottoms', images: ['assets/images/look-women.jpg'], price: 1250, salePrice: null, sku: 'EG-W-TR-04', active: true, featured: true, stock: 0,
      variants: variantsFor('wide', ['S', 'M', 'L', 'XL'], [colors[4], colors[3]], [3, 1, 7, 4, 5, 4, 3, 2], 'WLP')
    },
    {
      id: 'prod-kids-hoodie', slug: 'weekend-kids-hoodie', name: { ar: 'هودي ويك إند للأطفال', en: 'Weekend kids hoodie' },
      description: { ar: 'هودي قطني بملمس دافئ وبطانة ناعمة، مع مساحة للحركة ومقاس مريح للطبقات.', en: 'A soft, warm cotton hoodie with room to move and an easy fit for layering.' },
      categoryId: 'cat-kids', images: ['assets/images/look-kids.jpg'], price: 980, salePrice: null, sku: 'EG-K-HD-03', active: true, featured: true, stock: 0,
      variants: variantsFor('kids', ['6–8', '8–10', '10–12'], [], [5, 7, 4], 'KHD')
    },
    {
      id: 'prod-shirt', slug: 'classic-poplin-shirt', name: { ar: 'قميص بوبلين كلاسيك', en: 'Classic poplin shirt' },
      description: { ar: 'قميص بوبلين بملمس ناعم وياقة مرتبة؛ اختيار عملي للعمل والمناسبات البسيطة.', en: 'Smooth poplin with a neat collar, suited to workdays and understated occasions.' },
      categoryId: 'cat-tops', images: ['assets/images/hero-editorial.jpg'], price: 1190, salePrice: 990, sku: 'EG-M-SH-09', active: true, featured: false, stock: 0,
      variants: variantsFor('shirt', ['S', 'M', 'L', 'XL'], [], [4, 9, 7, 3], 'POP')
    },
    {
      id: 'prod-tote', slug: 'everyday-canvas-tote', name: { ar: 'حقيبة كانفاس يومية', en: 'Everyday canvas tote' },
      description: { ar: 'حقيبة كانفاس متينة بمساحة واسعة وحمّالات مريحة؛ قطعة سهلة للاستخدام اليومي.', en: 'A sturdy canvas carryall with generous room and comfortable straps for everyday use.' },
      categoryId: 'cat-accessories', images: ['assets/images/look-cargo.jpg'], price: 420, salePrice: null, sku: 'EG-A-TT-01', active: true, featured: true, stock: 19, variants: []
    },
    {
      id: 'prod-polo', slug: 'cotton-pique-polo', name: { ar: 'تيشيرت بولو بيكيه', en: 'Cotton pique polo' },
      description: { ar: 'قطن بيكيه مريح وياقة ناعمة وأزرار بسيطة؛ لمسة مرتبة دون مبالغة.', en: 'Comfortable cotton pique, a soft collar and understated buttons for a neat relaxed look.' },
      categoryId: 'cat-men', images: ['assets/images/look-tee.jpg'], price: 890, salePrice: null, sku: 'EG-M-PL-05', active: true, featured: false, stock: 0,
      variants: variantsFor('polo', [], [colors[0], colors[6]], [5, 6], 'POL')
    },
    {
      id: 'prod-jacket', slug: 'utility-light-jacket', name: { ar: 'جاكيت خفيف عملي', en: 'Utility light jacket' },
      description: { ar: 'جاكيت خفيف بجيوب عملية وقصّة سهلة للطبقات، مناسب لأيام الانتقال بين الفصول.', en: 'A lightweight jacket with useful pockets and an easy layering fit for in-between weather.' },
      categoryId: 'cat-men', images: ['assets/images/hero-editorial.jpg'], price: 2140, salePrice: 1890, sku: 'EG-M-JK-11', active: true, featured: false, stock: 0,
      variants: variantsFor('jacket', [], [colors[2], colors[3]], [2, 4], 'JKT')
    }
  ];
  const today = new Date();
  const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString();
  const start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString();
  Store.demoData = {
    categories: categories,
    products: products,
    sizes: sizes,
    colors: colors,
    orders: [],
    customers: [
      { id: 'demo-customer-1', fullName: 'Mariam Hassan', email: 'mariam@example.com', phone: '+20 101 234 5678', createdAt: '2026-09-18T09:30:00.000Z', role: 'customer' },
      { id: 'demo-customer-2', fullName: 'Omar Adel', email: 'omar@example.com', phone: '+20 109 876 5432', createdAt: '2026-09-22T14:10:00.000Z', role: 'customer' },
      { id: 'demo-customer-user', fullName: 'Mariam Hassan', email: 'customer@centerelgowaily.demo', phone: '+20 101 234 5678', createdAt: '2026-10-01T10:00:00.000Z', role: 'customer' }
    ],
    promotions: [
      { id: 'promo-welcome', code: 'GOWAILY10', title: { ar: 'خصم ترحيبي', en: 'Welcome offer' }, type: 'percentage', value: 10, active: true, startsAt: start, endsAt: end }
    ],
    settings: {
      storeName: { ar: 'سنتر الجويلي', en: 'Center El Gowaily' },
      phone: '+20 100 000 0000', email: 'hello@centerelgowaily.example', address: { ar: 'القاهرة، مصر', en: 'Cairo, Egypt' },
      deliveryFee: 60, freeDeliveryThreshold: 2000, lowStockThreshold: 4,
      deliveryNote: { ar: 'يظهر موعد التوصيل المتوقع عند إتمام الطلب.', en: 'An estimated delivery window is shown at checkout.' }
    }
  };
})(window.Store);
