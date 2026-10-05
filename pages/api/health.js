// Public, unauthenticated health check — no secrets, just booleans + a truncated
// DB error message. Exists so a Supabase/env outage shows up in one curl instead of
// requiring a Vercel-log dig (see standups/2026-07-22.md — /api/board and /api/stats
// were both silently failing with a raw "fetch failed" and nothing surfaced it).
import { configured, sb } from "../../lib/db";

// Real Anthropic probe (2026-08-16 incident: key present, credits at $0, every AI
// route silently degraded while health said ok). A 1-token Haiku call is the only
// cheap check that catches a zero balance — /v1/models still succeeds without credits.
// ponytail: cached per warm instance for 10 min since StatusBanner polls every 60s;
// cold starts re-probe, worst case a few extra ~10-token calls/hour.
const AI_TTL_MS = 10 * 60 * 1000;
let aiCache = { at: 0, status: "skipped" };

async function probeAnthropic() {
  if (Date.now() - aiCache.at < AI_TTL_MS) return aiCache.status;
  let status;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) status = "ok";
    else {
      const body = await r.json().catch(() => ({}));
      status = `error: ${r.status} ${String(body?.error?.message || "").slice(0, 200)}`;
    }
  } catch (e) {
    status = `error: ${String(e.message || e).slice(0, 200)}`;
  }
  aiCache = { at: Date.now(), status };
  return status;
}

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

  const ai = env.anthropic ? await probeAnthropic() : "skipped";

  const ok = env.supabase && env.anthropic && db === "ok" && ai === "ok";
  res.status(ok ? 200 : 503).json({ ok, env, db, ai });
}
