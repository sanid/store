/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Per-instance only: on a multi-instance deployment each instance keeps its own
 * counters, so the effective limit is `limit × instances`. That is acceptable
 * as a first line of defence in front of a paid AI endpoint; move to Redis or
 * Vercel KV if the limit needs to be exact.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the oldest hit in the window expires. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Opportunistic sweep so abandoned keys don't grow the map without bound.
  if (now - lastSweep > windowMs) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t > windowMs)) buckets.delete(k);
    }
    lastSweep = now;
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfter: 0 };
}

/** Best-effort client IP for rate-limit keying. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
