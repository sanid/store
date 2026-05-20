# Status Quo — Audit Punch List

Tracking fixes from the 2026-05-20 repo audit. Working bottom-up: LOW → MEDIUM → HIGH.

## LOW severity

- [x] **23. Rate-limiter setInterval leak** — single global `unref()`-ed interval.
- [x] **24. Cookie consent re-entry** — listens for `uf:open-consent` event; any "Cookie-Einstellungen" link can dispatch it to re-open the banner pre-populated with current state. (Analytics gating itself is still TODO — see deferred below.)
- [x] **25. Email format validated** — added regex check in `order-lookup`, `cancel-order`, `update-address`.
- [x] **30. Silent `catch {}` → `console.error`** — added in `checkout`, `cancel-order`, `update-address`, `order-lookup`.

### Deferred (need bigger work or user input)
- [ ] **24b. Analytics consent enforcement** — no analytics provider is wired yet, so there's nothing to gate. Revisit when adding analytics.
- [ ] **26. `any` types in backend money file** — broader cleanup; ~30 call sites. Worth a dedicated pass.
- [x] **27. `FABRIC_PRICES` deduplicated** — canonical JSON at `backend/src/api/order/services/fabric-prices.json`; `frontend/scripts/sync-fabric-prices.mjs` copies it into `frontend/src/lib/fabric-prices.json` on `predev`/`prebuild`. Frontend overrides any literal `pricePerMeter` drift with the canonical value at module load (warns server-side). Also fixed latent bug: backend was missing `uf-terra-*` and `uf-decor-*` IDs → would have priced those €0.
- [x] **28. Invoice gapless sequence** — new `invoice-counter` content type with per-year row + atomic `forUpdate` increment in a DB transaction. Webhook mints `RE-{year}-{0000001}` via `strapi.service('api::invoice-counter.invoice-counter').nextInvoiceNumber(year)`. On minting failure the webhook returns 500 so Stripe retries — order is never saved with a fallback/non-gapless number. Still recommend confirming format with accountant.
- [ ] **29. Impressum VAT placeholder** — needs real legal data from user. Cannot fabricate.

## MEDIUM severity

- [x] **10. CORS fail-fast** — `backend/config/middlewares.ts` throws on startup if `NODE_ENV=production` and `CORS_ORIGINS` empty.
- [x] **11. `proxy.ts`** — verified intentional (Next 16 rename; see `frontend/AGENTS.md`). No action needed.
- [x] **12. invoice route** — added 15s `AbortSignal.timeout`, explicit 504 on fetch error, 502 on empty body, email format validation.
- [x] **13. validate-promo** — sanitizes upstream 5xx into generic 502 (no payload leak); added 10s timeout.
- [x] **14. CSP** — split dev/prod in `next.config.ts`. `'unsafe-eval'` and `http://localhost:1337` only included when `NODE_ENV !== 'production'`.
- [x] **15. HTML escaping in emails** — verified: `escapeHtml` is consistently applied to all order/customer data in `services/email.ts`. No action needed.
- [x] **18. Stoffe `<img>`** — added `loading="lazy" decoding="async"`. (Did not switch to `next/image` because textures are 140-300cm-wide fabric photos and the layout depends on raw `<img>` overlay positioning — lazy attrs give 80% of the benefit with no layout risk.)
- [x] **20. Furniture clamp** — `pricePieces` now clamps width/height/depth/columns/rows to realistic furniture bounds (max 400×300×120 cm, 12×10 grid).
- [x] **21. Webhook `shippingAddress`** — no longer overwrites the flat-shape address. Only fills it from Stripe (mapped to flat shape) if the order didn't already have one.
- [x] **22. N+1 inventory** — batched: single `findMany({ documentId: { $in: ids } })` + parallel updates aggregated by productId (handles duplicate line items).

### Deferred
- [x] **16. Dynamic imports** — verified: `CurtainScene`, `FurnitureScene`, and `Preview3D` are *already* wrapped in `next/dynamic({ ssr: false })` by their respective configurator/customizer parents. Audit was outdated. No action needed.
- [x] **17. `computeVertexNormals` throttling** — recomputes every 2nd frame on desktop, every 3rd on coarse-pointer (touch) devices. Skip detected via `matchMedia("(pointer: coarse)")`. Cloth motion smooths the 1-frame lag in lighting. Verified rendering still correct in preview.
- [ ] **19. Stoffe SSR** — moving filter/grid to server requires refactoring useState filters into URL params. Defer.

## HIGH severity

- [x] **1. Shipping math** — `getShippingRate` now receives `subtotal - discountAmount`; 100% promos no longer yield free items + free shipping.
- [x] **2. Zero-priced cart items rejected** — `createPaymentIntent` returns 400 if any `unitAmount` is non-positive, with a server warn that records `productId`/`fabricId` for diagnostics.
- [x] **3. Promo `maxUses` atomic** — webhook now uses Knex `where(...).whereRaw('used_count < max_uses')...increment(...)`. Two concurrent webhooks can't both cross the limit.
- [x] **4. Inventory atomic** — webhook uses Knex `where inventory >= qty ... decrement`. Concurrent decrements can't oversell. Shortfalls are logged with `INVENTORY_SHORTFALL` tag for manual review.
- [x] **5. Unauth endpoints rate-limited** — regex extended to cover `lookup`, `cancel`, `address`, `invoice`, `production-pdf` plus the existing two.
- [x] **6. Production PDF token** — rotated after every successful download (single-use). Response carries `Referrer-Policy: no-referrer` + `Cache-Control: no-store, private` so the token can't leak via referer header or caches.
- [x] **7. DevGate moved server-side** — passcode now lives in `DEV_GATE_PASSCODE` env var (never bundled). New `/api/dev-gate` POST sets httpOnly cookie via constant-time compare. `proxy.ts` redirects to `/dev-gate` when the cookie is missing. Client-side `DevGate.tsx` deleted. Gate is only enabled when the env var is set.
- [x] **9. `previewImage` hardened** — only `image/png`, `image/jpeg`, `image/webp` data URLs accepted (no SVG → no inline-script vector); size cap lowered from 1.5MB → 250KB.

### Deferred (needs infra)
- [ ] **8. Rate-limiter Redis backend** — fix requires `REDIS_URL` provisioning + `rate-limiter-flexible` (or similar). Until then, the in-memory limiter is correct for a single-instance deployment (`output: "standalone"` + single Strapi node); becomes incorrect the moment we horizontally scale either tier. Re-open when planning multi-instance.
