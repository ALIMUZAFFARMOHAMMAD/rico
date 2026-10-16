// Client for Rico's self-hosted voice server (voice-server/rico_voice.py on Modal).
// A twin whose traits.voice is "self:<id>" speaks through it; anything else stays on ElevenLabs.
export const selfVoiceOn = () => !!(process.env.RICO_VOICE_URL && process.env.RICO_VOICE_KEY);
export const isSelfVoice = (voice) => String(voice || "").startsWith("self:");
export const selfVoiceId = (userId) => String(userId).replace(/[^A-Za-z0-9_-]/g, "").slice(-64);

// English twins speak through the voice server (Turbo, ~2-3s a reply). Other languages fall back to a stock voice.
// ponytail: the server already does hi/es/zh/de/fr/pt/ja/ko/ar via Multilingual, but at ~7s a reply it's too slow for
// live calls — add them here once sentence-by-sentence streaming lands.
export const SELF_LANGS = new Set(["en"]);

export function selfVoice(path, body, timeoutMs = 25000) {
  return fetch(`${process.env.RICO_VOICE_URL.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-rico-key": process.env.RICO_VOICE_KEY },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// Remove a twin's cloned voice wherever it lives (self-hosted clip or ElevenLabs IVC slot).
export async function removeTwinVoice(voice, { strict = false } = {}) {
  try {
    let response;
    if (isSelfVoice(voice)) {
      if (!selfVoiceOn()) throw new Error("Voice service unavailable");
      response = await selfVoice("/delete", { voice: voice.slice(5) });
    } else if (voice) {
      if (!process.env.ELEVENLABS_API_KEY) throw new Error("Voice service unavailable");
      response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice}`, { method: "DELETE", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
    }
    if (response && !response.ok && response.status !== 404) throw new Error("Voice removal failed");
  } catch (e) { if (strict) throw e; }
}

