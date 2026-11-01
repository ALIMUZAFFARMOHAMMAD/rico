// One owner for generation and playback. Cancellation also covers pending fetches,
// so a preview or an ended call cannot start speaking late.
export function createVoiceOutput(env = globalThis) {
  let current = null;
  const cancel = () => current?.cancel();
  async function speak(body, onPlaying = () => {}) {
    cancel();
    const controller = new AbortController();
    let audio, url, finishPlayback, playbackTimer;
    const job = { cancel() {
      controller.abort();
      audio?.pause();
      finishPlayback?.();
    } };
    current = job;
    const requestTimer = env.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await env.fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || "This voice is unavailable. Please try again.");
      }
      const blob = await response.blob();
      if (controller.signal.aborted || current !== job) return;
      if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("The voice service returned no playable audio.");
      env.clearTimeout(requestTimer);
      url = env.URL.createObjectURL(blob);
      audio = new env.Audio(url);
      await new Promise((resolve, reject) => {
        finishPlayback = resolve;
        audio.onended = resolve;
        audio.onerror = () => reject(new Error("Audio could not play. Check your audio output and try again."));
        playbackTimer = env.setTimeout(() => reject(new Error("Voice playback timed out. Please try again.")), 60000);
        audio.play().then(() => { if (current === job && !controller.signal.aborted) onPlaying(); }).catch(() => reject(new Error("Your browser blocked audio. Tap Preview voice or start the call again.")));
      });
    } catch (error) {
      // An explicit cancel is silent; a generation deadline is actionable.
      if (current !== job || job.cancelled) return;
      if (controller.signal.aborted) throw new Error("Voice generation took too long. Please try again.");
      throw error;
    } finally {
      env.clearTimeout(requestTimer);
      env.clearTimeout(playbackTimer);
      if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; }
      if (url) env.URL.revokeObjectURL(url);
      if (current === job) current = null;
    }
  }
  return { speak, cancel() { if (current) { current.cancelled = true; current.cancel(); } } };
}
