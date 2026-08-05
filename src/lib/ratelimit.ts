// Simple in-memory sliding-window rate limiter.
//
// Deployment assumptions (documented trade-offs for a single-instance demo):
// - Keys derived from x-forwarded-for are only meaningful behind a trusted
//   reverse proxy that overwrites the header (Vercel does). On a bare Node
//   host the header is client-controlled — swap the key source for the
//   socket address or a platform-provided client IP before relying on it.
// - Multi-instance deployments need a shared store (Redis/Upstash) instead.

const buckets = new Map<string, number[]>();

// Bounds memory if an attacker cycles unique keys: once the map grows past
// this size, expired buckets are swept on the next check.
const SWEEP_THRESHOLD = 10_000;

function sweep(now: number, windowMs: number): void {
  if (buckets.size < SWEEP_THRESHOLD) return;
  for (const [key, timestamps] of buckets) {
    const alive = timestamps.filter((t) => now - t < windowMs);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now, windowMs);
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfterSeconds = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }
  buckets.set(key, [...recent, now]);
  return { ok: true, retryAfterSeconds: 0 };
}
