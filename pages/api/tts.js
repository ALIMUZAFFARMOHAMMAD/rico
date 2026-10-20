import { getAuth } from "@clerk/nextjs/server";
// Tony's real voice — server-side ElevenLabs TTS proxy, streaming.
// Keys never reach the client. Audio is piped chunk-by-chunk so the
// client can start playback before generation finishes.

import { resolveAgent } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";
import { isSelfVoice, selfVoice, selfVoiceOn, SELF_LANGS } from "../../lib/selfvoice";
import { expressiveDelivery } from "../../lib/voice-delivery";

export const config = { maxDuration: 30 }; // self-hosted voice can take a few seconds when its GPU is cold

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  const userId = getAuth(req).userId;
  if (!userId) return res.status(401).json({ error: "Sign in to hear this voice." });
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const { text, speechText, expression, agentId, language, warm } = req.body || {};
  // each agent (and each twin) has their own licensed voice; Tony uses the founder's clone
  const agent = await resolveAgent(agentId, userId);
  if (!agent) return res.status(404).json({ error: "This twin is private or unavailable." });
  const voiceId = agent.voice || process.env.ELEVENLABS_VOICE_ID;
  const self = isSelfVoice(voiceId);
  // the call page pings this on open so a self-hosted twin's GPU is awake by the first reply
  if (warm) { if (self && selfVoiceOn()) selfVoice("/warm", {}, 3000).catch(() => {}); return res.status(204).end(); }
  if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "No text" });
  const clean = text.slice(0, 600); // cost guard — voice replies are 1-3 sentences anyway

  // self-hosted clone (Chatterbox on Modal): no ElevenLabs voice slots, so it scales with users
  if (self) {
    if (!selfVoiceOn()) return res.status(503).json({ error: "Your cloned voice is temporarily unavailable. Please try again shortly." });
    if (!SELF_LANGS.has(language || "en")) return res.status(422).json({ error: "Your cloned voice currently supports English. Choose English to keep your voice." });
    try {
      const r = await selfVoice("/tts", { voice: voiceId.slice(5), text: clean, language: language || "en" });
      if (r.ok) {
        res.writeHead(200, { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
        return res.end(Buffer.from(await r.arrayBuffer()));
      }
      console.error("Self voice unavailable:", r.status);
    } catch { console.error("Self voice request failed"); }
    return res.status(502).json({ error: "Your cloned voice could not play. Please try again shortly." });
  }
  if (!apiKey || !voiceId) return res.status(503).json({ error: "Voice not configured" });
  // Direction tags guide emotion; Creative mode increases vocal variation.
  // Keep plain text for self-hosted clones, which do not share v3's tag syntax.
  const model = "eleven_v3";

  const speak = (vid) => fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        ...expressiveDelivery(clean, speechText, expression),
        model_id: model,
      }),
    }
  );

  try {
    const r = await speak(voiceId);
    if (!r.ok) {
      console.error("TTS unavailable:", r.status);
      return res.status(502).json({ error: "This voice is temporarily unavailable. Your reply is still available as text." });
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

