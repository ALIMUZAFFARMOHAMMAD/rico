// CEO task board — the founder assigns work here and the autonomous team reads it.
// Persisted in Supabase (conversations row keyed "board::main", board JSON in traits).
// Founder-only: gated by STATS_KEY (same key as /api/stats). Reads + writes both gated.
//
// GET  /api/board?key=KEY                          -> { ok, tasks, team }
// POST /api/board?key=KEY  { action, ... }         -> { ok, tasks }
//   actions: add{title,assignee,status} · move{id,status} · assign{id,assignee} ·
//            edit{id,title} · delete{id} · seed
import { randomUUID } from "crypto";
import { configured, getRow, upsertRow } from "../../lib/db";
import { safeKeyEq } from "../../lib/keys";

const KEY = "board::main";
const COLS = ["todo", "inprogress", "done"];
const TEAM = ["CEO", "Atlas", "Sage", "Nova", "Forge", "Sentry", "Pulse", "Beacon", "Echo", "Reel", "Keeper"];

const SEED = [
  // done
  { title: "Proactive check-ins — 'Rico texts you first'", assignee: "Forge", status: "done" },
  { title: "Living-memory panel — 'what your friends remember'", assignee: "Forge", status: "done" },
  { title: "Activation + Flagship-impact instrumentation", assignee: "Pulse", status: "done" },
  { title: "'Rico missed you' lapse re-engagement", assignee: "Forge", status: "done" },
  { title: "Signup-source attribution (by-channel funnel)", assignee: "Forge", status: "done" },
  // in progress
  { title: "Voice-note check-ins (ElevenLabs)", assignee: "Reel", status: "inprogress" },
  // todo
  { title: "Plan gating + Stripe (test willingness-to-pay)", assignee: "CEO", status: "todo" },
  { title: "Lock 3 named testimonials (get consent)", assignee: "CEO", status: "todo" },
  { title: "Start 30-day GTM push (?src= tagged links + ambassadors)", assignee: "CEO", status: "todo" },
  { title: "Honest-AI / privacy badge on landing", assignee: "Forge", status: "todo" },
  { title: "First week of social posts (ready to publish)", assignee: "Echo", status: "todo" },
];

const mkTask = (t) => ({
  id: "t_" + randomUUID(),
  title: String(t.title).slice(0, 200),
  assignee: TEAM.includes(t.assignee) ? t.assignee : "Atlas",
  status: COLS.includes(t.status) ? t.status : "todo",
  createdAt: new Date().toISOString(),
  by: t.by || "ceo",
});

function gated(req) {
  // Constant-time compare (lib/keys). BOARD_KEY is the founder board key; STATS_KEY also works.
  return safeKeyEq(req.query.key, process.env.BOARD_KEY) || safeKeyEq(req.query.key, process.env.STATS_KEY);
}

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "not configured" });
  if (!gated(req)) return res.status(401).json({ error: "unauthorized" });
  try {
    const row = await getRow(KEY);
    let tasks = (row && row.traits && row.traits.board && row.traits.board.tasks) || [];

    if (req.method === "GET") return res.status(200).json({ ok: true, tasks, team: TEAM });

    if (req.method === "POST") {
      const { action, id, title, assignee, status } = req.body || {};
      if (action === "add" && title) {
        tasks = [mkTask({ title, assignee, status }), ...tasks];
      } else if (action === "move" && id && COLS.includes(status)) {
        tasks = tasks.map(t => (t.id === id ? { ...t, status } : t));
      } else if (action === "assign" && id && TEAM.includes(assignee)) {
        tasks = tasks.map(t => (t.id === id ? { ...t, assignee } : t));
      } else if (action === "edit" && id && title) {
        tasks = tasks.map(t => (t.id === id ? { ...t, title: String(title).slice(0, 200) } : t));
      } else if (action === "delete" && id) {
        tasks = tasks.filter(t => t.id !== id);
      } else if (action === "seed") {
        if (!tasks.length) tasks = SEED.map(mkTask);
      } else {
        return res.status(400).json({ error: "bad action" });
      }
      await upsertRow(KEY, { traits: { board: { tasks } } });
      return res.status(200).json({ ok: true, tasks });
    }
    return res.status(405).end();
  } catch (e) {
    console.error("board error:", e.message);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
