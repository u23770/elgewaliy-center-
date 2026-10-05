# Center El Gowaily — سنتر الجويلي

A bilingual Arabic/English clothing storefront and local admin workspace made with **HTML5, CSS3, and browser-native JavaScript only**. No framework, package manager, compilation step, or server-side runtime is required. The interface uses Egyptian pounds (EGP), supports Arabic RTL and English LTR, and is designed for static hosting.

## Preview and local use

- Open `index.html` in a modern browser, or serve this folder with any static file server. For example, with Python installed: `python3 -m http.server 8000` from this folder, then visit `http://localhost:8000`.
- This project does not use or require Node.js/npm to run, test, or deploy.
- The default adapter is `demo`; product data, cart, demo accounts, orders, settings, and promotions are stored locally in the current browser. The storefront and admin can be reviewed without a Supabase project.
- To clear the preview data, remove local-storage keys beginning `ceg-static-` (and `ceg-static-newsletter`) for this site.

### Local demo sign-ins

**Admin** (`/admin/login.html`)

```text
Email:    admin@centerelgowaily.demo
Password: CenterDemo!2026
```

**Customer** (`/login.html`)

```text
Email:    customer@centerelgowaily.demo
Password: CustomerDemo!2026
```

These are intentionally public preview credentials. Demo-mode authentication and localStorage are **not production security**. Do not use demo mode to operate a live store or hold real customer data.

## Customer features

- Home campaign, dynamic category collections, product cards, search, category/size/colour/price/availability/sale filters, and sorting.
- Product detail gallery with size and colour selection, variant-aware price/stock, sold-out combinations disabled, quantity control, and related pieces.
- Persistent cart and accessible slide-in bag drawer, quantity validation, subtotal, delivery fee, free-delivery threshold, and EGP total.
- Checkout with customer details, Egyptian governorates, address, delivery notes, cash/card on delivery, local demo promo-code validation, server-RPC integration boundary, order confirmation, phone-and-order-number tracking, status timeline, and customer order history.
- Registration, sign-in, profile editing, password-reset request, and session persistence.
- Arabic/English switching updates the document language/direction and preserves form input, product selections, cart, and signed-in state.
- Empty/error/loading feedback, accessible form labels and buttons, toast notifications, keyboard Escape handling, focus-visible styling, and responsive layouts.

## Admin features

- Dashboard with order/revenue/product/customer summaries and low-stock visibility.
- Product CRUD with English/Arabic names and descriptions, category, SKU, image URL list, price/sale price, active/featured flags, simple-stock products, and generated/editable variant combinations (size only, colour only, or size + colour).
- Category CRUD, size and colour catalogs, per-variant/simple-product inventory editing, order status updates and detail view, customer list, promotion CRUD, and delivery/store settings.
- Statuses used throughout: `pending`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, and `cancelled`.
- Every admin screen shows a local-demo warning when using the local adapter.

## Project structure

```text
index.html, shop.html, categories.html, product.html, search.html
cart.html, checkout.html, order-success.html, track.html
login.html, register.html, forgot-password.html, profile.html, orders.html
about.html, help.html, 404.html
admin/
  index.html, login.html, products.html, categories.html, inventory.html
  attributes.html, orders.html, customers.html, promotions.html, settings.html
css/
  style.css       # Tokens, shared components, storefront and customer pages
  responsive.css  # Mobile-first breakpoints and reduced-motion support
  admin.css       # Responsive admin workspace and editor dialogs
js/
  config.js       # Static-site mode and public Supabase browser config
  demo-data.js    # Isolated local sample catalogue and settings
  storage.js      # Safe localStorage wrapper and persisted session/cart/locale
  i18n.js         # Arabic and English dictionaries, locale and direction
  supabase.js     # Dependency-free Supabase REST/Auth/Storage client
  repository.js   # Demo adapter and optional Supabase REST/RPC adapter
  components.js   # Shared header, footer, product card, modal, toast, formatters
  products.js     # Home, shop, search, categories, product detail
  cart.js, checkout.js, auth.js, orders.js, admin.js, app.js
assets/
  images/         # Locally bundled campaign and fashion imagery + fallback
  icon.svg
supabase/schema.sql
.env.example
site.webmanifest
.nojekyll
```

HTML pages load ordinary deferred scripts in a known order. They can be opened directly with `file://` for the local demo; the optional Supabase API requires an HTTPS static host or localhost.

## Static hosting

Upload this folder as the site root on GitHub Pages, Netlify, or Vercel. All page, CSS, image, and script paths are relative to each page, so GitHub Pages project subpaths work without root-domain rewrites. `404.html` is included for static hosts that use a 404 document. There is no build command or dependency install.

## Supabase-ready data layer

The default `js/config.js` is deliberately configured for local demo data and has empty public Supabase values. To use the optional REST/RPC adapter, edit its public configuration:

```js
window.CEG_CONFIG = {
  dataMode: 'supabase',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_KEY',
  emailConfirmation: true
};
```

1. Create a Supabase project and apply `supabase/schema.sql` in its SQL Editor.
2. Set the Supabase Auth Site URL to the deployed site and allow the deployed `login.html` and `forgot-password.html` URLs as redirects. Add your local preview URLs while testing.
3. Register and verify the account that will administer the store. Promote it once in the SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-admin@example.com';
   ```

4. Create your categories/products from the admin workspace. Supabase reads and writes go through `js/repository.js` and `js/supabase.js`; RLS and the database role, not hidden links in JavaScript, are the security boundary.

`.env.example` documents the public deployment settings, but static hosting does not automatically load `.env`; copy the project URL and **anon/public key** into `js/config.js` or use a static host’s build-free placeholder replacement. Supabase anon/publishable keys are browser-visible by design. **Never add `service_role`, passwords, or another private server secret to this folder.**

The optional adapter uses Supabase Auth REST endpoints, PostgREST, and database RPCs without loading a third-party SDK. Checkout sends product/variant IDs and quantities to `place_order`; the SQL function reloads current prices, locks/checks stock, computes delivery, and saves the order. Guest tracking uses the phone-verified `track_order` RPC. The public storefront only reads active catalogue rows; admin writes are checked by RLS/admin RPCs.

The SQL file is a starter schema and has not been applied to a live project here. Review it against the target Supabase project before deployment. Promo-code redemption is enabled in the local demo adapter; the Supabase checkout keeps promo entry disabled until a database promotion-validation/discount RPC is added, so the browser cannot invent a production discount.

## Integration boundaries and production operations

- All pages use `Store.repo` from `js/repository.js`; sample products/orders are never embedded in page components.
- `js/demo-data.js` contains the local catalogue seed. The local adapter persists orders only after a user completes checkout.
- `js/supabase.js` uses only the configured public anon key; RLS policies in `supabase/schema.sql` are authoritative.
- No payment gateway, courier API, SMS/transactional email provider, or operational rate-limiter is fabricated. Checkout supports cash/card on delivery only. Connect those services before promising them to customers.
- Configure Supabase Auth email delivery, privacy/retention, delivery policy, catalogue imagery rights, backups, monitoring, and production domain redirects before taking real orders.

## Validation completed

The project was checked for JavaScript syntax, HTML parsing and local asset paths. The local data flow was exercised for catalogue/category filtering, size-colour variant selection, cart stock limits, promo calculation, checkout totals, inventory decrement, phone-verified order lookup, status changes, and cart clearing. Static pages can be served from the directory without any build tooling.
