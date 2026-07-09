// In-character game banter — one short, funny, warm line reacting to a game moment,
// in the voice of whichever character (or twin) you're playing. Uses fast Haiku.
import { resolveAgent } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ line: "" });
  const { agentId, game, situation, language } = req.body || {};
  try {
    const agent = await resolveAgent(agentId);
    const persona = (agent.persona || `You are ${agent.name}, ${agent.archetype || "a friendly companion"}.`).slice(0, 900);
    const gameName = game === "chess" ? "chess" : game === "ttt" ? "tic-tac-toe" : (game || "a game");
    const system = `${persona}

You're playing a friendly game of ${gameName} with your friend right now. Stay 100% in character — your role, your vibe, your way of talking.
Reply with EXACTLY ONE short line of playful, warm, funny trash-talk-but-lovingly banter reacting to this moment: ${situation}.
Rules: max ~14 words. One emoji max. Never mean or hurtful — it's affectionate friend-banter. No quotation marks. ${language && language !== "en" ? `Reply in the user's language (code: ${language}).` : ""}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 40,
        system,
        messages: [{ role: "user", content: "Give me your one-line banter for that game moment." }],
      }),
    });
    if (!r.ok) return res.status(200).json({ line: "" });
    const d = await r.json();
    let line = (d.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "").split("\n")[0].slice(0, 120);
    return res.status(200).json({ line });
  } catch (e) {
    return res.status(200).json({ line: "" });
  }
}
