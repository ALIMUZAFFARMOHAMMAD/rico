// Client for Rico's self-hosted voice server (voice-server/rico_voice.py on Modal).
// A twin whose traits.voice is "self:<id>" speaks through it; anything else stays on ElevenLabs.
export const selfVoiceOn = () => !!(process.env.RICO_VOICE_URL && process.env.RICO_VOICE_KEY);
export const isSelfVoice = (voice) => String(voice || "").startsWith("self:");
export const selfVoiceId = (userId) => String(userId).replace(/[^A-Za-z0-9_-]/g, "").slice(-64);

// Chatterbox Multilingual covers these app languages; others (bn, te) fall back to a stock voice.
export const SELF_LANGS = new Set(["en", "hi", "es", "zh", "de", "fr", "pt", "ja", "ko", "ar"]);

export function selfVoice(path, body, timeoutMs = 25000) {
  return fetch(`${process.env.RICO_VOICE_URL.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-rico-key": process.env.RICO_VOICE_KEY },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// Remove a twin's cloned voice wherever it lives (self-hosted clip or ElevenLabs IVC slot).
export async function removeTwinVoice(voice) {
  try {
    if (isSelfVoice(voice)) { if (selfVoiceOn()) await selfVoice("/delete", { voice: voice.slice(5) }); return; }
    if (voice && process.env.ELEVENLABS_API_KEY)
      await fetch(`https://api.elevenlabs.io/v1/voices/${voice}`, { method: "DELETE", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
  } catch (e) {}
}
