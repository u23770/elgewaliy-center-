(function (Store) {
  'use strict';

  const tx = function (en, ar) { return Store.i18n.locale === 'ar' ? ar : en; };
  const esc = function (value) { return Store.escape(value); };
  const C = function () { return Store.Components; };

  const fields = [
    ['nameEn', 'Product name (English)', 'اسم المنتج بالإنجليزية', true],
    ['nameAr', 'Product name (Arabic)', 'اسم المنتج بالعربية', false],
    ['category', 'Category', 'التصنيف', false],
    ['price', 'Regular price', 'السعر الأساسي', true],
    ['salePrice', 'Sale price', 'سعر الخصم', false],
    ['sku', 'Product SKU', 'كود المنتج', false],
    ['descriptionEn', 'Description (English)', 'الوصف بالإنجليزية', false],
    ['descriptionAr', 'Description (Arabic)', 'الوصف بالعربية', false],
    ['stock', 'Simple product stock', 'مخزون المنتج البسيط', false],
    ['size', 'Size', 'المقاس', false],
    ['color', 'Colour', 'اللون', false],
    ['colorEn', 'Colour name (English)', 'اسم اللون بالإنجليزية', false],
    ['colorAr', 'Colour name (Arabic)', 'اسم اللون بالعربية', false],
    ['colorHex', 'Colour HEX', 'كود لون HEX', false],
    ['variantSku', 'Variant SKU', 'كود الخيار', false],
    ['variantPrice', 'Variant price', 'سعر الخيار', false],
    ['variantStock', 'Variant stock', 'مخزون الخيار', false],
    ['image', 'Image URL', 'رابط الصورة', false],
    ['active', 'Visible / active', 'ظاهر / نشط', false],
    ['featured', 'Featured', 'مميز', false]
  ];

  const state = {
    categories: [],
    sizes: [],
    colors: [],
    products: [],
    workbook: null,
    fileName: '',
    sheetName: '',
    rows: [],
    headers: [],
    mapping: {},
    mode: 'add_update',
    plan: null
  };

  function host(content) {
    const root = document.getElementById('admin-modal-root');
    if (root) root.innerHTML = content;
  }

  function parseSheet(name) {
    if (!state.workbook || !state.workbook.Sheets[name]) return;
    const sheet = state.workbook.Sheets[name];
    state.sheetName = name;
    state.rows = StoreAdminImport ? XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) : [];
    state.headers = state.rows.length ? Object.keys(state.rows[0]) : [];
    state.mapping = StoreAdminImport ? StoreAdminImport.inferColumnMapping(state.headers) : {};
    state.plan = null;
    renderWizard();
  }

  function readFile(file) {
    if (!file) return;
    if (!window.XLSX) {
      host(C().modal(tx('Spreadsheet import is unavailable', 'استيراد الجداول غير متاح'),
        '<div class="import-error-state"><strong>' + tx('The spreadsheet reader could not be loaded.', 'تعذر تحميل قارئ ملفات Excel.') + '</strong><p>' +
        tx('Refresh the page and try again. The importer accepts .xlsx, .xls and .csv files.', 'أعد تحميل الصفحة ثم جرّب مرة أخرى. المستورد يدعم ملفات xlsx وxls وcsv.') + '</p></div>'));
      return;
    }

    file.arrayBuffer().then(function (buffer) {
      state.fileName = file.name || '';
      state.workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const names = state.workbook.SheetNames || [];
      if (!names.length) throw new Error(tx('No sheets were found in this file.', 'لم يتم العثور على جداول داخل الملف.'));
      parseSheet(names[0]);
    }).catch(function (error) {
      C().toast(error.message || tx('Could not read this file.', 'تعذر قراءة الملف.'), 'error');
    });
  }

  function selectOptions(selected) {
    return '<option value="">' + tx('Ignore this column', 'تجاهل هذا العمود') + '</option>' +
      state.headers.map(function (header) {
        return '<option value="' + esc(header) + '" ' + (selected === header ? 'selected' : '') + '>' + esc(header) + '</option>';
      }).join('');
  }

  function setModal(title, body) {
    host(C().modal(title, body));
  }

  function renderStart() {
    setModal(
      tx('Import products from Excel', 'استيراد المنتجات من Excel'),
      '<div class="import-wizard">' +
        '<div class="import-intro"><span class="eyebrow">01 · ' + tx('FILE', 'الملف') + '</span><h3>' +
          tx('Bring your catalogue in one upload.', 'أدخل كتالوج المنتجات بالكامل في عملية رفع واحدة.') +
        '</h3><p>' +
          tx('Upload an Excel or CSV file. The importer will group repeated rows into product variants and validate prices, stock, SKUs and categories before writing anything.', 'ارفع ملف Excel أو CSV. النظام سيجمع الصفوف المتكررة كخيارات للمنتج ويتحقق من الأسعار والمخزون والأكواد والتصنيفات قبل الحفظ.') +
        '</p></div>' +
        '<label class="import-file-drop"><input id="admin-import-file" type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"><strong>' +
          tx('Choose spreadsheet', 'اختر ملف الجدول') +
        '</strong><span>' + tx('.xlsx, .xls or .csv', '.xlsx أو .xls أو .csv') + '</span></label>' +
        '<div class="import-example">' +
          '<strong>' + tx('Recommended columns', 'الأعمدة المقترحة') + '</strong>' +
          '<code>Product Name · اسم المنتج · Category · Price · SKU · Color · Size · Variant Stock · Image URL</code>' +
        '</div>' +
      '</div>'
    );
  }

  function renderMapping() {
    const sheets = (state.workbook.SheetNames || []).map(function (name) {
      return '<option value="' + esc(name) + '" ' + (state.sheetName === name ? 'selected' : '') + '>' + esc(name) + '</option>';
    }).join('');

    const rows = state.rows.length;
    const mappingRows = fields.map(function (field) {
      return '<label class="import-map-row"><span><strong>' + tx(field[1], field[2]) + '</strong>' +
        (field[3] ? '<em>' + tx('required', 'مطلوب') + '</em>' : '') +
        '</span><select data-import-map="' + field[0] + '">' + selectOptions(state.mapping[field[0]]) + '</select></label>';
    }).join('');

    setModal(
      tx('Map spreadsheet columns', 'تحديد أعمدة الجدول'),
      '<div class="import-wizard">' +
        '<div class="import-file-meta"><span class="eyebrow">02 · ' + tx('ANALYZE', 'التحليل') + '</span><strong>' + esc(state.fileName) + '</strong><small>' +
          tx(rows + ' data rows detected', 'تم اكتشاف ' + rows + ' صف بيانات') + '</small></div>' +
        '<div class="import-control-grid">' +
          '<label class="field"><span>' + tx('Sheet', 'الجدول') + '</span><select id="admin-import-sheet">' + sheets + '</select></label>' +
          '<label class="field"><span>' + tx('Import behavior', 'طريقة الاستيراد') + '</span><select id="admin-import-mode">' +
            '<option value="add_update" ' + (state.mode === 'add_update' ? 'selected' : '') + '>' + tx('Add new + update matches', 'إضافة الجديد + تحديث المطابق') + '</option>' +
            '<option value="add_new" ' + (state.mode === 'add_new' ? 'selected' : '') + '>' + tx('Add new only', 'الجديد فقط') + '</option>' +
            '<option value="update_only" ' + (state.mode === 'update_only' ? 'selected' : '') + '>' + tx('Update existing only', 'تحديث الموجود فقط') + '</option>' +
          '</select></label>' +
        '</div>' +
        '<div class="import-mapping-grid">' + mappingRows + '</div>' +
        '<div class="import-actions">' +
          '<button type="button" class="button button-outline" data-import-action="back">' + tx('Back', 'رجوع') + '</button>' +
          '<button type="button" class="button button-primary" data-import-action="analyze">' + tx('Analyze & preview', 'تحليل ومعاينة') + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function safeCategoryName(id) {
    const category = state.categories.find(function (item) { return item.id === id; });
    return category ? (Store.i18n.locale === 'ar' ? category.name.ar : category.name.en) : tx('Uncategorized', 'بدون تصنيف');
  }

  function renderErrors(plan) {
    if (!plan.errors.length) return '<div class="import-success-note">✓ ' + tx('No blocking errors found.', 'لا توجد أخطاء تمنع الاستيراد.') + '</div>';
    return '<div class="import-error-list"><strong>' + tx(plan.errors.length + ' blocking issues', plan.errors.length + ' مشكلة تمنع الاستيراد') + '</strong>' +
      '<div>' + plan.errors.slice(0, 30).map(function (item) {
        return '<p><b>' + tx('Row', 'صف') + ' ' + item.row + '</b> — ' + esc(item.message) + '</p>';
      }).join('') + (plan.errors.length > 30 ? '<p>…</p>' : '') + '</div></div>';
  }

  function renderPreview(plan) {
    const canImport = plan.items.length > 0;
    const previews = plan.items.slice(0, 20).map(function (product) {
      const optionText = product.variants.length ?
        tx(product.variants.length + ' variants', product.variants.length + ' خيار') : 
        tx(product.stock + ' stock', product.stock + ' مخزون');
      return '<article class="import-preview-item"><div><strong>' + esc(product.name[Store.i18n.locale]) + '</strong><small>' +
        esc(product.sku) + ' · ' + esc(safeCategoryName(product.categoryId)) + '</small></div><span>' +
        esc(optionText) + '</span><b>' + C().money(product.salePrice || product.price) + '</b></article>';
    }).join('');

    setModal(
      tx('Review product import', 'مراجعة استيراد المنتجات'),
      '<div class="import-wizard">' +
        '<div class="import-stats">' +
          '<div><span>' + tx('Rows', 'الصفوف') + '</span><strong>' + plan.stats.rows + '</strong></div>' +
          '<div><span>' + tx('Products', 'المنتجات') + '</span><strong>' + plan.stats.products + '</strong></div>' +
          '<div><span>' + tx('Variants', 'الخيارات') + '</span><strong>' + plan.stats.variants + '</strong></div>' +
          '<div><span>' + tx('Updates', 'التحديثات') + '</span><strong>' + plan.stats.updates + '</strong></div>' +
          '<div><span>' + tx('New', 'جديد') + '</span><strong>' + plan.stats.creates + '</strong></div>' +
        '</div>' +
        renderErrors(plan) +
        (plan.warnings.length ? '<div class="import-warning-list"><strong>' + tx('Warnings', 'تنبيهات') + '</strong>' + plan.warnings.slice(0, 20).map(function (item) { return '<p><b>' + tx('Row', 'صف') + ' ' + item.row + '</b> — ' + esc(item.message) + '</p>'; }).join('') + '</div>' : '') +
        '<div class="import-preview"><div class="import-preview-head"><strong>' + tx('Ready to write', 'جاهز للحفظ') + '</strong><span>' + tx(canImport ? 'Only the validated items below will be written.' : 'Fix the blocking issues and analyze again.', canImport ? 'سيتم حفظ العناصر السليمة فقط.' : 'أصلح المشاكل ثم أعد التحليل.') + '</span></div>' +
          (previews || '<div class="import-empty">' + tx('No valid products to import.', 'لا توجد منتجات صالحة للاستيراد.') + '</div>') +
        '</div>' +
        '<div class="import-actions">' +
          '<button type="button" class="button button-outline" data-import-action="mapping">' + tx('Back to mapping', 'العودة لتحديد الأعمدة') + '</button>' +
          '<button type="button" class="button button-primary" data-import-action="commit" ' + (canImport ? '' : 'disabled') + '>' + tx('Import validated products', 'استيراد المنتجات السليمة') + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderWizard() {
    if (!state.rows.length) {
      setModal(tx('Empty spreadsheet', 'الملف فارغ'),
        '<div class="import-error-state"><strong>' + tx('No data rows were found on this sheet.', 'لم يتم العثور على صفوف بيانات في هذا الجدول.') + '</strong><p>' +
        tx('Choose another sheet or a different file.', 'اختر جدولًا آخر أو ملفًا مختلفًا.') + '</p></div>');
      return;
    }
    renderMapping();
  }

  async function analyze() {
    if (!window.StoreAdminImport) return;
    const mapping = {};
    document.querySelectorAll('[data-import-map]').forEach(function (select) {
      if (select.value) mapping[select.dataset.importMap] = select.value;
    });
    state.mapping = mapping;
    state.mode = document.getElementById('admin-import-mode')?.value || state.mode;
    if (!mapping.nameEn && !mapping.nameAr) {
      C().toast(tx('Map at least one product-name column.', 'حدد عمود اسم منتج واحد على الأقل.'), 'error');
      return;
    }
    if (!mapping.price) {
      C().toast(tx('Map the regular price column.', 'حدد عمود السعر الأساسي.'), 'error');
      return;
    }

    state.plan = StoreAdminImport.buildImportPlan(state.rows, state.mapping, {
      categories: state.categories,
      existingProducts: state.products,
      existingSizes: state.sizes,
      existingColors: state.colors,
      mode: state.mode
    });
    renderPreview(state.plan);
  }

  async function commit() {
    const plan = state.plan;
    if (!plan || !plan.items.length) return;

    const button = document.querySelector('[data-import-action="commit"]');
    if (button) { button.disabled = true; button.textContent = tx('Importing…', 'جاري الاستيراد…'); }

    const failures = [];
    let completed = 0;
    try {
      for (const size of plan.catalogAdds.sizes) {
        try { await Store.repo.saveSize(size); } catch (error) { failures.push({ type: 'size', item: size.label, message: error.message }); }
      }
      for (const color of plan.catalogAdds.colors) {
        try { await Store.repo.saveColor(color); } catch (error) { failures.push({ type: 'color', item: color.key, message: error.message }); }
      }
      for (const product of plan.items) {
        try {
          await Store.repo.saveProduct(product);
          completed += 1;
          if (button) button.textContent = tx('Imported ' + completed + '/' + plan.items.length, 'تم استيراد ' + completed + '/' + plan.items.length);
        } catch (error) {
          failures.push({ type: 'product', item: product.sku, message: error.message });
        }
      }

      const message = failures.length
        ? tx(completed + ' products imported, ' + failures.length + ' items failed.', 'تم استيراد ' + completed + ' منتج مع فشل ' + failures.length + ' عنصر.')
        : tx(completed + ' products imported successfully.', 'تم استيراد ' + completed + ' منتج بنجاح.');
      C().toast(message, failures.length ? 'error' : 'success');

      if (failures.length) {
        const body = '<div class="import-wizard"><div class="import-error-list"><strong>' + tx('Import completed with issues', 'اكتمل الاستيراد مع وجود مشاكل') + '</strong>' +
          failures.slice(0, 30).map(function (item) { return '<p><b>' + esc(item.type) + '</b> · ' + esc(item.item) + ' — ' + esc(item.message) + '</p>'; }).join('') +
          '</div><div class="import-actions"><button type="button" class="button button-primary" data-action="modal-close">' + tx('Close', 'إغلاق') + '</button></div></div>';
        setModal(tx('Import result', 'نتيجة الاستيراد'), body);
      } else {
        document.getElementById('admin-modal-root').innerHTML = '';
        await Store.renderCurrent();
      }
    } catch (error) {
      C().toast(error.message || tx('Import failed.', 'فشل الاستيراد.'), 'error');
      if (button) button.disabled = false;
    }
  }

  async function openProductImport() {
    const result = await Promise.all([
      Store.repo.listCategories(true),
      Store.repo.listSizes(true),
      Store.repo.listColors(true),
      Store.repo.listProducts({ includeInactive: true })
    ]);
    state.categories = result[0] || [];
    state.sizes = result[1] || [];
    state.colors = result[2] || [];
    state.products = result[3] || [];
    state.workbook = null;
    state.fileName = '';
    state.rows = [];
    state.headers = [];
    state.mapping = {};
    state.plan = null;
    renderStart();
  }

  document.addEventListener('click', function (event) {
    const node = event.target.closest('[data-import-action]');
    if (!node) return;
    const action = node.dataset.importAction;
    if (action === 'analyze') { event.preventDefault(); analyze().catch(function (error) { C().toast(error.message || tx('Could not analyze the file.', 'تعذر تحليل الملف.'), 'error'); }); }
    if (action === 'commit') { event.preventDefault(); commit().catch(function (error) { C().toast(error.message || tx('Import failed.', 'فشل الاستيراد.'), 'error'); }); }
    if (action === 'back') { event.preventDefault(); renderStart(); }
    if (action === 'mapping') { event.preventDefault(); renderMapping(); }
  });

  document.addEventListener('change', function (event) {
    const node = event.target;
    if (node.id === 'admin-import-file') { readFile(node.files && node.files[0]); return; }
    if (node.id === 'admin-import-sheet') { parseSheet(node.value); return; }
    if (node.id === 'admin-import-mode') { state.mode = node.value; return; }
    if (node.matches('[data-import-map]')) { state.mapping[node.dataset.importMap] = node.value; return; }
  });

  Store.Admin = Store.Admin || {};
  Store.Admin.openProductImport = openProductImport;
})(window.Store);
