// Memory Vault — see, prune, or wipe what each agent remembers about you.
import { configured, getUserRows, deleteRow, upsertRow, getRow, memKey, parseKey } from "../../lib/db";
import { AGENTS } from "../../lib/agents";

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });

  if (req.method === "GET") {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "No userId" });
    try {
      const rows = await getUserRows(userId);
      const agents = rows
        .map(r => ({ r, k: parseKey(r.user_id) }))
        .filter(({ k }) => k.kind !== "meta")
        .map(({ r, k }) => ({
          agentId: k.agentId,
          name: AGENTS[k.agentId]?.name || k.agentId,
          msgCount: r.msg_count || (r.messages || []).length,
          traits: r.traits || {},
          voiceNotes: (r.voice_notes || []).filter(n => typeof n === "string"),
          updatedAt: r.updated_at,
        }));
      return res.status(200).json({ agents });
    } catch (e) {
      console.error("vault GET error:", e.message);
      return res.status(500).json({ error: "Failed" });
    }
  }

  if (req.method === "POST") {
    const { action, userId, agentId, index } = req.body || {};
    if (!userId) return res.status(400).json({ error: "No userId" });
    try {
      if (action === "forgetAgent" && AGENTS[agentId]) {
        await deleteRow(memKey(userId, agentId));
        return res.status(200).json({ ok: true });
      }
      if (action === "deleteNote" && AGENTS[agentId] && Number.isInteger(index)) {
        const key = memKey(userId, agentId);
        const row = await getRow(key);
        if (row) {
          const notes = (row.voice_notes || []).filter((_, i) => i !== index);
          await upsertRow(key, { voice_notes: notes });
        }
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: "Bad action" });
    } catch (e) {
      console.error("vault POST error:", e.message);
      return res.status(500).json({ error: "Failed" });
    }
  }

  return res.status(405).end();
}
