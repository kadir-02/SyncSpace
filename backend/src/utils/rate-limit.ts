// Small in-memory sliding-window limiter (fine for a single API instance).
const hits = new Map<string, number[]>();

export const consumeRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing forever.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

export const resetRateLimits = () => hits.clear();
