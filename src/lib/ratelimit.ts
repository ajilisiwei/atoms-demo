// Simple in-memory sliding-window rate limiter.
// Good enough for a single-instance demo deployment; swap for Redis/Upstash
// if the app ever runs on more than one instance.

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfterSeconds = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }
  buckets.set(key, [...recent, now]);
  return { ok: true, retryAfterSeconds: 0 };
}
