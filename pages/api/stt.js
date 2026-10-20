// Speech-to-text via ElevenLabs Scribe — reliable for languages the browser can't
// transcribe (Telugu, etc.). Takes a recorded audio turn, returns the text.
import { rateLimited } from "../../lib/ratelimit";
import { getAuth } from "@clerk/nextjs/server";

export const config = { maxDuration: 35, api: { bodyParser: { sizeLimit: "6mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  if (!getAuth(req).userId) return res.status(401).json({ error: "Sign in again to use the microphone." });
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Speech recognition is not configured. You can type your message meanwhile." });
  const { audio, mime, language } = req.body || {};
  const mediaType = typeof mime === "string" ? mime.split(";")[0].toLowerCase() : "";
  const extensions = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3" };
  if (typeof audio !== "string" || audio.length > 5600000 || !extensions[mediaType] || (language !== undefined && (typeof language !== "string" || !/^[a-z]{2,3}$/.test(language)))) return res.status(400).json({ error: "Invalid audio recording or language." });
  const encoded = audio.includes(",") ? audio.slice(audio.indexOf(",") + 1) : audio;
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return res.status(400).json({ error: "Invalid audio recording." });
  try {
    const buf = Buffer.from(encoded, "base64");
    if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: "Recording too large. Try a shorter message." });
    if (buf.length < 1500) return res.status(200).json({ text: "" }); // too short to be speech
    const form = new FormData();
    form.append("model_id", "scribe_v1");
    form.append("file", new Blob([buf], { type: mediaType }), `turn.${extensions[mediaType]}`);
    form.append("tag_audio_events", "false");
    if (language) form.append("language_code", language);
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": apiKey }, body: form, signal: AbortSignal.timeout(25000) });
    if (!r.ok) {
      console.error("stt upstream status", r.status);
      const message = r.status === 429 ? "Speech recognition is busy or its usage limit was reached. Try again shortly, or type your message." : [401, 403].includes(r.status) ? "The speech service could not authorize transcription. You can type your message while this is checked." : "Speech recognition is temporarily unavailable. Tap Retry microphone.";
      return res.status(r.status === 429 ? 429 : 502).json({ error: message });
    }
    const d = await r.json();
    return res.status(200).json({ text: typeof d.text === "string" ? d.text.trim() : "" });
  } catch (e) {
    console.error("stt error:", e.name);
    return res.status(504).json({ error: "Speech recognition could not finish. Check your connection and retry." });
  }
}

