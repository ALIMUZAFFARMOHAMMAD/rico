// ponytail: in-memory per-instance limiter for the unauthenticated, credit-spending
// endpoints (tony, tutor, twin, tts, etc — see standups/SECURITY.md §2). Resets on
// cold start and doesn't share across concurrent instances, so it won't stop a
// determined multi-region abuser — it does stop the common case (one client
// hammering a route). Upgrade path if that ceiling is ever hit: @upstash/ratelimit
// (needs a free Upstash Redis + env vars, already scoped in SECURITY.md).
const hits = new Map();

export function rateLimited(req, { limit = 20, windowMs = 60_000 } = {}) {
  if (hits.size > 5000) hits.clear(); // crude cap so this can't leak memory forever
  const key = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now - rec.start > windowMs) { hits.set(key, { start: now, count: 1 }); return false; }
  rec.count++;
  return rec.count > limit;
}
