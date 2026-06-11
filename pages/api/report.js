// Safety report pipeline v1 — reports append to the user's meta row
// (voice_notes column = reports array) for review. Proper table in supabase-phase1.sql.
import { configured, getRow, upsertRow, metaKey } from "../../lib/db";
import { AGENTS } from "../../lib/agents";

const REASONS = ["wrong", "harmful", "uncomfortable"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: "Not configured" });
  const { userId, agentId, message, reason } = req.body || {};
  const validAgent = AGENTS[agentId] || (typeof agentId === "string" && agentId.startsWith("twin__"));
  if (!validAgent || !REASONS.includes(reason)) return res.status(400).json({ error: "Bad report" });

  const key = metaKey(userId || "anon");
  try {
    const row = await getRow(key);
    const reports = [...(row?.voice_notes || []), {
      type: "report",
      agentId,
      reason,
      message: String(message || "").slice(0, 400),
      at: new Date().toISOString(),
    }].slice(-100);
    await upsertRow(key, { voice_notes: reports });
    console.log(`REPORT: agent=${agentId} reason=${reason}`);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("report error:", e.message);
    return res.status(500).json({ error: "Failed" });
  }
}
