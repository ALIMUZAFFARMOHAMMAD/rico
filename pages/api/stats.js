// Founder-only retention dashboard (JSON). Gated by ?key=STATS_KEY.
// Computes signups + retention from the activity stamps in users' meta rows.
import { sb, configured } from "../../lib/db";
import { safeKeyEq } from "../../lib/keys";
import { computeStreak } from "./checkin";

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "not configured" });
  if (!safeKeyEq(req.query.key, process.env.STATS_KEY)) return res.status(401).json({ error: "unauthorized" });
  try {
    const rows = await sb(`/conversations?user_id=like.*::meta&select=user_id,traits`);
    const DAY = 864e5, now = Date.now();
    let total = 0, returned = 0, d7 = 0, active7 = 0, active1 = 0;
    let activated = 0, activatedFast = 0, ckShown = 0, ckReplied = 0, ckVoice = 0;
    let ckMissedShown = 0, ckMissedReplied = 0, spotlightShown = 0;
    const cohort = {};
    const bySource = {}; // channel -> { signups, activated, returned }
    // Retention-lever attribution: for each of the built levers, how many users saw it
    // vs. how many of THOSE users returned/reached D7 — lets us rank levers by correlation
    // instead of guessing which of the 5 built surfaces actually drives retention.
    const levers = {
      checkin: { users: 0, returned: 0, d7: 0 },
      missed_you: { users: 0, returned: 0, d7: 0 },
      spotlight: { users: 0, returned: 0, d7: 0 },
      streak_2plus: { users: 0, returned: 0, d7: 0 },
    };
    for (const r of (rows || [])) {
      const a = r.traits && r.traits.activity;
      if (!a || !a.first) continue;
      total++;
      const days = a.days || [];
      const first = new Date(a.first).getTime(), last = new Date(a.last).getTime();
      const didReturn = days.length >= 2;
      const didD7 = last - first >= 6 * DAY;
      if (didReturn) returned++;
      if (didD7) d7++;                               // active again ~a week+ after first
      if (now - last <= 1 * DAY) active1++;          // active in last 24h
      if (now - last <= 7 * DAY) active7++;          // active in last 7 days
      if (a.activated) activated++;                  // completed first real conversation
      if (a.activatedFast) activatedFast++;          // ...within 24h of signup
      const ck = r.traits && r.traits.stats && r.traits.stats.checkin;
      if (ck) {
        ckShown += ck.shown || 0; ckReplied += ck.replied || 0; ckVoice += ck.voice || 0;
        ckMissedShown += ck.missedShown || 0; ckMissedReplied += ck.missedReplied || 0;
        const tally = (lever) => { lever.users++; if (didReturn) lever.returned++; if (didD7) lever.d7++; };
        if (ck.shown) tally(levers.checkin);
        if (ck.missedShown) tally(levers.missed_you);
        if (computeStreak(ck.replyDays) >= 2) tally(levers.streak_2plus);
      }
      const sp = r.traits && r.traits.stats && r.traits.stats.spotlight;
      if (sp && sp.shown) { spotlightShown += sp.shown; levers.spotlight.users++; if (didReturn) levers.spotlight.returned++; if (didD7) levers.spotlight.d7++; }
      const wk = new Date(a.first).toISOString().slice(0, 10);
      cohort[wk] = (cohort[wk] || 0) + 1;
      // attribution by first-touch source (defaults to "direct")
      const src = a.source || "direct";
      const b = bySource[src] || { signups: 0, activated: 0, returned: 0 };
      b.signups++; if (a.activated) b.activated++; if (didReturn) b.returned++;
      bySource[src] = b;
    }
    for (const k of Object.keys(levers)) {
      const l = levers[k];
      l.returned_pct = l.users ? Math.round((l.returned / l.users) * 100) : 0;
      l.d7_pct = l.users ? Math.round((l.d7 / l.users) * 100) : 0;
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
        missed_you_shown: ckMissedShown,
        missed_you_replied: ckMissedReplied,
        missed_you_reply_rate_pct: ckMissedShown ? Math.round((ckMissedReplied / ckMissedShown) * 100) : 0,
      },
      memory_spotlight: { shown: spotlightShown },
      // Rank the 5 built retention levers by how the users who saw each one perform vs. the
      // overall base (retention_rate_pct / retained_7day above) — proposed by Nova 2026-07-13.
      retention_by_lever: levers,
      signups_by_day: cohort,
      // GTM attribution — signups/activation/returned per first-touch channel (?src=/?ref=/utm_source)
      by_source: bySource,
      note: "retention_rate_pct = % who returned on 2+ days (aim >=25%). activation_rate_pct = % who had a first real conversation (aim >=60%). proactive_checkin.reply_rate_pct = how often Flagship #1 earns a reply. retention_by_lever = per-lever users/returned_pct/d7_pct, compare each lever's returned_pct/d7_pct against the overall retention_rate_pct/retained_7day above to see which lever actually correlates with retention. by_source = funnel per channel; tag links with ?src=reddit etc. and double down on the best.",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
