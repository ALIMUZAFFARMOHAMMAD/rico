import { getAuth } from "@clerk/nextjs/server";
import { createHash } from "crypto";
import { scaleEnabled, scaleRpc } from "./scale";

const hits = new Map();
const MAX_BUCKETS = 10000;
let nextCleanup = 0;

// Shared database-clock limits in scale mode. Local mode never drops active
// buckets to admit a new identity when its bounded map fills up.
export async function rateLimited(req, { limit = 20, windowMs = 60000 } = {}) {
  let userId;
  try { userId = getAuth(req).userId; } catch { /* anonymous request */ }
  const ip = String(req.headers?.[process.env.VERCEL ? "x-vercel-forwarded-for" : "x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const route = String(req.url || "unknown").split("?")[0];
  const identity = userId ? "user:" + userId : "ip:" + ip;
  const key = createHash("sha256").update(route + ":" + windowMs + ":" + identity).digest("hex");
  if (scaleEnabled()) {
    try { return !await scaleRpc("rate_limit", { p_key: key, p_limit: limit, p_window_ms: windowMs }); }
    catch { console.error("Shared rate limiter unavailable; request denied"); return true; }
  }
  const now = Date.now();
  if (now >= nextCleanup) {
    for (const [k, record] of hits) if (record.expires <= now) hits.delete(k);
    nextCleanup = now + 10000;
  }
  let record = hits.get(key);
  if (!record || record.expires <= now) {
    if (!record && hits.size >= MAX_BUCKETS) return true;
    record = { count: 0, expires: now + windowMs };
    hits.set(key, record);
  }
  record.count++;
  return record.count > limit;
}
