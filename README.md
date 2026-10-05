# Center El Gowaily — سنتر الجويلي

Production-ready bilingual Arabic/English clothing storefront with a separate admin workspace.

## Stack

- HTML5, CSS3 and browser-native JavaScript.
- Supabase for catalog, inventory, customers, orders, site configuration, delivery zones, drivers, promotions and media metadata.
- Supabase Storage for uploaded media.
- Static hosting on Vercel, GitHub Pages or Netlify. No framework or build step is required.

## Storefront

Customers can browse products and variants, add items to the cart, choose a delivery zone/sub-zone, enter delivery details, provide a Google Maps location link, select cash or card on delivery, apply eligible promotion codes, place an order, track an order, and view their order history.

Order totals are verified by the Supabase database when the order is created. Product/variant prices, stock, promotions and delivery fees are not trusted from the browser.

## Admin

Open /admin/login.html and enter the configured administration access code.

The admin workspace includes:

- Dashboard and order management.
- Website design/customizer.
- Website content and homepage section ordering.
- Media library and brand assets.
- Products, categories, sizes, colours, variants and inventory.
- Spreadsheet import for products.
- Delivery zones and sub-zones.
- Driver management.
- Delivery operations and order assignment.
- Discounts and coupons.
- Banners, gallery, reviews and social links.
- Store and delivery settings.

Admin access uses a short-lived server-side session created by the admin_start_session RPC. The raw access code is not stored in browser storage.

## Brand assets

Put the official logo in:

assets/brand/logo.png

Then set the logo path from Website → Customizer to assets/brand/logo.png.

## Project structure

admin/
  index.html, login.html
  customizer.html, content.html, media.html, sections.html
  banners.html, gallery.html, socials.html
  zones.html, deliveries.html, drivers.html, reviews.html
  products.html, categories.html, inventory.html, attributes.html
  orders.html, customers.html, promotions.html, settings.html

assets/
  brand/
  images/

css/
  style.css
  responsive.css
  admin.css

js/
  app.js
  admin.js
  admin-site-builder.js
  checkout.js
  order-print.js
  products.js
  repository.js
  site-config-utils.js
  remote-mappers.js
  ...

supabase/
  schema.sql

## Supabase

The browser uses only the public publishable/anon key. Do not place a service-role or other secret key in the repository.

The live Supabase project contains the production schema and migrations. The tracked supabase/schema.sql file is a reference starter schema; deployed migrations are the source of truth for the live database.

Before taking real orders, verify:

1. The production Supabase project is configured and reachable.
2. The correct admin access token/code is enabled.
3. Delivery zones and sub-zones are added from the admin workspace.
4. Drivers are added from the admin workspace.
5. The official logo is uploaded to assets/brand/logo.png.
6. Store contact information and website content are updated from the admin workspace.
7. Vercel is connected to the main branch.
8. The production order flow has been tested from product selection through printing.

## Tests

Tests use Node's built-in test runner. Run:

node --test tests/*.test.js

The suite covers admin access, product/variant normalization, promotions, spreadsheet import and live-schema mapping.