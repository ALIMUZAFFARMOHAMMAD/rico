// Export only the owner's existing reference sample. This never synthesizes audio.
export async function savedVoiceReference(twin, request = fetch) {
  if (!twin?.voiceCloned || !/^[A-Za-z0-9_-]{8,100}$/.test(twin.voice || "")) throw new Error("An exportable saved voice is required.");
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("Saved voice access is unavailable.");
  const base = `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(twin.voice)}`;
  const options = { method: "GET", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, redirect: "error", signal: AbortSignal.timeout(20000) };
  const info = await request(base, options);
  if (!info.ok) throw new Error("The saved voice could not be read.");
  const voice = await info.json();
  if (voice.voice_id !== twin.voice || voice.category !== "cloned") throw new Error("Only your saved instant voice clone can be exported.");
  const sample = voice.samples?.find(s => /^[A-Za-z0-9_-]{1,100}$/.test(s.sample_id || "") && Number(s.size_bytes) > 0 && Number(s.size_bytes) <= 6 * 1024 * 1024);
  if (!sample) throw new Error("The provider has no downloadable original voice sample.");
  const response = await request(`${base}/samples/${encodeURIComponent(sample.sample_id)}/audio`, { ...options, signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error("The original voice sample could not be downloaded.");
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 6 * 1024 * 1024) { await reader.cancel(); throw new Error("Voice sample exceeds the local export limit."); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  if (size < 1000) throw new Error("The saved voice sample is empty.");
  return { audio_base64: Buffer.concat(chunks).toString("base64"), mime: String(sample.mime_type || "application/octet-stream").slice(0, 100) };
}
