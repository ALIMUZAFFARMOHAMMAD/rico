// Founder-only retention dashboard (JSON). Gated by ?key=STATS_KEY.
// Computes signups + retention from the activity stamps in users' meta rows.
import { sb, configured } from "../../lib/db";
import { safeKeyEq } from "../../lib/keys";

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "not configured" });
  if (!safeKeyEq(req.query.key, process.env.STATS_KEY)) return res.status(401).json({ error: "unauthorized" });
  try {
    const rows = await sb(`/conversations?user_id=like.*::meta&select=user_id,traits`);
    const DAY = 864e5, now = Date.now();
    let total = 0, returned = 0, d7 = 0, active7 = 0, active1 = 0;
    let activated = 0, activatedFast = 0, ckShown = 0, ckReplied = 0, ckVoice = 0;
    const cohort = {};
    const bySource = {}; // channel -> { signups, activated, returned }
    for (const r of (rows || [])) {
      const a = r.traits && r.traits.activity;
      if (!a || !a.first) continue;
      total++;
      const days = a.days || [];
      const first = new Date(a.first).getTime(), last = new Date(a.last).getTime();
      const didReturn = days.length >= 2;
      if (didReturn) returned++;
      if (last - first >= 6 * DAY) d7++;           // active again ~a week+ after first
      if (now - last <= 1 * DAY) active1++;          // active in last 24h
      if (now - last <= 7 * DAY) active7++;          // active in last 7 days
      if (a.activated) activated++;                  // completed first real conversation
      if (a.activatedFast) activatedFast++;          // ...within 24h of signup
      const ck = r.traits && r.traits.stats && r.traits.stats.checkin;
      if (ck) { ckShown += ck.shown || 0; ckReplied += ck.replied || 0; ckVoice += ck.voice || 0; }
      const wk = new Date(a.first).toISOString().slice(0, 10);
      cohort[wk] = (cohort[wk] || 0) + 1;
      // attribution by first-touch source (defaults to "direct")
      const src = a.source || "direct";
      const b = bySource[src] || { signups: 0, activated: 0, returned: 0 };
      b.signups++; if (a.activated) b.activated++; if (didReturn) b.returned++;
      bySource[src] = b;
    }
    return res.status(200).json({
      total_signups: total,
      returned_2plus_days: returned,
      retention_rate_pct: total ? Math.round((returned / total) * 100) : 0,
      retained_7day: d7,
      active_last_24h: active1,
      active_last_7d: active7,
      // Activation — North Star leading indicator (target >=60% within 24h)
      activated_users: activated,
      activation_rate_pct: total ? Math.round((activated / total) * 100) : 0,
      activation_within_24h_pct: total ? Math.round((activatedFast / total) * 100) : 0,
      // Flagship #1 "Rico texts you first" — does the proactive check-in earn replies?
      proactive_checkin: {
        shown: ckShown,
        replied: ckReplied,
        voice_plays: ckVoice,
        reply_rate_pct: ckShown ? Math.round((ckReplied / ckShown) * 100) : 0,
      },
      signups_by_day: cohort,
      // GTM attribution — signups/activation/returned per first-touch channel (?src=/?ref=/utm_source)
      by_source: bySource,
      note: "retention_rate_pct = % who returned on 2+ days (aim >=25%). activation_rate_pct = % who had a first real conversation (aim >=60%). proactive_checkin.reply_rate_pct = how often Flagship #1 earns a reply. by_source = funnel per channel; tag links with ?src=reddit etc. and double down on the best.",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
