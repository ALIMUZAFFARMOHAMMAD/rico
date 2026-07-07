// Personality dashboard data — aggregates a user's Big-Five (OCEAN) traits and
// their chat / voice / games activity across ALL of their conversations into one
// profile. Read-only; computed live from the existing memory rows (no new tables).
import { configured, getUserRows, parseKey } from "../../lib/db";
import { getAgent } from "../../lib/agents";
import { ownsUser } from "../../lib/auth";

export default async function handler(req, res) {
  if (!configured()) return res.status(200).json({ ok: false });
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "no userId" });
  if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
  try {
    const rows = await getUserRows(userId);
    const KEYS = ["O", "C", "E", "A", "N"];
    const acc = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    let wsum = 0, totalMessages = 0, riasec = "", bestRi = 0, meta = null;
    const friends = [];

    for (const r of rows || []) {
      const k = parseKey(r.user_id);
      if (k.kind === "meta") { meta = r; continue; }
      const t = r.traits || {};
      const mc = r.msg_count || 0;
      totalMessages += mc;
      const has = KEYS.some(x => typeof t[x] === "number" && t[x] > 0);
      if (has) {
        const w = Math.max(1, mc);
        wsum += w;
        for (const x of KEYS) acc[x] += (t[x] || 0) * w;
      }
      if (r.riasec && r.riasec.length > bestRi) { riasec = r.riasec; bestRi = r.riasec.length; }
      if (mc > 0) { const a = getAgent(k.agentId); friends.push({ id: k.agentId, name: a.name, emoji: a.emoji, msgCount: mc }); }
    }

    const ocean = wsum ? Object.fromEntries(KEYS.map(x => [x, Math.round(acc[x] / wsum)])) : null;
    friends.sort((a, b) => b.msgCount - a.msgCount);

    const mstats = (meta && meta.traits && meta.traits.stats) || {};
    const activity = (meta && meta.traits && meta.traits.activity) || null;
    const g = mstats.games || { total: 0, byKey: {} };
    const v = mstats.voice || { calls: 0, seconds: 0 };

    return res.status(200).json({
      ok: true,
      ocean,
      riasec,
      chat: { totalMessages, friendCount: friends.length, friends: friends.slice(0, 6) },
      voice: { calls: v.calls || 0, minutes: Math.round((v.seconds || 0) / 60) },
      games: { total: g.total || 0, byKey: g.byKey || {} },
      activity: activity ? { days: (activity.days || []).length, first: activity.first, last: activity.last } : { days: 0 },
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
