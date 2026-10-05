(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.StoreSiteConfig = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULTS = {
    identity: {
      storeName: { en: 'Center El Gowaily', ar: 'سنتر الجويلي' },
      tagline: { en: 'Everyday style, thoughtfully chosen', ar: 'أناقة يومية باختيارات مدروسة' },
      announcement: { en: 'Cairo style, delivered with care', ar: 'أناقة من القاهرة، وتوصيل باهتمام' }
    },
    theme: {
      colors: {
        primary: '#252824',
        secondary: '#777e60',
        accent: '#b96749',
        background: '#f1efe9',
        sectionBackground: '#faf9f5',
        cardBackground: '#fffefa',
        border: '#e2dfd7'
      },
      radius: 'soft',
      shadow: 'subtle'
    },
    homepage: {
      hero: {
        eyebrow: { en: 'CENTER EL GOWAILY · CAIRO', ar: 'سنتر الجويلي · القاهرة' },
        title: { en: 'Everyday pieces.\nMade to stay.', ar: 'قطع يومية.\nتفضل معاك.' },
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
        cta: { en: 'Read our story', ar: 'اقرأ حكايتنا' }
      },
      sectionTitles: {
        categories: { en: 'Shop by category', ar: 'تسوق حسب القسم' },
        featured: { en: 'Featured pieces', ar: 'قطع مختارة' },
        new: { en: 'New arrivals', ar: 'وصل حديثًا' },
        banners: { en: 'Store updates', ar: 'أحدث عروض المتجر' },
        gallery: { en: 'From Center El Gowaily', ar: 'من سنتر الجويلي' }
      },
      sections: {
        hero: { visible: true, order: 1 },
        promise: { visible: true, order: 2 },
        categories: { visible: true, order: 3 },
        featured: { visible: true, order: 4 },
        story: { visible: true, order: 5 },
        new: { visible: true, order: 6 },
        banners: { visible: true, order: 7 },
        gallery: { visible: true, order: 8 },
        newsletter: { visible: true, order: 9 }
      }
    },
    content: {
      about: {
        eyebrow: { en: 'OUR STORY', ar: 'حكايتنا' },
        title: { en: 'A wardrobe built around real days.', ar: 'تشكيلة مصممة لأيامك الحقيقية.' },
        body: { en: 'We choose versatile clothing with useful fits, comfortable materials and details that earn their place in your wardrobe.', ar: 'نختار ملابس عملية بقصّات مريحة وخامات مناسبة وتفاصيل تستحق مكانها في دولابك.' },
        image: 'assets/images/hero-editorial.jpg'
      },
      contact: {
        address: { en: 'Cairo, Egypt', ar: 'القاهرة، مصر' },
        phone: '',
        email: '',
        whatsapp: '',
        mapsUrl: ''
      },
      hours: { en: 'Saturday–Thursday · 10:00–22:00', ar: 'السبت–الخميس · 10:00–22:00' },
      footer: {
        body: { en: 'Everyday clothing, selected with care.', ar: 'ملابس يومية باختيارات مدروسة.' },
        note: { en: '© Center El Gowaily. All rights reserved.', ar: '© سنتر الجويلي. جميع الحقوق محفوظة.' }
      },
      seo: {
        title: { en: 'Center El Gowaily | Everyday clothing', ar: 'سنتر الجويلي | ملابس يومية' },
        description: { en: 'Shop Center El Gowaily for everyday clothing, useful fits and easy essentials.', ar: 'تسوق من سنتر الجويلي ملابس يومية وقطع عملية بقصّات مريحة.' }
      }
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isHex(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ''));
  }

  function normalizeHexColor(value, fallback) {
    return isHex(value) ? String(value).toLowerCase() : (fallback || DEFAULTS.theme.colors.primary);
  }

  function localized(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      en: String(source.en == null ? ((fallback && fallback.en) || '') : source.en).trim(),
      ar: String(source.ar == null ? ((fallback && fallback.ar) || '') : source.ar).trim()
    };
  }

  function deepMerge(base, patch) {
    const output = clone(base);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return output;
    Object.keys(patch).forEach(function (key) {
      const value = patch[key];
      if (value === undefined) return;
      if (value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
        output[key] = deepMerge(output[key], value);
      } else {
        output[key] = clone(value);
      }
    });
    return output;
  }

  function normalizeSiteConfig(input) {
    const out = deepMerge(DEFAULTS, input || {});
    Object.keys(DEFAULTS.theme.colors).forEach(function (key) {
      out.theme.colors[key] = normalizeHexColor(out.theme.colors[key], DEFAULTS.theme.colors[key]);
    });
    out.identity.storeName = localized(out.identity.storeName, DEFAULTS.identity.storeName);
    out.identity.tagline = localized(out.identity.tagline, DEFAULTS.identity.tagline);
    out.identity.announcement = localized(out.identity.announcement, DEFAULTS.identity.announcement);
    ['eyebrow', 'title', 'body', 'primaryCta', 'secondaryCta'].forEach(function (key) {
      out.homepage.hero[key] = localized(out.homepage.hero[key], DEFAULTS.homepage.hero[key]);
    });
    out.homepage.story.eyebrow = localized(out.homepage.story.eyebrow, DEFAULTS.homepage.story.eyebrow);
    out.homepage.story.title = localized(out.homepage.story.title, DEFAULTS.homepage.story.title);
    out.homepage.story.body = localized(out.homepage.story.body, DEFAULTS.homepage.story.body);
    out.homepage.story.cta = localized(out.homepage.story.cta, DEFAULTS.homepage.story.cta);
    out.homepage.promise = Array.isArray(out.homepage.promise) ? out.homepage.promise.slice(0, 6).map(function (item, index) {
      return {
        icon: String(item && item.icon || DEFAULTS.homepage.promise[index] && DEFAULTS.homepage.promise[index].icon || 'shield'),
        title: localized(item && item.title, DEFAULTS.homepage.promise[index] && DEFAULTS.homepage.promise[index].title || { en: '', ar: '' })
      };
    }) : clone(DEFAULTS.homepage.promise);
    const sectionNames = Object.keys(DEFAULTS.homepage.sections);
    sectionNames.forEach(function (name, index) {
      const section = out.homepage.sections[name] || {};
      out.homepage.sections[name] = { visible: section.visible !== false, order: Number.isFinite(Number(section.order)) ? Number(section.order) : index + 1 };
    });
    out.content.about.eyebrow = localized(out.content.about.eyebrow, DEFAULTS.content.about.eyebrow);
    out.content.about.title = localized(out.content.about.title, DEFAULTS.content.about.title);
    out.content.about.body = localized(out.content.about.body, DEFAULTS.content.about.body);
    out.content.contact.address = localized(out.content.contact.address, DEFAULTS.content.contact.address);
    out.content.hours = localized(out.content.hours, DEFAULTS.content.hours);
    out.content.footer.body = localized(out.content.footer.body, DEFAULTS.content.footer.body);
    out.content.footer.note = localized(out.content.footer.note, DEFAULTS.content.footer.note);
    out.content.seo.title = localized(out.content.seo.title, DEFAULTS.content.seo.title);
    out.content.seo.description = localized(out.content.seo.description, DEFAULTS.content.seo.description);
    return out;
  }

  function mergeSiteConfig(patch) {
    return normalizeSiteConfig(deepMerge(DEFAULTS, patch || {}));
  }

  function themeCssVariables(config) {
    const colors = (config && config.theme && config.theme.colors) || DEFAULTS.theme.colors;
    const primary = normalizeHexColor(colors.primary, DEFAULTS.theme.colors.primary);
    const secondary = normalizeHexColor(colors.secondary, DEFAULTS.theme.colors.secondary);
    const accent = normalizeHexColor(colors.accent, DEFAULTS.theme.colors.accent);
    const background = normalizeHexColor(colors.background, DEFAULTS.theme.colors.background);
    const sectionBackground = normalizeHexColor(colors.sectionBackground, DEFAULTS.theme.colors.sectionBackground);
    const cardBackground = normalizeHexColor(colors.cardBackground, DEFAULTS.theme.colors.cardBackground);
    const border = normalizeHexColor(colors.border, DEFAULTS.theme.colors.border);
    return {
      '--color-primary': primary,
      '--color-secondary': secondary,
      '--color-accent': accent,
      '--color-background': background,
      '--color-section-background': sectionBackground,
      '--color-card-background': cardBackground,
      '--color-border': border,
      '--ink': primary,
      '--ink-soft': secondary,
      '--clay': accent,
      '--clay-dark': accent,
      '--paper': background,
      '--paper-deep': sectionBackground,
      '--surface': cardBackground,
      '--line': border,
      '--olive': secondary,
      '--olive-dark': secondary
    };
  }
  function orderedVisibleSections(sections) {
    return Object.keys(sections || {}).filter(function (key) {
      return sections[key] && sections[key].visible !== false;
    }).sort(function (a, b) {
      return Number(sections[a].order || 0) - Number(sections[b].order || 0);
    });
  }

  return {
    DEFAULTS,
    clone,
    normalizeHexColor,
    normalizeSiteConfig,
    mergeSiteConfig,
    themeCssVariables,
    orderedVisibleSections
  };
});
