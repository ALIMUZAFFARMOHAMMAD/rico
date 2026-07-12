// Lightweight retention + activity tracking — stamps each signed-in user's
// first-seen, last-seen, distinct active days, and counters for games & voice
// calls in their meta row. No third-party analytics. Feeds the profile dashboard.
import { configured, getRow, upsertRow, metaKey } from "../../lib/db";
import { ownsUser } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!configured()) return res.status(200).json({ ok: false });
  const { userId, event, game, seconds, source } = req.body || {};
  if (!userId) return res.status(400).json({ error: "no userId" });
  if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
  try {
    const key = metaKey(userId);
    const row = await getRow(key);
    const traits = (row && row.traits) || {};
    const now = new Date();
    const DAY = 864e5;
    const today = now.toISOString().slice(0, 10);

    // always refresh the activity stamp
    const a = traits.activity || { first: null, last: null, days: [] };
    if (!a.first) a.first = now.toISOString();
    a.last = now.toISOString();
    if (!a.days.includes(today)) a.days = [...a.days, today].slice(-90);
    // First-touch signup source — set once, never overwritten (for by-channel attribution).
    if (source && !a.source) a.source = String(source).slice(0, 40);

    // counters for the dashboard's voice & games scores
    const stats = traits.stats || {};
    if (event === "activation") {
      // North-Star leading indicator: user completed their first real conversation.
      // Stamp once; record whether it happened within 24h of first-seen ("fast" activation).
      if (!a.activated) {
        a.activated = true;
        a.activatedAt = now.toISOString();
        a.activatedFast = (now.getTime() - new Date(a.first).getTime()) <= DAY;
      }
    } else if (event === "checkin_shown" || event === "checkin_reply" || event === "checkin_voice") {
      // Proactive check-in (Flagship #1) impact: shown vs. reply vs. voice-note play.
      const c = stats.checkin || { shown: 0, replied: 0, voice: 0 };
      if (event === "checkin_shown") c.shown = (c.shown || 0) + 1;
      else if (event === "checkin_reply") {
        c.replied = (c.replied || 0) + 1;
        // Distinct reply-days (not just a total), same day-array pattern as `a.days` above —
        // lets the streak counter be derived without a new data model.
        const days = c.replyDays || [];
        if (!days.includes(today)) c.replyDays = [...days, today].slice(-30);
      }
      else c.voice = (c.voice || 0) + 1;
      c.last = now.toISOString();
      stats.checkin = c;
    } else if (event === "game") {
      const gs = stats.games || { total: 0, byKey: {} };
      gs.total = (gs.total || 0) + 1;
      if (game) { gs.byKey = gs.byKey || {}; gs.byKey[game] = (gs.byKey[game] || 0) + 1; }
      gs.last = now.toISOString();
      stats.games = gs;
    } else if (event === "voice") {
      const vs = stats.voice || { calls: 0, seconds: 0 };
      vs.calls = (vs.calls || 0) + 1;
      vs.seconds = (vs.seconds || 0) + Math.max(0, Math.round(seconds || 0));
      vs.last = now.toISOString();
      stats.voice = vs;
    }

    await upsertRow(key, { traits: { ...traits, activity: a, stats } });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
