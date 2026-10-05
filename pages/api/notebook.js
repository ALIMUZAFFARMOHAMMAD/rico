// Rough Notebook — Rico learns your handwriting, reads photos of your handwritten notes,
// remembers them, and answers questions from them. One row per user (notebookKey):
//   traits.handwriting = { profile, readback, at }   ← from the A–Z / a–z calibration sheet
//   traits.notes       = [{ id, at, title, text }]   ← transcribed pages (photos are NOT stored)
//   voice_notes        = [insight, ...]             ← one line per page about the person;
//                                                     twin.js gatherSignal reads these, so notes
//                                                     feed the AI twin ("cloning") for free.
// POST { mode: get | calibrate | add | ask | delete, userId, image?, question?, id? }
import { configured, getRow, upsertRow, notebookKey } from "../../lib/db";
import { ownsUser } from "../../lib/auth";
import { rateLimited } from "../../lib/ratelimit";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const MODEL = "claude-opus-5-5";
const MAX_NOTES = 200; // ponytail: whole notebook goes into one `ask` prompt (~300k tokens max) — add retrieval if notebooks outgrow that

const SAMPLE = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "Sphinx of black quartz, judge my vow.",
];

// Raw fetch like every other route here (no SDK dependency). Opus 5.5 always thinks, so
// read the text blocks by type, never content[0].
async function claude(system, content, { schema, effort = "medium" } = {}) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000, fallbacks: "default", system,
      output_config: { effort, ...(schema && { format: { type: "json_schema", schema } }) },
      messages: [{ role: "user", content }],
    }),
  });
  if (!r.ok) throw new Error("API " + r.status + " " + (await r.text()).slice(0, 200));
  const d = await r.json();
  if (d.stop_reason === "refusal") throw new Error("refused");
  const text = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  return schema ? JSON.parse(text) : text;
}

const obj = (props) => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });
const str = { type: "string" };
const img = (dataUrl) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: String(dataUrl).split(",").pop() } });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!configured() || !process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Not configured" });
  const { mode, userId, image, question, id } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Sign in first" });
  if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });

  const key = notebookKey(userId);
  try {
    const row = await getRow(key);
    const traits = (row && row.traits) || {};
    const notes = traits.notes || [];
    const view = () => ({ handwriting: traits.handwriting || null, notes: [...notes].reverse(), sample: SAMPLE });

    if (mode === "get") return res.status(200).json(view());

    if (mode === "delete") {
      traits.notes = notes.filter(n => n.id !== id);
      await upsertRow(key, { traits });
      return res.status(200).json(view());
    }

    // everything below spends credits
    if (rateLimited(req, { limit: 10 })) return res.status(429).json({ error: "Too many requests, slow down." });

    if (mode === "calibrate") {
      if (!image) return res.status(400).json({ error: "No photo received." });
      const out = await claude(
        `You are learning one person's handwriting so you can read their notes later. The photo should show these lines, handwritten:\n${SAMPLE.join("\n")}\n(plus maybe their name/date).
Return readback: exactly what you can read, line by line. Return profile: a compact, specific guide for reading THIS person's handwriting later — letterform quirks and look-alikes (e.g. "their 'a' is open and can look like 'u'", "'t' crossbar floats right", "'1' and '7' both have flags"), slant, joined vs print, spacing, how capitals and digits look. If the photo isn't handwriting, say so in profile.`,
        [img(image), { type: "text", text: "Read my handwriting sample and build my handwriting profile." }],
        { schema: obj({ readback: str, profile: str }), effort: "high" },
      );
      traits.handwriting = { profile: String(out.profile).slice(0, 3000), readback: String(out.readback).slice(0, 2000), at: new Date().toISOString() };
      await upsertRow(key, { traits });
      return res.status(200).json(view());
    }

    if (mode === "add") {
      if (!image) return res.status(400).json({ error: "No photo received." });
      const hw = traits.handwriting?.profile;
      const out = await claude(
        `Transcribe this photo of a person's handwritten notes faithfully — keep their wording, lists, and line breaks; mark unreadable words as [?]. Don't fix or add content.
${hw ? `HOW THIS PERSON WRITES (learned from their calibration sheet — use it to resolve ambiguous letters):\n${hw}` : ""}
Also return title: a short title for the page (max 8 words), and insight: ONE sentence about what this page reveals about the person — their interests, plans, habits, worries, or way of thinking (warm, factual, no diagnosis). If it isn't a page of notes, set text to "" .`,
        [img(image), { type: "text", text: "Transcribe this page of my notes." }],
        { schema: obj({ title: str, text: str, insight: str }), effort: "high" },
      );
      if (!String(out.text).trim()) return res.status(422).json({ error: "Couldn't find handwritten notes in that photo — try a clearer, well-lit shot." });
      const note = { id: "n_" + Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), title: String(out.title).slice(0, 80), text: String(out.text).slice(0, 6000) };
      traits.notes = [...notes, note].slice(-MAX_NOTES);
      const insights = [...((row && row.voice_notes) || []), `From their handwritten notes: ${String(out.insight).slice(0, 200)}`].slice(-60);
      await upsertRow(key, { traits, voice_notes: insights });
      return res.status(200).json({ ...view(), added: note });
    }

    if (mode === "ask") {
      const q = String(question || "").trim().slice(0, 500);
      if (!q) return res.status(400).json({ error: "Ask a question." });
      if (!notes.length) return res.status(200).json({ answer: "Your notebook is empty — snap a page of notes first and I'll remember it." });
      const book = notes.map(n => `### ${n.title} (${n.at.slice(0, 10)})\n${n.text}`).join("\n\n");
      const answer = await claude(
        `You are Rough Notebook, the keeper of this person's handwritten notes. Answer ONLY from the notes below. Mention which note (title + date) the answer comes from. If the notes don't cover it, say so plainly — never guess or invent. Be brief and warm.\n\nNOTES:\n${book}`,
        q, { effort: "low" },
      );
      return res.status(200).json({ answer });
    }

    return res.status(400).json({ error: "Bad mode" });
  } catch (e) {
    console.error("notebook error:", e.message);
    return res.status(500).json({ error: "Something went wrong — try again." });
  }
}
