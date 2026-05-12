# Webshop — What's Left to Ship v1

Status snapshot of what's done, what's still missing, and the suggested order to close the gaps for a small working DE/EU shop.

_Last audit: 2026-05-05_

---

## ✅ Already done

- Cart clears on checkout success
- `@tailwindcss/typography` installed and wired in `globals.css`
- Stripe webhook raw-body verification ([order.ts:378](backend/src/api/order/controllers/order.ts))
- Order routes locked down (no public `find`/`findOne` — [routes/order.ts](backend/src/api/order/routes/order.ts))
- `Preview3D` dynamic-imported with `{ ssr: false }`
- CORS origins env-driven ([middlewares.ts](backend/config/middlewares.ts))
- Server-side `customizationPriceAdjustment` validation against schema
- `loading.tsx` / `error.tsx` / `not-found.tsx` for storefront routes
- Inventory check + decrement on `payment_intent.succeeded`
- Webhook idempotency via `stripeSessionId` filter
- Dockerfile no longer overwrites prod `node_modules` with build deps
- Shipping confirmation email (`sendShippingConfirmationEmail`)
- Configurator with Tylko-style controls + per-cell pencil overlay
- Production-PDF generator (cutting list, hardware, summary)
- Legal pages (AGB, Datenschutz, Impressum, Versand, Widerruf)
- Promo code validation + application

---

## 🔴 Must-have gaps (block v1 launch)

### 1. Order confirmation email after successful payment
- **Where:** `payment_intent.succeeded` branch, [order.ts:389](backend/src/api/order/controllers/order.ts)
- Only `sendShippingConfirmationEmail` exists. Customer has no proof of purchase right after paying.
- **Fix:** Add `sendOrderConfirmationEmail(order)` in [services/email.ts](backend/src/api/order/services/email.ts) with order number, items table, total, billing/shipping address. Trigger it at the end of the success branch, wrapped in try/catch so a mail failure doesn't fail the webhook.

### 2. Invoice / Rechnung (PDF)
- **Where:** new `services/invoice-pdf.ts` parallel to [`production-pdf.ts`](backend/src/api/order/services/production-pdf.ts)
- §14 UStG requires a proper invoice for B2C orders.
- Must include: shop legal info, customer billing address, **Rechnungsnummer**, date, line items with `Netto`, `MwSt-Satz` and `MwSt-Betrag`, `Gesamtbetrag`, payment method.
- **Fix:** Generate at payment success, attach to confirmation email or expose via tokenized URL.

### 3. VAT split in checkout & order summary
- **Where:** [checkout/page.tsx](frontend/src/app/[locale]/checkout/page.tsx) `OrderSummary`, all price displays
- Currently shows only `Gesamt`. EU shops must display "inkl. 19% MwSt." and ideally break it out.
- **Fix:** Helper `splitVat(grossCents, rate=19)` → `{ net, vat, gross }`. Show three rows in summary. Same split goes onto the invoice.

### 4. Customer order lookup
- Order routes are auth-required (correct), but guests have no way to view their order.
- **Cheapest:** include full order details in the confirmation email (items, total, addresses, ETA).
- **Better:** tokenized `/order/[id]?token=...` page — generate a random token at order create, store on order, render a read-only summary if token matches.

### 5. Strapi Public role permissions audit
- **Where:** Strapi admin → Settings → Users & Permissions → Roles → Public
- Verify Public has **only** `find` + `findOne` on `product` and `category`.
- Verify Public has **nothing** on `order`, `promo-code`.
- Default `createCoreRouter` in [`product.ts`](backend/src/api/product/routes/product.ts) exposes the full CRUD surface — admin permissions matter.

### 6. `robots.txt` + `sitemap.xml`
- **Where:** `frontend/src/app/robots.ts` + `frontend/src/app/sitemap.ts` (Next metadata API)
- Without these Google indexing is poor.
- **Fix:** `sitemap.ts` should fetch product slugs from Strapi and include `/`, `/products`, `/products/[slug]`, `/configurator`.

### 7. Cookie consent banner
- Required in DE/EU if any non-essential cookies are set (analytics, ads, marketing pixels, Stripe non-functional).
- Functional-only (cart, locale): can skip a banner but should still have a clear cookie note in [Datenschutz](frontend/src/app/[locale]/datenschutz/page.tsx).
- **Fix:** add a small banner component that gates non-essential scripts; remember choice in `localStorage` + first-party cookie.

### 8. Image upload provider in production
- **Where:** [`backend/config/plugins.ts`](backend/config/plugins.ts) defaults `UPLOAD_PROVIDER=local`
- On Railway/Render/Fly the container filesystem is ephemeral — uploaded product images vanish on redeploy.
- **Fix:** set `UPLOAD_PROVIDER=cloudinary` (creds already wired) or add `@strapi/provider-upload-aws-s3` for R2/S3.

---

## 🟡 Should-have (close before serious traffic)

### 9. Rate limiting
- **Endpoints:** `POST /api/checkout`, `POST /api/validate-promo`, Strapi `/auth/local`
- Strapi 5 has no built-in plugin. Options: Cloudflare rules, a Koa middleware (`koa-ratelimit` + Redis), or a custom global middleware in [`middlewares.ts`](backend/config/middlewares.ts).

### 10. `/admin` protection
- Strapi admin lives on the same hostname as the API.
- **Options:** IP allowlist at the proxy, separate hostname, or at minimum strong `ADMIN_JWT_SECRET` rotated from `.env.example` and 2FA on admin accounts.

### 11. Product OpenGraph / metadata
- **Where:** [`products/[slug]/page.tsx`](frontend/src/app/[locale]/products/[slug]/page.tsx) `generateMetadata`
- Verify `openGraph.images`, `description`, `title` are populated for share previews.

### 12. Additional Stripe payment methods
- Currently card-only. German shoppers expect SEPA + Klarna + PayPal.
- Each is an entry in `payment_method_types` on the PaymentIntent + enabling in Stripe dashboard.

### 13. Production env-vars checklist
- Backend: `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`, `BACKEND_URL`, `CORS_ORIGINS`, `EMAIL_*` SMTP vars, `JWT_SECRET`, `API_TOKEN_SALT`, `APP_KEYS`, `ADMIN_JWT_SECRET`, `DATABASE_URL`, `UPLOAD_PROVIDER` + creds.
- Frontend (Vercel): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRAPI_URL`, `STRAPI_API_TOKEN` (server-only, read scope), `NEXT_PUBLIC_SITE_URL`.
- All `.env.example` defaults must be rotated.

### 14. Error tracking (Sentry)
- Silent failures in the webhook handler currently only surface in `strapi.log`.
- **Fix:** Sentry on both frontend (Next plugin) and backend (Sentry Node SDK in `bootstrap`); breadcrumbs on Stripe events, Strapi DB errors, email failures.

### 15. Stripe webhook URL configured
- After deploy: add the production endpoint in Stripe dashboard, copy the `whsec_…` secret to `STRIPE_WEBHOOK_SECRET`. Verify with a test event.

### 16. Order number / Bestellnummer
- Currently uses Strapi `documentId` (random alphanumeric) for customer-facing reference. Works but ugly in emails.
- **Fix:** add a sequential `orderNumber` field (e.g. `2026-000123`) generated on create.

---

## 🟢 Nice-to-have (skip for v1)

- Product search bar
- Product reviews / ratings
- Wishlist
- Customer account system (registration, login, address book)
- Multi-currency
- Returns / RMA flow
- Newsletter signup + double opt-in
- Live shipping rates from a carrier API (DHL, DPD)
- Live chat / support widget
- Abandoned-cart emails
- Analytics (Plausible / GA4) — gated by cookie consent

---

## Suggested order to ship v1

A focused 1–2 day sequence that gets you legally and operationally OK for a small DE shop:

1. **#1** Order confirmation email — customer gets proof of purchase
2. **#3** VAT split in summary — required display
3. **#2** Invoice PDF — required record
4. **#4** Customer order lookup — basic CX
5. **#5** Public role permission audit — quick admin check
6. **#6** `robots.txt` + `sitemap.xml` — SEO
7. **#8** Upload provider switched to Cloudinary/S3 — prod stability
8. **#13** Env-vars checklist filled in on both hosts

Then deploy, set the Stripe webhook URL (#15), watch Sentry (#14), and add payment methods (#12) once orders start coming in.
