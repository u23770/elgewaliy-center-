# Center El Gowaily Admin Store Manager Upgrade

## Goal
Upgrade the existing admin workspace into a practical clothing-store back office while preserving the current static architecture and standalone admin access gate.

## Scope
1. Product manager: bilingual details, category, pricing, images, SKU, active/featured state, size/colour variants, per-variant SKU/price/stock.
2. Product media: easier image management and safer URL/file handling.
3. Excel/CSV import: header detection, Arabic/English aliases, row grouping into products/variants, preview-ready validation, duplicate handling, add/update modes.
4. Inventory: variant-aware quantities and safer stock updates.
5. Discounts: Aquarium-style product/category/global/coupon rules without points, with min order, cap, usage limits, scheduling, priority, and server-side validation/application.
6. Order integration: discounts and inventory stay authoritative at checkout.
7. Dashboard: operational stock/order/discount signals.
8. Responsive/admin UX and verification.

## Implementation order
- Add pure import/normalization utilities and tests first.
- Integrate Product/Import UI with the existing admin renderer.
- Extend persistence adapters.
- Extend Supabase schema/RPCs after reviewing the current project and Supabase guidance.
- Verify production-like flows through browser checks before merging to main.

## Constraints
- Keep the current standalone /admin/ route family and access-code gate.
- No points/loyalty system.
- Do not expose private Supabase service keys.
- Keep demo mode working.
- Do not silently overwrite products on import; make duplicate behavior explicit.
