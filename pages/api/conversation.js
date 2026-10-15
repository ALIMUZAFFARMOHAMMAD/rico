// Per-user, per-agent conversation memory (Phase 1: agent-namespaced keys, see lib/db.js).
import { configured, getRow, upsertRow, memKey, getUserRows, parseKey } from "../../lib/db";
import { ownsUser } from "../../lib/auth";
import { messageText, validConversation } from "../../lib/conversation-view";

const EMPTY = { messages: [], traits: { O: 0, C: 0, E: 0, A: 0, N: 0 }, riasec: "", msgCount: 0 };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!configured()) return res.status(500).json({ error: "Supabase not configured" });

  if (req.method === "GET") {
    const { userId, agent } = req.query;
    if (typeof userId !== "string" || (agent !== undefined && (typeof agent !== "string" || !/^[\w-]{1,120}$/.test(agent)))) return res.status(400).json({ error: "Invalid conversation" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    try {
      if (req.query.summary === "1") {
        const rows = await getUserRows(userId);
        const seen = new Set();
        const conversations = rows.sort((a,b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0)).filter(row => {
          const key = parseKey(row.user_id);
          if (key.userId !== userId || !["tony", "agent"].includes(key.kind) || seen.has(key.agentId)) return false;
          seen.add(key.agentId); return true;
        }).map(row => {
          const last = [...(row.messages || [])].reverse().find(message => messageText(message?.content));
          return { agentId: parseKey(row.user_id).agentId, preview: messageText(last?.content).slice(0, 140), updatedAt: row.updated_at || null };
        });
        return res.status(200).json({ conversations });
      }
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
      return res.status(503).json({ error: "Your saved conversation is temporarily unavailable. Please try again." });
    }
  }

  if (req.method === "POST") {
    const { userId, agent, messages, traits, riasec, msgCount } = req.body || {};
    if (typeof userId !== "string" || (agent !== undefined && (typeof agent !== "string" || !/^[\w-]{1,120}$/.test(agent))) || !validConversation(req.body || {})) return res.status(400).json({ error: "Invalid conversation data" });
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
      return res.status(503).json({ error: "We couldn’t save your conversation. Please retry." });
    }
  }

  return res.status(405).end();
}

