import { useState, useRef, useEffect } from "react";
import Dialog from "./Dialog";
import s from "./SocialUI.module.css";

const MIN = 20, MAX = 45;
const SCRIPT = "Hey, it’s me. I like good conversations, the people I care about, and a bit of fun along the way. Something that always makes me smile is catching up with a friend. Today I’m making a little time to try something new. So tell me—what’s something good that happened to you this week?";

export default function TwinVoiceRecorder({ userId, userName, cloned, onClose, onDone }) {
  const [phase, setPhase] = useState("intro");
  const [seconds, setSeconds] = useState(0);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const recorder = useRef(null), stream = useRef(null), timer = useRef(null), sample = useRef(null), previewUrl = useRef("");
  const alive = useRef(true), started = useRef(0), openingMic = useRef(false);
  const busy = ["uploading", "removing"].includes(phase);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);
  function stop() {
    clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop());
  }
  async function start() {
    if (openingMic.current) return;
    openingMic.current = true; setError(""); setPhase("permission"); setConsent(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("unsupported");
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!alive.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      rec.onstop = () => {
        if (!alive.current) return;
        sample.current = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = URL.createObjectURL(sample.current);
        setPreview(previewUrl.current); setSeconds(Math.min(MAX, Math.floor((Date.now() - started.current) / 1000))); setPhase("recorded");
      };
      recorder.current = rec; started.current = Date.now(); rec.start(); setSeconds(0); setPhase("recording");
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started.current) / 1000);
        setSeconds(Math.min(MAX, elapsed)); if (elapsed >= MAX) stop();
      }, 250);
    } catch (err) {
      stream.current?.getTracks().forEach(track => track.stop());
      if (alive.current) { setPhase("intro"); setError(err.message === "unsupported" ? "Recording isn’t supported here. Try a current browser on your phone or computer." : "We couldn’t access your microphone. Check its permission and try again."); }
    } finally { openingMic.current = false; }
  }
  async function upload() {
    if (!sample.current || !consent || seconds < MIN || busy) return;
    setPhase("uploading"); setError("");
    try {
      const audio = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(sample.current); });
      const response = await fetch("/api/twin-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, userName, audio, mime: sample.current.type, consent: true }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Couldn’t save that voice. Please try again.");
      if (alive.current) { setPhase("done"); onDone?.(); }
    } catch (err) { if (alive.current) { setError(err.message || "Upload failed. Your recording is still here to retry."); setPhase("recorded"); } }
  }
  async function remove() {
    setPhase("removing"); setError("");
    try {
      const response = await fetch("/api/twin-voice", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Couldn’t remove your voice. Try again.");
      if (alive.current) { onDone?.(); setPhase("removed"); }
    } catch (err) { if (alive.current) { setError(err.message); setPhase("intro"); } }
  }
  const step = ["intro","permission","recording"].includes(phase) ? 0 : ["done","removed"].includes(phase) ? 2 : 1;
  return <Dialog title="Your voice studio" onClose={onClose} busy={busy}>
    <p className={s.muted}>Give your AI twin a familiar voice. Record in a quiet spot, then listen before you decide.</p>
    <ol className={s.steps}>{["01 Record", "02 Review", "03 Ready"].map((label,index) => <li key={label} aria-current={index === step ? "step" : undefined}>{label}</li>)}</ol>
    {cloned && phase === "intro" && <p className={s.notice}>Your cloned voice is active. You can replace it or return to the standard voice.</p>}
    {["intro","permission","recording"].includes(phase) && <blockquote className={s.script}>{SCRIPT}</blockquote>}
    {phase === "intro" && <><p className={s.muted}>Aim for 20–45 seconds. Speak naturally; no need to perform.</p><div className={s.actions}><button className={s.primary} onClick={start}>● Record my voice</button></div></>}
    {phase === "permission" && <p role="status" className={s.notice}>Allow microphone access in your browser to begin.</p>}
    {phase === "recording" && <><div className={s.row}><strong className={s.timer}>0:{String(seconds).padStart(2,"0")}</strong><span className={s.muted}>{seconds < MIN ? `${MIN-seconds}s until ready` : "Great. You can stop now."}</span></div><div className={s.meter}><span style={{ width: `${seconds/MAX*100}%` }} /></div><button className={s.secondary} onClick={stop}>■ Stop recording</button></>}
    {phase === "recorded" && <><p className={s.muted}>Your recording · {seconds} seconds</p><audio aria-label="Listen to your voice recording" controls src={preview} style={{ width: "100%", marginTop: 14 }} />{seconds < MIN && <p className={s.notice}>A little more speech will help. Record at least {MIN} seconds to continue.</p>}<label className={s.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>This is my own voice. I agree to let my AI twin use a clone of it on calls. I can remove it here later.</span></label><div className={s.actions}><button className={s.secondary} onClick={start}>Record again</button><button className={s.primary} disabled={!consent || seconds < MIN} onClick={upload}>Save my voice →</button></div></>}
    {busy && <p role="status" className={s.notice}>{phase === "removing" ? "Removing your cloned voice…" : "Creating your voice. This can take about a minute. Keep this window open."}</p>}
    {phase === "done" && <div className={s.card}><h2>A little more like you. ✨</h2><p>Your AI twin is ready to use your voice on English calls. Other languages use a standard voice.</p><button className={s.primary} onClick={onClose}>Back to my twin</button></div>}
    {phase === "removed" && <div className={s.card}><h2>Back to the standard voice.</h2><p>Your cloned voice has been removed.</p><button className={s.primary} onClick={onClose}>Done</button></div>}
    {error && <p role="alert" className={s.notice}>{error}</p>}
    {cloned && phase === "intro" && <div className={s.actions}><button className={s.secondary} onClick={remove}>Remove my cloned voice</button></div>}
  </Dialog>;
}
