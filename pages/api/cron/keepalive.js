// Root-cause fix for the recurring Supabase outage (flagged 2026-07-22, resolved
// 2026-08-16, recurred 2026-09-04): Supabase free-tier projects auto-pause after
// 7 days with zero database activity. Since GTM traffic hasn't started, organic
// usage alone isn't reliable enough to keep the timer from lapsing. A daily
// Vercel Cron hit here (see vercel.json) resets the 7-day clock before it can
// expire, with margin to spare.
import { configured, sb } from "../../../lib/db";
import { generateDailySocial } from "../../../lib/social-daily";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: "Unauthorized" });
  if (!configured()) return res.status(503).json({ ok: false, error: "Database not configured" });
  try {
    await sb("/conversations?select=user_id&limit=1");
    const social = await generateDailySocial();
    res.status(200).json({ ok: true, pinged_at: new Date().toISOString(), social });
  } catch (e) {
    // Non-200 so a failed ping shows up as a failed invocation in Vercel's cron
    // logs — a free early warning if the project pauses (or breaks) again.
    console.error("Daily Social/keepalive failed");
    res.status(503).json({ ok: false, error: "Daily Social could not complete. Retry this scheduled job." });
  }
}

