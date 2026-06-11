// Create / list AI Twins. POST distills the user's character from their chat memory
// into a publishable agent persona; GET lists community twins for the deck.
import { configured, getRow } from "../../lib/db";
import { listTwins, saveTwin, twinLook, twinVoice, twinKey } from "../../lib/twins";

const DISTILL = `You turn a user's chat history and personality scores into an AI "twin" persona for a friendship app. The twin should feel like the user's energy, not a parody. Output ONLY valid JSON, no markdown:
{"name":"<their first name>","tagline":"<8-14 word third-person bio capturing their vibe>","interests":["a","b","c"],"persona":"You are <Name> — an AI twin of a real person on the Rico app. <2-4 sentences: their communication style (language mix, energy, humor), what they care about, how they treat friends. Written as second-person instructions: 'You speak...', 'You love...'> You are warm, respectful, and a platonic friend only."}`;

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });

  if (req.method === "GET") {
    if (req.query.id && req.query.id.startsWith("twin__")) {
      const { resolveAgent } = await import("../../lib/twins");
      const a = await resolveAgent(req.query.id);
      return res.status(200).json({ twin: a.isTwin ? { id: a.id, name: a.name, bio: a.bio, interests: a.interests, look: a.look, isTwin: true } : null });
    }
    const twins = await listTwins(req.query.exclude || null);
    return res.status(200).json({ twins });
  }

  if (req.method === "POST") {
    const { userId, userName } = req.body || {};
    if (!userId || !userName) return res.status(400).json({ error: "Sign in first" });
    try {
      // gather what we know about the user (their Tony memory is the richest)
      const row = await getRow(userId);
      const msgs = (row?.messages || []).filter(m => m.role === "user").map(m => m.content).filter(c => c && !c.startsWith("[")).slice(-25);
      const traits = row?.traits || {};
      const voiceNotes = row?.voice_notes || [];
      if (msgs.length < 3) return res.status(400).json({ error: "Chat with Tony a bit more first — your twin needs at least a few real conversations to learn who you are." });

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
    const { deleteRow } = await import("../../lib/db");
    await deleteRow(twinKey(userId));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
