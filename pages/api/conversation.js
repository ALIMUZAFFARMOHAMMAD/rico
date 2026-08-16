// Per-user, per-agent conversation memory (Phase 1: agent-namespaced keys, see lib/db.js).
import { configured, getRow, upsertRow, memKey } from "../../lib/db";
import { ownsUser } from "../../lib/auth";

const EMPTY = { messages: [], traits: { O: 0, C: 0, E: 0, A: 0, N: 0 }, riasec: "", msgCount: 0 };

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Supabase not configured" });

  if (req.method === "GET") {
    const { userId, agent } = req.query;
    if (!userId) return res.status(200).json(EMPTY);
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    try {
      const row = await getRow(memKey(userId, agent));
      if (!row) return res.status(200).json(EMPTY);
      return res.status(200).json({
        messages: row.messages || [],
        traits: row.traits || EMPTY.traits,
        riasec: row.riasec || "",
        msgCount: row.msg_count || 0,
        voiceNotes: row.voice_notes || [],
      });
    } catch (e) {
      console.error("GET conversation error:", e.message);
      return res.status(200).json(EMPTY);
    }
  }

  if (req.method === "POST") {
    const { userId, agent, messages, traits, riasec, msgCount } = req.body;
    if (!userId) return res.status(400).json({ error: "No userId" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    try {
      const key = memKey(userId, agent);
      // Preserve non-chat trait fields (e.g. the résumé Tony stores) — the incoming
      // `traits` is only the OCEAN scores, so merge over the existing traits instead
      // of replacing the whole column (which used to wipe the saved résumé).
      const existing = await getRow(key);
      const mergedTraits = { ...((existing && existing.traits) || {}), ...(traits || {}) };
      await upsertRow(key, { messages, traits: mergedTraits, riasec, msg_count: msgCount });
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("POST conversation error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
