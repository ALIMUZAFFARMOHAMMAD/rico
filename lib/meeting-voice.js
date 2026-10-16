import { selfVoice, selfVoiceOn, isSelfVoice } from "./selfvoice";

export const MAX_MEETING_SPEECH = 240;
export function validateMeetingSpeech(text) {
  if (typeof text !== "string" || !text.trim() || text.trim().length > MAX_MEETING_SPEECH) throw new Error("Use 1–240 characters for a spoken reply.");
  return text.trim();
}
// Never fall back to a stock voice: the owner explicitly chose their clone.
export async function clonedMeetingAudio(twin, text) {
  if (!twin?.voiceCloned || !twin.voice) throw new Error("Record your own cloned voice in the You tab first.");
  const reply = validateMeetingSpeech(text);
  const spoken = `I'm ${String(twin.name || "the owner").slice(0, 35)}'s AI twin. ${reply}`;
  let response;
  if (isSelfVoice(twin.voice)) {
    if (!selfVoiceOn()) throw new Error("Your cloned voice service is unavailable.");
    response = await selfVoice("/tts", { voice: twin.voice.slice(5), text: spoken, language: "en" }, 25000);
  } else {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error("Your cloned voice service is unavailable.");
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(twin.voice)}/stream?output_format=mp3_44100_64`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(25000),
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken, model_id: "eleven_flash_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
  }
  if (!response.ok) throw new Error("Your cloned voice could not generate this reply. No substitute voice was used.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The cloned voice service returned no audio.");
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); throw new Error("The generated reply exceeded the audio limit. Try a shorter reply."); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const audio = Buffer.concat(chunks);
  const wav = audio.length >= 44 && audio.subarray(0, 4).toString() === "RIFF" && audio.subarray(8, 12).toString() === "WAVE";
  const mp3 = audio.subarray(0, 3).toString() === "ID3" || (audio.length > 2 && audio[0] === 255 && (audio[1] & 224) === 224);
  if (!wav && !mp3) throw new Error("The cloned voice service returned unsupported audio.");
  return { audio_base64: audio.toString("base64"), format: wav ? "wav" : "mp3" };
}
