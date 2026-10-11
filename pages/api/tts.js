// Tony's real voice — server-side ElevenLabs TTS proxy, streaming.
// Keys never reach the client. Audio is piped chunk-by-chunk so the
// client can start playback before generation finishes.

import { resolveAgent, twinVoice } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";
import { isSelfVoice, selfVoice, selfVoiceOn, SELF_LANGS } from "../../lib/selfvoice";

export const config = { maxDuration: 30 }; // self-hosted voice can take a few seconds when its GPU is cold

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const { text, agentId, language, warm } = req.body || {};
  // each agent (and each twin) has their own licensed voice; Tony uses the founder's clone
  const agent = await resolveAgent(agentId);
  const voiceId = agent.voice || process.env.ELEVENLABS_VOICE_ID;
  const self = isSelfVoice(voiceId) && selfVoiceOn();
  // the call page pings this on open so a self-hosted twin's GPU is awake by the first reply
  if (warm) { if (self) selfVoice("/warm", {}, 3000).catch(() => {}); return res.status(204).end(); }
  if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "No text" });
  const clean = text.slice(0, 600); // cost guard — voice replies are 1-3 sentences anyway

  // self-hosted clone (Chatterbox on Modal): no ElevenLabs voice slots, so it scales with users
  if (self && SELF_LANGS.has(language || "en")) {
    try {
      const r = await selfVoice("/tts", { voice: voiceId.slice(5), text: clean, language: language || "en" });
      if (r.ok) {
        res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
        return res.end(Buffer.from(await r.arrayBuffer()));
      }
      console.error("self voice error:", r.status, (await r.text()).slice(0, 200), "→ stock voice");
    } catch (e) { console.error("self voice exception:", e.message, "→ stock voice"); }
  }
  if (!apiKey || !voiceId) return res.status(503).json({ error: "Voice not configured" });
  // Cloned voices (Tony's founder clone, twin clones) die if the ElevenLabs plan loses
  // instant cloning (401 ivc_not_permitted) or the clone is deleted (404). Retry once on a
  // stock voice so the call still sounds human instead of dropping to robotic browser TTS.
  const stockVoice = agent.isTwin ? twinVoice(String(agent.id).replace(/^twin__/, "")) : "pNInz6obpgDQGcFmaJgB"; // Adam

  // flash_v2_5: ~75ms generation, covers en/hi/es.
  const model = "eleven_flash_v2_5";

  const speak = (vid) => fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?output_format=mp3_44100_64&optimize_streaming_latency=2`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  try {
    let r = await speak(isSelfVoice(voiceId) ? stockVoice : voiceId);
    if ((r.status === 401 || r.status === 404) && voiceId !== stockVoice) {
      console.error("TTS clone voice rejected:", r.status, (await r.text()).slice(0, 200), "→ stock voice");
      r = await speak(stockVoice);
      if (r.ok) res.setHeader("X-Voice-Fallback", "stock");
    }
    if (!r.ok) {
      const e = await r.text();
      console.error("TTS error:", r.status, e.slice(0, 300));
      return res.status(502).json({ error: "TTS failed" });
    }
    res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
    const reader = r.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    console.error("TTS exception:", e.message);
    if (!res.headersSent) return res.status(502).json({ error: "TTS failed" });
    res.end();
  }
}
