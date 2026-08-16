// Speech-to-text via ElevenLabs Scribe — reliable for languages the browser can't
// transcribe (Telugu, etc.). Takes a recorded audio turn, returns the text.
import { rateLimited } from "../../lib/ratelimit";

export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Speech recognition unavailable" });
  const { audio, mime, language } = req.body || {};
  if (!audio) return res.status(400).json({ error: "No audio" });
  try {
    const buf = Buffer.from(String(audio).split(",").pop(), "base64");
    if (buf.length < 1500) return res.status(200).json({ text: "" }); // too short to be speech
    const form = new FormData();
    form.append("model_id", "scribe_v1");
    form.append("file", new Blob([buf], { type: mime || "audio/webm" }), "turn.webm");
    if (language) form.append("language_code", language);
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": apiKey }, body: form });
    if (!r.ok) { console.error("stt", r.status, (await r.text()).slice(0, 200)); return res.status(502).json({ error: "STT failed" }); }
    const d = await r.json();
    return res.status(200).json({ text: (d.text || "").trim() });
  } catch (e) {
    console.error("stt error:", e.message);
    return res.status(500).json({ error: "Failed" });
  }
}
