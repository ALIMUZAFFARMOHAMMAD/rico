// Rico Live Translate — Conversation Mode. A single-device, real-time two-way
// interpreter: you speak English, it speaks their language aloud; they speak,
// you get English captions (+ optional audio). Reuses Rico's ElevenLabs STT
// (Scribe) + TTS + the i18n language set. Mascot: "bro".
import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
import { useUser } from "@clerk/nextjs";
import { LANGS } from "../lib/i18n";

const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.06)", panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6", teal: "#2dd4bf" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

// languages offered (English is always the user side). 5 PRD langs first.
const THEIR_LANGS = ["es", "zh", "fr", "de", "hi", "bn", "pt", "ja", "ko", "ar"];
// ElevenLabs Scribe ISO-639-3 codes
const STT3 = { en: "eng", es: "spa", zh: "cmn", fr: "fra", de: "deu", hi: "hin", bn: "ben", pt: "por", ja: "jpn", ko: "kor", ar: "ara" };
// languages where the browser's recognizer is unreliable → use Scribe instead
const USE_SCRIBE = new Set(["zh", "ja", "ko", "ar", "bn"]);

/* ---------------- bro mascot ---------------- */
function Bro({ state, size = 86 }) {
  // state: idle | listening | translating | speaking | error
  const ring = state === "listening" ? T.violet : state === "speaking" ? T.pink : state === "translating" ? T.teal : "rgba(255,255,255,0.18)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {(state === "listening" || state === "speaking") && [0, 1].map(i => (
        <span key={i} className="bro-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${ring}`, animationDelay: `${i * 0.6}s` }} />
      ))}
      <svg viewBox="0 0 100 100" width={size} height={size} className={state === "translating" ? "bro-spin" : ""}>
        <defs>
          <linearGradient id="broG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
        </defs>
        <circle cx="50" cy="50" r="34" fill="url(#broG)" />
        {/* headset / soundwave motif */}
        <path d="M34 50 a16 16 0 0 1 32 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <rect x="30" y="50" width="7" height="13" rx="3.5" fill="#fff" />
        <rect x="63" y="50" width="7" height="13" rx="3.5" fill="#fff" />
        <circle cx="42" cy="46" r="3.2" fill="#fff" /><circle cx="58" cy="46" r="3.2" fill="#fff" />
        <path d="M43 58 q7 5 14 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function Translate() {
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => { if (isLoaded && !isSignedIn) window.location.href = "/"; }, [isLoaded, isSignedIn]);

  const [theirLang, setTheirLang] = useState("es");
  const [speakAloud, setSpeakAloud] = useState(true);
  const [broOn, setBroOn] = useState(true);
  const [turns, setTurns] = useState([]); // {side:"them"|"you", src, dst}
  const [phase, setPhase] = useState("idle"); // idle|listen-them|listen-you|translating|speaking
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState("");
  const [announced, setAnnounced] = useState(false);

  const theirLangRef = useRef("es"); useEffect(() => { theirLangRef.current = theirLang; }, [theirLang]);
  const speakRef = useRef(true); useEffect(() => { speakRef.current = speakAloud; }, [speakAloud]);
  const recRef = useRef(null);
  const mediaRef = useRef(null);
  const audioRef = useRef(null);
  const scribeStopRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight; }, [turns, interim, phase]);
  useEffect(() => () => { stopAll(); }, []); // eslint-disable-line

  const langName = (c) => LANGS[c]?.name || c;
  const stopAll = () => {
    try { recRef.current?.stop(); } catch (e) {}
    try { scribeStopRef.current && scribeStopRef.current(); } catch (e) {}
    mediaRef.current?.getTracks().forEach(t => t.stop());
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  };

  // play synthesized speech in a given language via ElevenLabs (fallback: browser)
  const speak = useCallback(async (text, langCode) => {
    if (!text) return;
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: langCode, agentId: "tony" }) });
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob());
        const a = new Audio(url); audioRef.current = a;
        await new Promise(res => { a.onended = res; a.onerror = res; a.play().catch(res); setTimeout(res, text.length * 95 + 3500); });
        URL.revokeObjectURL(url); audioRef.current = null; return;
      }
    } catch (e) {}
    await new Promise(res => { const u = new SpeechSynthesisUtterance(text); u.lang = LANGS[langCode]?.speech || "en-US"; u.onend = res; u.onerror = res; window.speechSynthesis.speak(u); setTimeout(res, text.length * 80 + 2500); });
  }, []);

  const translate = async (text, from, to) => {
    const r = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, from, to }) });
    const d = await r.json();
    return d.text || "";
  };

  // process one finished spoken turn
  const handleTurn = useCallback(async (side, text) => {
    const t = (text || "").trim();
    setInterim("");
    if (!t) { setPhase("idle"); return; }
    const from = side === "them" ? theirLangRef.current : "en";
    const to = side === "them" ? "en" : theirLangRef.current;
    setPhase("translating");
    try {
      const out = await translate(t, from, to);
      setTurns(p => [...p, { side, src: t, dst: out }]);
      if (speakRef.current && out) { setPhase("speaking"); await speak(out, to); }
    } catch (e) { setErr("Translation hiccup — try again."); }
    setPhase("idle");
  }, [speak]);

  // ---- Web Speech recognizer (fast path) ----
  const listenSR = useCallback((side, langCode) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    const rec = new SR();
    rec.lang = LANGS[langCode]?.speech || "en-US";
    rec.continuous = false; rec.interimResults = true;
    let final = "";
    rec.onresult = e => { final = Array.from(e.results).map(r => r[0].transcript).join(""); setInterim(final); };
    rec.onerror = () => {};
    rec.onend = () => { recRef.current = null; handleTurn(side, final); };
    recRef.current = rec;
    try { rec.start(); setPhase(side === "them" ? "listen-them" : "listen-you"); return true; } catch (e) { return false; }
  }, [handleTurn]);

  // ---- Scribe recognizer (record → STT; tap again or 15s to stop) ----
  const listenScribe = useCallback(async (side, langCode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      mediaRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      let stopped = false;
      const finalize = () => { if (stopped) return; stopped = true; if (mr.state !== "inactive") mr.stop(); };
      scribeStopRef.current = finalize;
      const cap = setTimeout(finalize, 15000);
      mr.onstop = async () => {
        clearTimeout(cap);
        mediaRef.current?.getTracks().forEach(t => t.stop());
        scribeStopRef.current = null;
        setPhase("translating");
        try {
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
          const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
          const r = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio: b64, mime: blob.type, language: STT3[langCode] }) });
          const { text } = await r.json();
          await handleTurn(side, text);
        } catch (e) { setErr("Couldn't hear that — try again."); setPhase("idle"); }
      };
      mr.start(); setPhase(side === "them" ? "listen-them" : "listen-you");
    } catch (e) { setErr("Microphone unavailable."); setPhase("idle"); }
  }, [handleTurn]);

  const startListen = (side) => {
    setErr("");
    const langCode = side === "them" ? theirLang : "en";
    if (USE_SCRIBE.has(langCode) || !(window.SpeechRecognition || window.webkitSpeechRecognition)) listenScribe(side, langCode);
    else if (!listenSR(side, langCode)) listenScribe(side, langCode);
  };
  const stopListen = () => {
    try { recRef.current?.stop(); } catch (e) {}
    try { scribeStopRef.current && scribeStopRef.current(); } catch (e) {}
  };

  const tapMic = (side) => {
    const listening = (side === "them" && phase === "listen-them") || (side === "you" && phase === "listen-you");
    if (listening) { stopListen(); return; }
    if (phase !== "idle") return; // busy translating/speaking
    if (!announced) { announce(); setAnnounced(true); }
    startListen(side);
  };

  // mandatory courtesy notice, spoken in THEIR language
  const announce = useCallback(async () => {
    const lc = theirLangRef.current;
    setPhase("speaking");
    try {
      const en = "Hello! This call is being translated in real time. Please speak clearly, and pause for a moment after each sentence so I can translate. Thank you!";
      const localized = await translate(en, "en", lc);
      await speak(localized || en, lc);
    } catch (e) {}
    setPhase("idle");
  }, [speak]);

  const reset = () => { stopAll(); setTurns([]); setInterim(""); setPhase("idle"); setAnnounced(false); setErr(""); };

  const status = {
    "idle": turns.length ? "Tap a mic to speak" : "Pick their language, then tap a mic",
    "listen-them": `Listening (${langName(theirLang)})…`,
    "listen-you": "Listening (English)…",
    "translating": "Translating…",
    "speaking": "Speaking…",
  }[phase];

  const listening = phase === "listen-them" || phase === "listen-you";

  return (<>
    <Head>
      <title>Live Translate — rico</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <meta name="theme-color" content="#0f0e17" />    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 460, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${T.line}` }}>
          <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 20 }}>←</a>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>🌐 Live Translate</div>
            <div style={{ color: T.sub, fontSize: 11 }}>English ⇄ {langName(theirLang)} · real-time interpreter</div>
          </div>
          <button onClick={() => setBroOn(b => !b)} title="Toggle bro" style={{ background: broOn ? T.panel2 : "transparent", border: `1px solid ${T.line}`, color: T.text, fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{broOn ? "bro ✓" : "bro"}</button>
        </div>

        {/* controls bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${T.line}`, flexWrap: "wrap" }}>
          <span style={{ color: T.sub, fontSize: 11, fontWeight: 700 }}>Their language:</span>
          <select value={theirLang} onChange={e => setTheirLang(e.target.value)} disabled={listening} style={{ background: T.panel2, color: T.text, border: `1px solid ${T.line}`, borderRadius: 100, padding: "6px 12px", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: font }}>
            {THEIR_LANGS.map(c => <option key={c} value={c} style={{ color: "#000" }}>{LANGS[c].native} · {LANGS[c].name}</option>)}
          </select>
          <button onClick={() => setSpeakAloud(s => !s)} style={{ background: speakAloud ? T.violet : T.panel2, border: `1px solid ${T.line}`, color: speakAloud ? "#fff" : T.sub, fontSize: 12, fontWeight: 700, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{speakAloud ? "🔊 Voice on" : "🔇 Captions only"}</button>
          <button onClick={announce} disabled={phase !== "idle"} title="Play the translation notice in their language" style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 12, fontWeight: 700, padding: "6px 11px", borderRadius: 100, cursor: phase === "idle" ? "pointer" : "default", fontFamily: font, opacity: phase === "idle" ? 1 : 0.5 }}>📢 Notice</button>
        </div>

        {/* bro + status */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0 8px", gap: 8 }}>
          {broOn && <Bro state={phase === "listen-them" || phase === "listen-you" ? "listening" : phase === "translating" ? "translating" : phase === "speaking" ? "speaking" : "idle"} />}
          <div style={{ color: listening ? T.violet : phase === "speaking" ? T.pink : T.sub, fontSize: 13.5, fontWeight: 700 }}>{status}</div>
          {interim && <div style={{ color: T.sub, fontSize: 13, fontStyle: "italic", textAlign: "center", maxWidth: 340, padding: "0 16px" }}>"{interim}…"</div>}
        </div>

        {/* transcript */}
        <div ref={panelRef} style={{ flex: 1, overflowY: "auto", padding: "8px 14px 8px", display: "flex", flexDirection: "column", gap: 11 }}>
          {turns.length === 0 && (
            <div style={{ textAlign: "center", color: T.sub, fontSize: 13.5, lineHeight: 1.6, margin: "20px 18px" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🌐</div>
              Hand the phone back and forth, or put it between you. Tap <b style={{ color: T.text }}>🎙 You</b> to speak English — they'll hear it in {langName(theirLang)}. Tap <b style={{ color: T.text }}>🎙 Them</b> when they reply.
            </div>
          )}
          {turns.map((t, i) => {
            const them = t.side === "them";
            return (
              <div key={i} style={{ display: "flex", flexDirection: them ? "row" : "row-reverse" }}>
                <div style={{ maxWidth: "82%", background: them ? T.panel2 : T.grad, border: them ? `1px solid ${T.line}` : "none", borderRadius: them ? "16px 16px 16px 4px" : "16px 16px 4px 16px", padding: "10px 13px" }}>
                  <div style={{ color: them ? T.sub : "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: 800, letterSpacing: 0.4, marginBottom: 3 }}>{them ? `${langName(theirLang).toUpperCase()} → ENGLISH` : `YOU · ENGLISH → ${langName(theirLang).toUpperCase()}`}</div>
                  <div style={{ color: them ? T.text : "#fff", fontSize: 15, lineHeight: 1.45, fontWeight: 600 }}>{them ? t.dst : t.src}</div>
                  <div style={{ color: them ? T.sub : "rgba(255,255,255,0.7)", fontSize: 12.5, lineHeight: 1.4, marginTop: 4, fontStyle: "italic" }}>{them ? t.src : t.dst}</div>
                  <button onClick={() => speak(them ? t.dst : t.dst, them ? "en" : theirLang)} title="Replay" style={{ background: "transparent", border: "none", color: them ? T.sub : "rgba(255,255,255,0.8)", fontSize: 12, cursor: "pointer", marginTop: 4, padding: 0 }}>🔁 replay</button>
                </div>
              </div>
            );
          })}
        </div>

        {err && <div style={{ color: T.pink, fontSize: 12, fontWeight: 600, textAlign: "center", padding: "2px 16px 4px" }}>{err}</div>}

        {/* mic buttons */}
        <div style={{ display: "flex", gap: 10, padding: "10px 14px 20px" }}>
          <button onClick={() => tapMic("them")} disabled={phase === "translating" || phase === "speaking" || phase === "listen-you"}
            style={{ flex: 1, background: phase === "listen-them" ? T.violet : T.panel2, border: `1px solid ${phase === "listen-them" ? "transparent" : T.line}`, color: T.text, fontWeight: 800, fontSize: 14, padding: "16px 0", borderRadius: 18, cursor: "pointer", fontFamily: font, opacity: (phase === "translating" || phase === "speaking" || phase === "listen-you") ? 0.45 : 1 }}>
            {phase === "listen-them" ? "■ Stop" : `🎙 Them · ${LANGS[theirLang].native}`}
          </button>
          <button onClick={() => tapMic("you")} disabled={phase === "translating" || phase === "speaking" || phase === "listen-them"}
            style={{ flex: 1, background: phase === "listen-you" ? T.pink : T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14, padding: "16px 0", borderRadius: 18, cursor: "pointer", fontFamily: font, opacity: (phase === "translating" || phase === "speaking" || phase === "listen-them") ? 0.45 : 1 }}>
            {phase === "listen-you" ? "■ Stop" : "🎙 You · English"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, paddingBottom: 14 }}>
          {turns.length > 0 && <button onClick={reset} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Clear conversation</button>}
          <span style={{ color: T.sub, fontSize: 10.5, opacity: 0.7 }}>🔒 Audio isn't stored.</span>
        </div>
      </div>
    </div>
    <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } html, body { background: ${T.bg}; }
      .bro-ring { animation: bro-pulse 1.8s ease-out infinite; }
      @keyframes bro-pulse { 0% { transform: scale(0.85); opacity: 0.85; } 100% { transform: scale(1.4); opacity: 0; } }
      .bro-spin { animation: bro-spin 1.1s linear infinite; }
      @keyframes bro-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce){ .bro-ring,.bro-spin{ animation: none !important; } }
    `}</style>
  </>);
}
