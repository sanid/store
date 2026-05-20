# Shop gap analysis

Snapshot of what's missing vs. a production e-commerce setup.

## Legal / compliance (DE — required before launch)
- [x] Impressum page
- [x] Datenschutzerklärung
- [x] AGB (Allgemeine Geschäftsbedingungen)
- [x] Widerrufsbelehrung + Widerrufsformular
- [x] Cookie consent banner with category opt-in (necessary for any analytics)
- VAT: `taxRate` per product, VAT line on invoice, B2B reverse-charge logic if selling abroad
- [x] Customer invoice PDF (Rechnung) — distinct from internal production PDF
  - Note: invoice number format is `RE-YYYYMMDD-{prefix}`. German law expects strictly sequential numbering — replace with a counter (`api::invoice-counter`) before going live, and fill `INVOICE_ISSUER_*` env vars (Impressum, Steuernr./USt-IdNr., IBAN).

## Order lifecycle holes
- [x] **Order confirmation email** (on `payment_intent.succeeded`)
- [x] **Customer order lookup page** (orderId + email, no login)
- Refunds: status `refunded` is wired in webhook, but no admin action to trigger a Stripe refund
- Payment-failed / expired UX on the storefront
- Cancellation flow before production starts
- Edit order address before shipping

## Trust / conversion
- Product reviews & ratings
- Stock / lead-time display per product
- Cross-sell on the configurator ("ergänzendes Zubehör")
- Abandoned-cart email
- Saved configurations (link, not account)

## Accounts (optional, defer)
- Customer accounts with order history, address book, saved configs
- Password reset, email verification
- Tradeoff: adds auth surface and password-reset infra. The magic-link order lookup above covers 80% of the value.

## Operations
- [x] Admin order export (CSV)
- Inventory beyond a single integer: variants, low-stock alerts, back-in-stock notifications
- Shipping-label generation / carrier API integration
- Newsletter / transactional email separation (Resend, Postmark, …)

## SEO / growth
- Per-product `<Product>` JSON-LD with `offers`, `price`, `availability`
- Sitemap pulls live Strapi product slugs (verify)
- OG/social images per product
- Analytics (PostHog/Plausible) gated by cookie consent

## Quality / security basics
- Rate-limit + bot protection on `/api/checkout` and `/api/validate-promo`
- [x] CSP and security headers in `next.config.ts`
- [x] Custom 500 page (`app/global-error.tsx`)
- Sentry or equivalent error tracking
