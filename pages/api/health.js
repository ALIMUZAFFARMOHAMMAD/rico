import { configured, sb } from "../../lib/db";

// Public health polling must never generate paid AI requests. Provider readiness
// is unknown until an actual operation runs; configuration is not a quota check.
let cache = null;
let pending = null;
async function readHealth() {
  const env = { supabase: configured(), anthropic: !!process.env.ANTHROPIC_API_KEY, elevenlabs: !!process.env.ELEVENLABS_API_KEY };
  let db = "skipped";
  if (env.supabase) {
    try { await sb("/conversations?select=user_id&limit=1"); db = "ok"; }
    catch { db = "unavailable"; }
  }
  return { ok: env.supabase && env.anthropic && db === "ok", env, db, ai: env.anthropic ? "configured-unverified" : "not-configured", sharedStorage: process.env.SCALE_STORAGE_ENABLED === "true" };
}
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
  if (!cache || cache.expires <= Date.now()) {
    if (!pending) pending = readHealth().then(data => { cache = { data, expires: Date.now() + 30000 }; }).finally(() => { pending = null; });
    await pending;
  }
  return res.status(cache.data.ok ? 200 : 503).json(cache.data);
}
