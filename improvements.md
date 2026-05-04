# Store — Improvements & Bug Tracker

## Critical Bugs (must fix before deployment)

### B1: Cart never cleared on checkout success
- **File:** `frontend/src/app/checkout/success/page.tsx`
- `clearCart()` is imported from CartContext but never called
- After payment, user returns to success page and cart items remain in localStorage
- **Fix:** Add `useEffect(() => { clearCart(); }, [clearCart]);` on mount

### B2: `@tailwindcss/typography` not installed
- All `prose` classes used in legal pages and product descriptions render as unstyled HTML
- No paragraph spacing, heading sizes, or list styling
- **Fix:** `npm install @tailwindcss/typography` and add `@plugin "@tailwindcss/typography"` to `globals.css`

### B3: Stripe webhook raw body parsing is broken
- **File:** `backend/src/api/order/controllers/order.ts:151`
- `handleStripeWebhook` passes `ctx.request.body` (already parsed JSON object) to `stripe.webhooks.constructEvent()`
- Stripe requires the **raw body string/Buffer** for cryptographic signature verification
- Every webhook call will fail signature verification
- **Fix:** Add custom middleware before `strapi::body` that captures raw body for the webhook route, or configure the webhook route to bypass body parsing

### B4: Order list and detail routes are publicly accessible
- **File:** `backend/src/api/order/routes/order.ts`
- `find` and `findOne` actions have `auth: false`
- Any unauthenticated user can call `GET /api/orders` and see every order (customer email, shipping address, items, totals, status)
- **Fix:** Require authentication or add custom controller logic that filters by customer email/session ID

### B5: Three.js not dynamically imported
- **File:** `frontend/src/components/customizer/Preview3D.tsx`
- Three.js (~600KB) is imported synchronously in every product detail page bundle
- Risk of SSR crashes since Three.js requires browser APIs (`window`, `WebGL`)
- **Fix:** Use `next/dynamic` with `{ ssr: false }`:
  ```typescript
  const Preview3D = dynamic(() => import("./Preview3D"), { ssr: false });
  ```

### B6: CORS origins hardcoded to localhost
- **File:** `backend/config/middlewares.ts`
- `origins: ['http://localhost:3000', 'http://localhost:3001']`
- Production frontend URL will be blocked
- **Fix:** Make configurable via environment variable:
  ```typescript
  origins: env('CORS_ORIGINS', 'http://localhost:3000').split(','),
  ```

### B7: Image URL fallback hardcodes localhost:1337
- **File:** `backend/src/api/order/controllers/order.ts:68`
- Relative image URLs get `http://localhost:1337` prepended
- In production, Stripe cannot fetch images from localhost
- **Fix:** Use `BACKEND_URL` or `STRAPI_URL` environment variable

### B8: `customizationPriceAdjustment` taken from client without validation
- **File:** `backend/src/api/order/controllers/order.ts:37`
- Client sends `customizationPriceAdjustment` directly and it's added to the unit price
- Malicious users can send large negative values to reduce or zero out prices
- **Fix:** Validate against the product's `customizationSchema` server-side, compute the adjustment from the schema + user selections

### B9: Dockerfile overwrites production node_modules with build stage deps
- **File:** `backend/Dockerfile`
- Line 21: `RUN npm ci --omit=dev` (production-only)
- Line 24: `COPY --from=build /app/node_modules ./node_modules` (overwrites with full dev+prod)
- **Fix:** Remove the `COPY --from=build /app/node_modules` line

---

## Missing Pages / UX

### U1: No `loading.tsx` files
- No loading states for any route — users see blank screens during server-side data fetching
- Especially noticeable on products page and product detail page (waiting for Strapi API)
- **Fix:** Add `loading.tsx` to `app/`, `app/products/`, `app/products/[slug]/`, `app/cart/`

### U2: No `error.tsx` files
- No error boundaries — if Strapi is down, `fetchAPI` silently returns `{ data: [], meta: {} }`
- Users see "No products yet" instead of an actual error message
- **Fix:** Add `error.tsx` to `app/`, `app/products/`, `app/products/[slug]/`

### U3: No custom 404 page
- No `not-found.tsx` — non-existent product slugs show default Next.js 404
- **Fix:** Add `app/not-found.tsx` with branded styling

### U4: Gallery thumbnails not clickable
- **File:** `frontend/src/components/ProductCustomizer.tsx:73-92`
- Thumbnail images below main product image have no click handler
- Users expect clicking a thumbnail to change the main image

### U5: No breadcrumbs on product detail page
- No way to navigate back to products listing from product detail
- Users must use browser back button or "Products" nav link

### U6: No product search
- Schema.org `SearchAction` is defined in layout but no search UI exists
- **Fix:** Add search bar to Navbar or products page

### U7: No product pagination
- **File:** `frontend/src/app/products/page.tsx`
- `getProducts()` fetches ALL products with no limit
- Slow with 100+ products
- **Fix:** Add pagination with `pagination[page]` and `pagination[pageSize]`

### U8: No product sorting or price filtering
- Only category filtering exists
- No sort by price/name/date, no price range filter

### U9: No order tracking
- No way for customers to look up order status after purchase

---

## Accessibility (12 issues)

### A1: Cart button has no accessible label
- **File:** `frontend/src/components/Navbar.tsx:28-51`
- Screen readers announce as unlabeled button
- **Fix:** Add `aria-label="Shopping cart"`

### A2: Cart drawer lacks dialog semantics
- **File:** `frontend/src/components/CartDrawer.tsx`
- `<aside>` needs `role="dialog"`, `aria-modal="true"`, `aria-label="Shopping cart"`
- Backdrop needs `aria-hidden="true"`

### A3: No focus trap in cart drawer
- Tab key moves focus to elements behind the open drawer
- Essential for modal/drawer patterns

### A4: Close button in cart drawer has no aria-label
- **File:** `frontend/src/components/CartDrawer.tsx:31`

### A5: Quantity +/- buttons have no aria-labels
- Across CartDrawer, CartContent, and ProductCustomizer
- **Fix:** Add `aria-label="Increase quantity"` / `"Decrease quantity"`

### A6: Mobile menu toggle missing `aria-expanded`
- **File:** `frontend/src/components/Navbar.tsx:53-56`
- Has `aria-label="Toggle menu"` but missing `aria-expanded={mobileOpen}`

### A7: ColorField uses `title` instead of `aria-label`
- **File:** `frontend/src/components/customizer/fields/ColorField.tsx:43`
- Screen readers don't reliably read `title` attributes on buttons

### A8: SelectField has no radio group semantics
- **File:** `frontend/src/components/customizer/fields/SelectField.tsx`
- Options are buttons — should have `role="radiogroup"` on container and `role="radio"` + `aria-checked` on each option

### A9: Language mismatch — `lang="en"` but content is German
- **File:** `frontend/src/app/layout.tsx:73`
- `<html lang="en">` but footer and all legal pages are in German
- Screen readers mispronounce German text using English phonetics
- **Fix:** Change to `lang="de"`

### A10: No skip-to-content link
- No skip navigation link for keyboard users to bypass navbar
- **Fix:** Add visually-hidden link at top of layout: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>`

### A11: Image upload button has no accessible label
- **File:** `frontend/src/components/customizer/fields/ImageUploadField.tsx:46`
- Upload trigger is a `<label>` with only an SVG icon, no text or `aria-label`

---

## SEO Gaps

### S1: Canonical URLs are relative
- **File:** `frontend/src/app/products/[slug]/page.tsx:39`
- `alternates: { canonical: '/products/...' }` — Google requires absolute URLs
- **Fix:** Use `${process.env.NEXT_PUBLIC_SITE_URL}/products/${slug}`

### S2: Sitemap omits legal pages
- **File:** `frontend/src/app/sitemap.ts`
- Only includes homepage, products listing, and individual products
- Missing: impressum, datenschutz, AGB, versand, widerrufsbelehrung

### S3: Schema.org hardcodes customstore.com
- **File:** `frontend/src/app/layout.tsx:41-63`
- Organization and WebSite schemas use `https://customstore.com` instead of env var
- **Fix:** Use `NEXT_PUBLIC_SITE_URL`

### S4: No default OG image
- Root layout metadata defines OpenGraph structure but no default `images` array
- Homepage and products listing have no social sharing preview

### S5: No `NEXT_PUBLIC_SITE_URL` environment variable
- Needed for canonical URLs, sitemap, schema.org, and OG tags

---

## Currency / Language Mismatch

### M1: Mixed currency across the application
- `formatPrice()` formats as **USD ($)** with `en-US` locale
- Legal pages reference **Euro (€)** prices (`[4,99 €]`, `[9,99 €]`)
- Shipping page mentions DHL/DPD (European carriers)
- Footer and contact sections are in German
- Backend creates Stripe sessions with `currency: 'usd'`
- **Fix:** Decide US or EU, then make currency/locale configurable via env var:
  - `NEXT_PUBLIC_CURRENCY=EUR`
  - `NEXT_PUBLIC_LOCALE=de-DE`
  - Backend: `currency: process.env.STRIPE_CURRENCY || 'usd'`

---

## Backend Architecture

### BA1: Stripe client re-instantiated on every request
- **File:** `backend/src/api/order/controllers/order.ts:21`
- `require('stripe')(stripeKey)` called per request
- **Fix:** Initialize once at module scope or in a service

### BA2: `require('stripe')` instead of ESM import
- No TypeScript type checking on Stripe API calls
- **Fix:** `import Stripe from 'stripe'; const stripe = new Stripe(key);`

### BA3: No inventory check or decrement during checkout
- Products can be oversold — no stock validation before creating Stripe session
- Inventory never decremented after successful payment

### BA4: Only `checkout.session.completed` webhook event handled
- Missing: `checkout.session.expired`, `charge.refunded`, `payment_intent.payment_failed`
- Expired sessions leave orders in "pending" forever

### BA5: No rate limiting on checkout endpoint
- `POST /api/orders/checkout` has `auth: false` and no rate limiting
- Attackers can flood with unlimited Stripe session creations

### BA6: Product/category routes may require authentication
- Default Strapi router may block public reads with 403
- **Fix:** Either set `auth: false` or configure public role permissions

### BA7: SQLite only — not production-ready
- File-based, no concurrent writes, data lost on container restart
- **Fix:** Switch to PostgreSQL for production deployment

### BA8: No health check endpoint
- No `/health` or `/status` for container orchestration probes
- **Fix:** Add custom route returning 200 OK

---

## Other Improvements

### O1: Unused `@stripe/stripe-js` dependency
- Listed in `package.json` but never imported — checkout redirect uses `window.location.href`
- **Fix:** `npm uninstall @stripe/stripe-js`

### O2: Cart page makes unnecessary API call
- **File:** `frontend/src/app/cart/page.tsx:11-14`
- Fetches all products server-side, passes as `allProducts` prop to `CartContent`
- `CartContent` never uses the prop
- **Fix:** Remove the API call and the prop

### O3: Image upload has no file size limit
- **File:** `frontend/src/components/customizer/fields/ImageUploadField.tsx`
- Large images (10MB+) converted to base64 data URIs, stored in localStorage
- Can easily exceed localStorage's 5-10MB limit causing silent failure
- **Fix:** Add max file size validation (e.g., 2MB) and compress before storing

### O4: `dangerouslySetInnerHTML` without sanitization
- **File:** `frontend/src/components/ProductCustomizer.tsx:178`
- Product descriptions rendered as raw HTML from Strapi
- Malicious HTML/JS from admin panel executes in user's browser
- **Fix:** Sanitize with `DOMPurify` or use a safe rich-text renderer

### O5: `ProductSchema.tsx` has dead code
- `const inStock = product.inventory > 0 || product.inventory === 0;` always `true`
- Variable is never used in the component

### O6: No favicon or custom public assets
- `public/` contains only default Next.js SVGs
- No custom logo, no favicon, no OG image

### O7: `previewModel` field never used
- Product type includes `previewModel` but it's never populated from Strapi or consumed by Preview3D
- Preview3D always renders a hardcoded `RoundedBox` geometry

### O8: Preview3D only responds to hardcoded field IDs
- Only responds to `width`, `height`, `depth`, `color`, `engraving`, `text`
- Products with different field IDs (e.g., `laenge`) won't update the preview

### O9: No revalidation/caching strategy
- `fetchAPI` doesn't use Next.js `next: { revalidate: 60 }` extension
- Every request always hits Strapi fresh
- Product data rarely changes — could be cached for minutes

### O10: Legal pages contain placeholder content
- All five legal pages have bracketed placeholders: `[Vorname Nachname]`, `[Straße]`, `[PLZ Ort]`, `[4,99 €]`, etc.
- Must be filled in before any real deployment

### O11: No product quantity max limit
- **File:** `frontend/src/components/ProductCustomizer.tsx:148`
- No upper bound check against `product.inventory`
- Users can add 999 items when only 5 are in stock
