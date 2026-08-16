// Accounts-backed matches. Stored in the user's meta row (messages column = matches array).
import { configured, getRow, upsertRow, metaKey } from "../../lib/db";
import { AGENTS } from "../../lib/agents";
import { ownsUser } from "../../lib/auth";

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });
  const userId = req.method === "GET" ? req.query.userId : req.body?.userId;
  if (!userId) return res.status(400).json({ error: "No userId" });
  if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
  const key = metaKey(userId);

  try {
    const isValid = id => AGENTS[id] || (typeof id === "string" && id.startsWith("twin__"));
    if (req.method === "GET") {
      const row = await getRow(key);
      const matches = (row?.messages || []).filter(isValid);
      return res.status(200).json({ matches });
    }
    if (req.method === "POST") {
      const { agentIds } = req.body; // array — supports merging local matches on login
      const valid = (agentIds || []).filter(isValid);
      if (!valid.length) return res.status(400).json({ error: "No valid agents" });
      const row = await getRow(key);
      const merged = [...new Set([...(row?.messages || []), ...valid])];
      await upsertRow(key, { messages: merged });
      return res.status(200).json({ matches: merged });
    }
    if (req.method === "DELETE") {
      const { agentId } = req.body;
      const row = await getRow(key);
      const next = (row?.messages || []).filter(id => id !== agentId);
      await upsertRow(key, { messages: next });
      return res.status(200).json({ matches: next });
    }
    return res.status(405).end();
  } catch (e) {
    console.error("matches error:", e.message);
    return res.status(500).json({ error: "Failed" });
  }
}
