// Live Translate — fast conversation interpreter. Translates a single spoken turn
// from one language to another (or auto-detects the source). Uses the fast model
// for low latency. Text only; audio is synthesized client-side via /api/tts.
import { LANGS } from "../../lib/i18n";
import { rateLimited } from "../../lib/ratelimit";

const FAST = "claude-haiku-4-5-20251001";

async function claude(apiKey, system, userText, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: FAST, max_tokens: maxTokens, system, messages: [{ role: "user", content: userText }] }),
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  return d.content[0].text.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  const { text, from, to } = req.body || {};
  if (!text || !text.trim()) return res.status(200).json({ text: "" });
  const toName = LANGS[to]?.name || to || "English";

  try {
    if (from === "auto") {
      const sys = `You are a professional real-time conversation interpreter. The user will give you one spoken line in some language. Detect its language and translate it into ${toName}.
Output ONLY strict JSON: {"lang":"<ISO 639-1 two-letter code of the source>","text":"<the translation in ${toName}>"}
Translate naturally and conversationally — spoken tone, no notes, no quotes, no extra words.`;
      const raw = await claude(apiKey, sys, text.slice(0, 1500), 400);
      let j; try { j = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch (e) { j = { lang: "", text: raw }; }
      return res.status(200).json({ text: (j.text || "").trim(), detected: j.lang || "" });
    }
    const fromName = LANGS[from]?.name || from || "English";
    const sys = `You are a professional real-time conversation interpreter translating ${fromName} to ${toName}.
Translate the user's line naturally and conversationally, the way a person would actually say it out loud.
Output ONLY the translation in ${toName} — no quotes, no notes, no explanations, no transliteration.`;
    const out = await claude(apiKey, sys, text.slice(0, 1500), 400);
    return res.status(200).json({ text: out.replace(/^["']|["']$/g, "").trim() });
  } catch (e) {
    console.error("translate error:", e.message);
    return res.status(500).json({ error: "Translation failed" });
  }
}
