// One cancellable input turn, shared by individual and group calls.
export function microphoneError(error) {
  if (["NotAllowedError", "SecurityError"].includes(error?.name)) return "Microphone access is blocked. Allow the microphone for Ricomates in your browser and Windows privacy settings, then try again.";
  if (["NotFoundError", "DevicesNotFoundError"].includes(error?.name)) return "No microphone was found. Connect a microphone and try again.";
  if (["NotReadableError", "TrackStartError"].includes(error?.name)) return "The microphone is busy or unavailable. Check your input device and close any app using it exclusively.";
  return "Could not open the microphone. Check your browser microphone settings and try again.";
}

export async function checkMicrophone(env = globalThis) {
  if (!env.navigator?.mediaDevices?.getUserMedia) throw new Error("Microphone input is unavailable in this browser. Open Ricomates in a current browser over HTTPS, or type your message.");
  let stream;
  try {
    stream = await env.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (error) { throw new Error(microphoneError(error)); }
  finally { stream?.getTracks().forEach(track => track.stop()); }
}

export function createVoiceInput(options, env = globalThis) {
  let cancelled = false, settled = false, recognition, stream, recorder, context;
  let interval, watchdog, recorderFinish, controller;
  let serverMode = options.preferServer === true;
  const alive = () => !cancelled && !settled;
  const clearTimers = () => { env.clearInterval(interval); env.clearTimeout(watchdog); };
  function release() {
    clearTimers();
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = recognition.onstart = null;
      try { recognition.abort(); } catch {}
      recognition = null;
    }
    if (recorder) {
      recorder.ondataavailable = recorder.onstop = recorder.onerror = null;
      try { if (recorder.state !== "inactive") recorder.stop(); } catch {}
    }
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    if (context) { void context.close().catch(() => {}); context = null; }
    options.onLevel?.(0);
  }
  function fail(message) {
    if (!alive()) return;
    settled = true; release(); options.onError(message);
  }
  function complete(text) {
    if (!alive()) return;
    settled = true; release();
    if (text.trim()) options.onText(text.trim());
    else options.onError("No speech was detected. Check your input device, speak near the microphone, then tap Retry microphone.");
  }
  async function record() {
    if (!alive()) return;
    serverMode = true;
    options.onFallback?.();
    if (!env.MediaRecorder || !env.navigator?.mediaDevices?.getUserMedia) {
      fail("This browser cannot record microphone audio. Open Ricomates in a current browser, or use Type instead."); return;
    }
    options.onStatus?.("Opening microphone…");
    try {
      const captured = await env.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!alive()) { captured.getTracks().forEach(track => track.stop()); return; }
      stream = captured;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find(type => env.MediaRecorder.isTypeSupported(type));
      recorder = new env.MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      let bytes = 0, spoke = false, speechMs = 0, silenceAt = 0, stopping = false;
      const started = env.Date.now();
      const AC = env.AudioContext || env.webkitAudioContext;
      if (!AC) { fail("Audio input monitoring is unavailable. Try a current browser or Type instead."); return; }
      context = new AC();
      await context.resume();
      if (!alive()) return;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      recorder.ondataavailable = event => {
        if (!alive() || !event.data.size) return;
        bytes += event.data.size;
        if (bytes > 4 * 1024 * 1024) { fail("That recording is too large. Try a shorter message."); return; }
        chunks.push(event.data);
      };
      recorderFinish = () => {
        if (!alive() || stopping) return;
        stopping = true; clearTimers();
        if (recorder.state !== "inactive") recorder.stop();
      };
      recorder.onerror = () => fail("Microphone recording stopped unexpectedly. Tap Retry microphone.");
      recorder.onstop = async () => {
        if (!alive()) return;
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        if (context) { void context.close().catch(() => {}); context = null; }
        options.onLevel?.(0);
        if (!spoke) { complete(""); return; }
        options.onStatus?.("Transcribing…");
        try {
          const blob = new env.Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
          const audio = await new Promise((resolve, reject) => {
            const reader = new env.FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (!alive()) return;
          controller = new env.AbortController();
          watchdog = env.setTimeout(() => controller.abort(), 30000);
          const response = await env.fetch("/api/stt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio, mime: blob.type, language: options.language?.split("-")[0] }), signal: controller.signal });
          const data = await response.json();
          if (!alive()) return;
          if (!response.ok) { fail(data.error || "Speech recognition failed. Tap Retry microphone."); return; }
          complete(typeof data.text === "string" ? data.text : "");
        } catch (error) {
          if (alive()) fail(error?.name === "AbortError" ? "Speech recognition timed out. Tap Retry microphone." : "Could not transcribe your speech. Check your connection and retry.");
        }
      };
      recorder.start(250);
      options.onListening?.();
      options.onStatus?.("Listening — speak, then pause");
      interval = env.setInterval(() => {
        if (!alive()) return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
        options.onLevel?.(Math.min(1, rms * 12));
        const now = env.Date.now();
        if (rms > 0.008) { speechMs += 100; if (speechMs >= 200) spoke = true; silenceAt = 0; }
        else if (spoke && !silenceAt) silenceAt = now;
        if ((spoke && silenceAt && now - silenceAt >= 1400) || now - started >= 20000 || (!spoke && now - started >= 10000)) recorderFinish();
      }, 100);
    } catch (error) { if (alive()) fail(microphoneError(error)); }
  }
  function fallback() {
    if (!alive() || serverMode) return;
    release();
    void record();
  }
  function start() {
    const SR = env.SpeechRecognition || env.webkitSpeechRecognition;
    if (serverMode || !SR || options.language?.startsWith("te")) { void record(); return; }
    try {
      recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = options.language || "en-US";
      let text = "";
      recognition.onstart = () => { if (alive()) { options.onListening?.(); options.onStatus?.("Listening — just talk"); } };
      recognition.onresult = event => {
        if (!alive()) return;
        text = Array.from(event.results).map(result => result[0].transcript).join(" ");
        options.onTranscript?.(text);
      };
      recognition.onerror = event => {
        if (!alive()) return;
        if (event.error !== "aborted") fallback();
      };
      recognition.onend = () => { if (alive()) { if (text.trim()) complete(text); else fallback(); } };
      // Some embedded browsers expose SpeechRecognition without a working service.
      watchdog = env.setTimeout(() => { if (text.trim()) complete(text); else fallback(); }, 12000);
      recognition.start();
    } catch { fallback(); }
  }
  return {
    start,
    finish() { if (!alive()) return; if (serverMode) recorderFinish?.(); else { try { recognition?.stop(); } catch { fallback(); } } },
    cancel() { cancelled = true; controller?.abort(); release(); },
  };
}
