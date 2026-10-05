# Center El Gowaily

Production-ready bilingual clothing storefront for Center El Gowaily.\n\nThe active release is intended for real store operation; sample catalogue records are not published.

## Live architecture

The customer storefront reads catalogue, inventory, orders, promotions, delivery configuration and website content from the connected Supabase project. Administrative changes are protected by the store access session and write through server-side RPCs.

The browser uses only the public Supabase key. Service-role credentials are never stored in the frontend repository.

## Storefront

The site includes:

- Bilingual Arabic/English storefront
- Product catalogue with categories, variants, sizes, colours, SKU and stock
- Cart and checkout with server-side price and stock validation
- Cash/card-on-delivery options
- Promotion codes and automatic promotions
- Customer accounts, email verification and password recovery
- Secure order tracking by order number and checkout phone
- Customer order history
- Newsletter subscriptions stored in Supabase
- Responsive mobile navigation
- SEO-ready page metadata

## Administration

The private admin area is intentionally code-gated rather than a username/password screen.

Administrative capabilities include:

- Products, categories, variants, images and inventory
- Spreadsheet import and validation
- Promotions and coupon rules
- Website design and branding
- Bilingual website content
- Homepage section visibility and ordering
- Media library
- Homepage banners and gallery
- Social links
- Delivery zones and subzones
- Delivery operations and driver assignments
- Driver roster
- Customer records
- Store reviews and approval
- Store and checkout settings

## Website editing model

Website configuration is stored in Supabase and consumed by the public storefront. Changes made in the admin area therefore affect the live site rather than a browser-only copy.

## Local engineering

The repository is a static HTML/CSS/JavaScript application. Run the test suite with:

```bash
node --test tests/*.test.js
```

Syntax checks:

```bash
for file in js/*.js admin/*.js; do node --check "$file"; done
```

For local development, use a static HTTP server such as:

```bash
python3 -m http.server 8000
```

The deployed Supabase project remains the production data source. No sample credentials are shipped.

## Configuration

The checked-in `.env.example` is a documentation template only. The browser configuration used by the static site lives in `js/config.js` and contains the public/publishable Supabase key.

Never commit service-role keys, database passwords, private API keys, or other server secrets.

## Database

Supabase migrations in this project are additive and preserve historical order references.

Before changing production schema or store data, verify the current live schema and take an appropriate database backup.
