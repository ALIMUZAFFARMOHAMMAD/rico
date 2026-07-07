// Create / list AI Twins. POST distills the user's character from their chat memory
// into a publishable agent persona; GET lists community twins for the deck.
import { configured, getRow, getUserRows, parseKey } from "../../lib/db";
import { listTwins, saveTwin, twinLook, twinVoice, twinKey } from "../../lib/twins";
import { ownsUser } from "../../lib/auth";

const DISTILL = `You turn a user's chat history and personality scores into an AI "twin" persona for a friendship app. The twin should feel like the user's energy, not a parody. Output ONLY valid JSON, no markdown:
{"name":"<their first name>","tagline":"<a warm, dating-app-style one-line bio, 8-16 words, third person, that captures their vibe and makes someone want to talk to them>","interests":["a","b","c"],"persona":"You are <Name> — an AI twin of a real person on the Rico app. <2-4 sentences: their communication style (language mix, energy, humor), what they care about, how they treat friends. Written as second-person instructions: 'You speak...', 'You love...'> You are warm, respectful, and a platonic friend only. You are not a career advisor; if asked about careers, point them to Tony."}`;

const NEED = 12; // signal points before the twin truly captures someone

// Aggregate what Rico knows about a user across ALL their chats + calls.
async function gatherSignal(userId) {
  const rows = await getUserRows(userId);
  const msgs = [], voiceNotes = [];
  let traits = {};
  for (const r of rows) {
    if (parseKey(r.user_id).kind === "meta") continue; // skip matches/reports row
    (r.messages || []).forEach(m => { if (m.role === "user" && m.content && !m.content.startsWith("[")) msgs.push(m.content); });
    (r.voice_notes || []).forEach(n => { if (typeof n === "string") voiceNotes.push(n); });
    if (r.traits && r.traits.O) traits = r.traits; // keep a populated personality read
  }
  const substantive = msgs.filter(m => m.trim().length >= 12); // real sentences, not "ok"/"hi"
  const score = substantive.length + voiceNotes.length * 2;     // calls reveal a lot
  const hasTraits = !!(traits && traits.O);
  const ready = score >= NEED && hasTraits && substantive.length >= 4;
  return { msgs, voiceNotes, traits, substantive, score, need: NEED, hasTraits, ready, progress: Math.min(1, score / NEED) };
}

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });

  if (req.method === "GET") {
    if (req.query.readiness) {
      if (!ownsUser(req, req.query.readiness)) return res.status(403).json({ error: "forbidden" });
      const s = await gatherSignal(req.query.readiness);
      return res.status(200).json({ ready: s.ready, progress: s.progress, have: s.substantive.length + s.voiceNotes.length, need: s.need, hasTraits: s.hasTraits });
    }
    if (req.query.id && req.query.id.startsWith("twin__")) {
      const { resolveAgent } = await import("../../lib/twins");
      const a = await resolveAgent(req.query.id);
      return res.status(200).json({ twin: a.isTwin ? { id: a.id, name: a.name, bio: a.bio, interests: a.interests, look: a.look, isTwin: true, voiceCloned: !!a.voiceCloned } : null });
    }
    const twins = await listTwins(req.query.exclude || null);
    return res.status(200).json({ twins });
  }

  if (req.method === "POST") {
    const { userId, userName } = req.body || {};
    if (!userId || !userName) return res.status(400).json({ error: "Sign in first" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    try {
      // the twin only activates once Rico genuinely understands this person
      const sig = await gatherSignal(userId);
      if (!sig.ready) return res.status(403).json({ error: "Rico is still getting to know you. Chat and call your friends a bit more — your twin unlocks once it really understands your character.", progress: sig.progress, have: sig.substantive.length + sig.voiceNotes.length, need: sig.need });
      const msgs = sig.msgs.slice(-25);
      const traits = sig.traits || {};
      const voiceNotes = sig.voiceNotes;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 500, system: DISTILL,
          messages: [{ role: "user", content: `First name: ${userName}\nPersonality (0-100): Openness ${traits.O}, Drive ${traits.C}, Social ${traits.E}, Empathy ${traits.A}, Reflection ${traits.N}\nThings they've said:\n${msgs.map(m => "- " + m).join("\n")}\n${voiceNotes.length ? "Call notes:\n" + voiceNotes.slice(-8).map(n => "- " + n).join("\n") : ""}` }],
        }),
      });
      const d = await r.json();
      let twin;
      try { twin = JSON.parse(d.content[0].text.replace(/```json|```/g, "").trim()); } catch (e) { return res.status(502).json({ error: "Distillation failed — try again" }); }
      if (!twin?.persona || !twin?.name) return res.status(502).json({ error: "Distillation failed — try again" });

      twin.look = twinLook(userId);
      twin.voice = twinVoice(userId);
      twin.ownerName = userName;
      twin.createdAt = new Date().toISOString();
      await saveTwin(userId, twin);
      return res.status(200).json({ twin: { ...twin, id: `twin__${userId}` } });
    } catch (e) {
      console.error("twin create error:", e.message);
      return res.status(500).json({ error: "Failed" });
    }
  }

  if (req.method === "DELETE") {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "No userId" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    const { deleteRow } = await import("../../lib/db");
    // free the cloned voice slot if this twin had one
    const existing = await getRow(twinKey(userId));
    if (existing?.traits?.voiceCloned && existing.traits.voice && process.env.ELEVENLABS_API_KEY) {
      fetch(`https://api.elevenlabs.io/v1/voices/${existing.traits.voice}`, { method: "DELETE", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } }).catch(() => {});
    }
    await deleteRow(twinKey(userId));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
