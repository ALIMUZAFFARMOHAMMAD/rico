// Founder-only retention dashboard (JSON). Gated by ?key=STATS_KEY.
// Computes signups + retention from the activity stamps in users' meta rows.
import { sb, configured } from "../../lib/db";

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "not configured" });
  if (!process.env.STATS_KEY || (req.query.key || "") !== process.env.STATS_KEY) return res.status(401).json({ error: "unauthorized" });
  try {
    const rows = await sb(`/conversations?user_id=like.*::meta&select=user_id,traits`);
    const DAY = 864e5, now = Date.now();
    let total = 0, returned = 0, d7 = 0, active7 = 0, active1 = 0;
    const cohort = {};
    for (const r of (rows || [])) {
      const a = r.traits && r.traits.activity;
      if (!a || !a.first) continue;
      total++;
      const days = a.days || [];
      const first = new Date(a.first).getTime(), last = new Date(a.last).getTime();
      if (days.length >= 2) returned++;
      if (last - first >= 6 * DAY) d7++;           // active again ~a week+ after first
      if (now - last <= 1 * DAY) active1++;          // active in last 24h
      if (now - last <= 7 * DAY) active7++;          // active in last 7 days
      const wk = new Date(a.first).toISOString().slice(0, 10);
      cohort[wk] = (cohort[wk] || 0) + 1;
    }
    return res.status(200).json({
      total_signups: total,
      returned_2plus_days: returned,
      retention_rate_pct: total ? Math.round((returned / total) * 100) : 0,
      retained_7day: d7,
      active_last_24h: active1,
      active_last_7d: active7,
      signups_by_day: cohort,
      note: "retention_rate_pct = % of users who came back on 2+ distinct days. Aim for >=25%.",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
