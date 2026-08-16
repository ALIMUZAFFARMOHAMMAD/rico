// Public, unauthenticated health check — no secrets, just booleans + a truncated
// DB error message. Exists so a Supabase/env outage shows up in one curl instead of
// requiring a Vercel-log dig (see standups/2026-07-22.md — /api/board and /api/stats
// were both silently failing with a raw "fetch failed" and nothing surfaced it).
import { configured, sb } from "../../lib/db";

export default async function handler(req, res) {
  const env = {
    supabase: configured(),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  };

  let db = "skipped";
  if (env.supabase) {
    try {
      await sb("/conversations?select=user_id&limit=1");
      db = "ok";
    } catch (e) {
      db = `error: ${String(e.message || e).slice(0, 200)}`;
    }
  }

  const ok = env.supabase && env.anthropic && db === "ok";
  res.status(ok ? 200 : 503).json({ ok, env, db });
}
