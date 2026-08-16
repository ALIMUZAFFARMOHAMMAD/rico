// Tony's real voice — server-side ElevenLabs TTS proxy, streaming.
// Keys never reach the client. Audio is piped chunk-by-chunk so the
// client can start playback before generation finishes.

import { resolveAgent } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const { text, agentId } = req.body || {};
  // each agent (and each twin) has their own licensed voice; Tony uses the founder's clone
  const agent = await resolveAgent(agentId);
  const voiceId = agent.voice || process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return res.status(503).json({ error: "Voice not configured" });
  if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "No text" });
  const clean = text.slice(0, 600); // cost guard — voice replies are 1-3 sentences anyway

  // flash_v2_5: ~75ms generation, covers en/hi/es.
  const model = "eleven_flash_v2_5";

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_64&optimize_streaming_latency=2`,
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
