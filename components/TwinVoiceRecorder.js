// Record ~30s of the user's voice and clone it onto their AI twin (consent-gated).
import { useState, useRef, useEffect, useCallback } from "react";

const T = { panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6" };
const font = "'Inter',system-ui,-apple-system,sans-serif";
const MAX = 45, MIN = 20;

const SCRIPT = "Hey, it's me — this is my real voice for my Rico twin. I like good conversations, the people I care about, and a bit of fun along the way. If we match, I'd love to actually talk. So tell me — what's something good that happened to you this week?";

export default function TwinVoiceRecorder({ userId, userName, cloned, onClose, onDone }) {
  const [phase, setPhase] = useState("intro"); // intro | recording | recorded | uploading | done | error
  const [secs, setSecs] = useState(0);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [level, setLevel] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const audioElRef = useRef(null);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);
  useEffect(() => cleanup, [cleanup]);

  async function start() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      // level meter
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser(); an.fftSize = 256; src.connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => { an.getByteFrequencyData(data); setLevel(data.reduce((a, b) => a + b, 0) / data.length / 255); rafRef.current = requestAnimationFrame(tick); };
      tick();

      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => { blobRef.current = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }); setPhase("recorded"); cancelAnimationFrame(rafRef.current); };
      recRef.current = rec; rec.start();
      setPhase("recording"); setSecs(0);
      timerRef.current = setInterval(() => setSecs(s => { if (s + 1 >= MAX) stop(); return s + 1; }), 1000);
    } catch (e) { setErr("Microphone access denied. Allow the mic to record your voice."); }
  }

  function stop() {
    clearInterval(timerRef.current);
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  function playback() {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const a = new Audio(url); audioElRef.current = a;
    a.onended = () => URL.revokeObjectURL(url); a.play();
  }

  async function upload() {
    if (!blobRef.current || !consent) return;
    setPhase("uploading"); setErr("");
    try {
      const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blobRef.current); });
      const r = await fetch("/api/twin-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, userName, audio: b64, mime: blobRef.current.type, consent: true }) });
      const d = await r.json();
      if (d.ok) { setPhase("done"); onDone && onDone(); }
      else { setErr(d.error || "Failed"); setPhase("recorded"); }
    } catch (e) { setErr("Upload failed — try again."); setPhase("recorded"); }
  }

  async function removeClone() {
    setPhase("uploading");
    try { await fetch("/api/twin-voice", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }); onDone && onDone(); } catch (e) {}
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.66)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#1a1626", borderRadius: "24px 24px 0 0", border: `1px solid ${T.line}`, padding: "22px 20px 28px", fontFamily: font }}>
        <div style={{ width: 40, height: 4, borderRadius: 100, background: T.line, margin: "0 auto 16px" }} />
        <div style={{ color: T.text, fontWeight: 800, fontSize: 18 }}>🎙 Clone your real voice</div>
        <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>
          Your twin will speak in your actual voice on calls. Record ~30 seconds of natural speech — read the line below or just talk.
        </div>

        {phase === "intro" && cloned && (
          <div style={{ margintop: 12, marginTop: 12, color: "#4ade80", fontSize: 12.5, fontWeight: 600 }}>✓ Your voice is already cloned. Re-record to replace it, or remove it.</div>
        )}

        {(phase === "intro" || phase === "recorded") && (
          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 14, padding: "12px 14px", marginTop: 14, color: T.text, fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>"{SCRIPT}"</div>
        )}

        {phase === "recording" && (
          <div style={{ textAlign: "center", margin: "22px 0" }}>
            <div style={{ width: 110, height: 110, borderRadius: "50%", margin: "0 auto", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + level * 0.4})`, transition: "transform 0.08s" }}>
              <div style={{ fontSize: 30 }}>🎙</div>
            </div>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 26, marginTop: 14, fontVariantNumeric: "tabular-nums" }}>0:{String(secs).padStart(2, "0")}</div>
            <div style={{ color: secs >= MIN ? "#4ade80" : T.sub, fontSize: 12, marginTop: 2 }}>{secs >= MIN ? "Good — you can stop now" : `Keep going… (${MIN - secs}s more)`}</div>
          </div>
        )}

        {err && <div style={{ color: T.pink, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{err}</div>}

        {(phase === "intro") && (
          <button onClick={start} style={{ width: "100%", marginTop: 16, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>● Start recording</button>
        )}
        {phase === "recording" && (
          <button onClick={stop} disabled={secs < 3} style={{ width: "100%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font, opacity: secs < 3 ? 0.5 : 1 }}>■ Stop</button>
        )}
        {phase === "recorded" && (<>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={playback} style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 13.5, padding: "11px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>▶ Play back</button>
            <button onClick={start} style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 13.5, padding: "11px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>↻ Re-record</button>
          </div>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, accentColor: T.violet, width: 16, height: 16 }} />
            <span style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.5 }}>This is <b style={{ color: T.text }}>my own voice</b>, and I'm okay with my twin using a clone of it on calls with people who match with it.</span>
          </label>
          <button onClick={upload} disabled={!consent} style={{ width: "100%", marginTop: 14, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: consent ? "pointer" : "not-allowed", opacity: consent ? 1 : 0.5, fontFamily: font }}>Use this as my twin's voice</button>
        </>)}
        {phase === "uploading" && (
          <div style={{ textAlign: "center", color: T.sub, fontSize: 13.5, padding: "18px 0", fontWeight: 600 }}>Cloning your voice…</div>
        )}
        {phase === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32 }}>✨</div>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16, marginTop: 6 }}>Your twin now sounds like you</div>
            <button onClick={onClose} style={{ width: "100%", marginTop: 16, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "13px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Done</button>
          </div>
        )}
        {cloned && phase === "intro" && (
          <button onClick={removeClone} style={{ width: "100%", marginTop: 10, background: "transparent", border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 13, padding: "11px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Remove my cloned voice</button>
        )}
      </div>
    </div>
  );
}
