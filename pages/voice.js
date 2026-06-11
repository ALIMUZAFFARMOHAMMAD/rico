// Rico — voice call screen. Hands-free conversation loop with per-agent voices
// (catalog agents + community twins). Dark call UI with pulsing presence rings.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useUser } from "@clerk/nextjs";
import { LANGS, getStoredPref, storePref, getDetectedLang, storeDetectedLang, detectLang } from "../lib/i18n";
import TonyCharacter from "../components/TonyCharacter";
import RealRat from "../components/RealRat";
import Aurora from "../components/Aurora";
import { getAgent, AGENTS } from "../lib/agents";

const S = { IDLE:"idle", CONNECTING:"connecting", ACTIVE:"active", LISTENING:"listening", THINKING:"thinking", SPEAKING:"speaking", ENDED:"ended" };
const T = { bg:"#0f0e17", panel:"rgba(255,255,255,0.055)", panel2:"rgba(255,255,255,0.09)", line:"rgba(255,255,255,0.1)", text:"#f5f3ff", sub:"#9b97b0", grad:"linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink:"#ff5e7e", violet:"#8b5cf6" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

export default function VoicePage() {
  const { user } = useUser();
  const [state, setState] = useState(S.IDLE);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [voicesReady, setVoicesReady] = useState(false);
  const [lang, setLangState] = useState("en");
  const [langPref, setLangPref] = useState("auto");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voiceMode, setVoiceMode] = useState("human");
  const [agentObj, setAgentObj] = useState(getAgent("tony"));

  const voiceModeRef = useRef("human");
  const audioRef = useRef(null);
  const langRef = useRef("en");
  const langPrefRef = useRef("auto");
  const recRef = useRef(null);
  const callActiveRef = useRef(false);
  const mutedRef = useRef(false);
  const stateRef = useRef(S.IDLE);
  const listenRef = useRef(null);
  const histRef = useRef([]);
  const timerRef = useRef(null);
  const voiceRef = useRef(null);
  const agentRef = useRef(getAgent("tony"));

  const isLive = [S.ACTIVE,S.LISTENING,S.THINKING,S.SPEAKING].includes(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const userName = user?.firstName || user?.fullName?.split(" ")[0] || "";
  const userId = user?.id || null;

  useEffect(() => {
    const p = getStoredPref();
    const eff = p === "auto" ? (getDetectedLang() || "en") : p;
    setLangPref(p); langPrefRef.current = p;
    setLangState(eff); langRef.current = eff;
    const aid = new URLSearchParams(window.location.search).get("agent") || "tony";
    if (aid.startsWith("twin__")) {
      fetch(`/api/twin?id=${aid}`).then(r => r.json()).then(d => {
        if (d.twin) { const a = { ...d.twin, id: aid }; agentRef.current = a; setAgentObj(a); }
      }).catch(() => {});
      agentRef.current = { ...getAgent("tony"), id: aid, name: "Twin" }; setAgentObj(agentRef.current);
    } else {
      const a = getAgent(aid); agentRef.current = a; setAgentObj(a);
    }
  }, []);

  const autoDetect = useCallback((text) => {
    if (langPrefRef.current !== "auto") return;
    const d = detectLang(text);
    if (d && d !== langRef.current) { setLangState(d); langRef.current = d; storeDetectedLang(d); }
  }, []);

  const changeLang = useCallback((v) => {
    setLangPref(v); langPrefRef.current = v; storePref(v);
    if (v !== "auto") { setLangState(v); langRef.current = v; }
  }, []);

  const changeVoiceMode = useCallback((v) => {
    setVoiceMode(v); voiceModeRef.current = v;
    window.localStorage.setItem("hitony_voice", v);
  }, []);
  useEffect(() => {
    const v = window.localStorage.getItem("hitony_voice");
    if (v === "human" || v === "classic") { setVoiceMode(v); voiceModeRef.current = v; }
  }, []);

  useEffect(() => {
    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      const matches = voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(lang));
      const rank = v => (/natural|neural|premium|enhanced|online/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : /microsoft/i.test(v.name) ? 2 : 3);
      matches.sort((a, b) => rank(a) - rank(b));
      voiceRef.current = matches[0] || null;
      setVoicesReady(true);
      setVoiceNotice(!matches.length && lang !== "en" ? "No device voice for this language — replies will show as text if the premium voice is unavailable." : "");
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [lang]);

  useEffect(() => {
    if (isLive) { timerRef.current = setInterval(() => setDuration(d => d+1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [isLive]);

  const speakBrowser = useCallback((text) => new Promise(resolve => {
    if (!window.speechSynthesis) { resolve(); return; }
    if (!voiceRef.current && langRef.current !== "en") { setTimeout(resolve, 900); return; }
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;
      u.lang = (LANGS[langRef.current] || LANGS.en).speech;
      if (voiceRef.current) u.voice = voiceRef.current;
      u.onend = resolve; u.onerror = resolve;
      window.speechSynthesis.speak(u);
      setTimeout(resolve, text.length * 80 + 3000);
    }, 150);
  }), []);

  const playStreamed = useCallback((resp) => new Promise(async (resolve) => {
    const mime = "audio/mpeg";
    let settled = false;
    const finish = (url) => { if (!settled) { settled = true; if (url) URL.revokeObjectURL(url); resolve(); } };
    if (!(window.MediaSource && MediaSource.isTypeSupported(mime))) {
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => finish(url); audio.onerror = () => finish(url);
      audio.play().catch(() => finish(url));
      return;
    }
    const ms = new MediaSource();
    const url = URL.createObjectURL(ms);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => finish(url); audio.onerror = () => finish(url);
    ms.addEventListener("sourceopen", async () => {
      try {
        const sbuf = ms.addSourceBuffer(mime);
        const reader = resp.body.getReader();
        const append = (chunk) => new Promise(r2 => { sbuf.addEventListener("updateend", r2, { once: true }); sbuf.appendBuffer(chunk); });
        while (true) { const { done, value } = await reader.read(); if (done) break; await append(value); }
        if (ms.readyState === "open") ms.endOfStream();
      } catch (e) { try { if (ms.readyState === "open") ms.endOfStream(); } catch (_) {} }
    }, { once: true });
    audio.play().catch(() => finish(url));
    setTimeout(() => finish(url), 30000);
  }), []);

  const speak = useCallback(async (text) => {
    if (voiceModeRef.current === "human") {
      try {
        const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: langRef.current, agentId: agentRef.current.id }) });
        if (r.ok) { await playStreamed(r); return; }
        if (r.status === 503) voiceModeRef.current = "classic";
      } catch (e) {}
    }
    await speakBrowser(text);
  }, [speakBrowser, playStreamed]);

  const handleSpoke = useCallback(async (text) => {
    autoDetect(text);
    setState(S.THINKING);
    const h = [...histRef.current, { role: "user", content: text }];
    histRef.current = h;
    setMessages(p => [...p, { role: "user", text }]);
    try {
      const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h, mode: "chat", userName, userId, language: langRef.current, agentId: agentRef.current.id }) });
      const d = await r.json();
      const reply = d.text || "Say that again?";
      const fullHistory = [...h, { role: "assistant", content: reply }];
      histRef.current = fullHistory;
      setMessages(p => [...p, { role: "agent", text: reply }]);
      if (userId) fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "save_call", userId, userName, callMessages: fullHistory, agentId: agentRef.current.id }) }).catch(() => {});
      setState(S.SPEAKING);
      await speak(reply);
      if (callActiveRef.current && !mutedRef.current) listenRef.current?.();
      else setState(S.ACTIVE);
    } catch (e) {
      setError("Connection hiccup");
      if (callActiveRef.current && !mutedRef.current) listenRef.current?.();
      else setState(S.ACTIVE);
    }
  }, [speak, userName, userId, autoDetect]);

  const listen = useCallback(() => {
    if (!callActiveRef.current) return;
    if (mutedRef.current) { setState(S.ACTIVE); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Voice calls need Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = (LANGS[langRef.current] || LANGS.en).speech;
    let final = "";
    let fatal = false;
    rec.onresult = e => { final = Array.from(e.results).map(r => r[0].transcript).join(""); setTranscript(final); };
    rec.onerror = e => { if (["not-allowed","service-not-allowed","audio-capture"].includes(e.error)) { fatal = true; setError("Microphone unavailable: " + e.error); } };
    rec.onend = async () => {
      setTranscript("");
      if (!callActiveRef.current) return;
      if (fatal) { setState(S.ACTIVE); return; }
      if (final.trim()) { await handleSpoke(final); }
      else if (!mutedRef.current) { setTimeout(() => listenRef.current?.(), 300); }
      else { setState(S.ACTIVE); }
    };
    recRef.current = rec;
    try { rec.start(); setState(S.LISTENING); }
    catch (e) { setTimeout(() => listenRef.current?.(), 500); }
  }, [handleSpoke]);
  useEffect(() => { listenRef.current = listen; }, [listen]);

  const startCall = useCallback(async () => {
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.volume = 0; window.speechSynthesis.speak(warmup);
    setState(S.CONNECTING); setDuration(0); setMessages([]); histRef.current = []; setError("");
    callActiveRef.current = true;
    await new Promise(r => setTimeout(r, 700));
    try {
      const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [], mode: "init", userName, userId, language: langRef.current, agentId: agentRef.current.id }) });
      const d = await r.json();
      const g = d.text || `Hey${userName ? ` ${userName}` : ""}! So good to hear you. What's going on?`;
      histRef.current = [{ role: "assistant", content: g }];
      setMessages([{ role: "agent", text: g }]);
      setState(S.SPEAKING);
      await speak(g);
      if (callActiveRef.current && !mutedRef.current) listenRef.current?.();
      else setState(S.ACTIVE);
    } catch (e) { callActiveRef.current = false; setState(S.IDLE); setError("Couldn't connect."); }
  }, [speak, userName, userId]);

  const endCall = useCallback(async () => {
    callActiveRef.current = false;
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    recRef.current?.stop();
    setState(S.ENDED);
    if (userId && histRef.current.length > 1) {
      try { await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "save_call", userId, userName, callMessages: histRef.current, agentId: agentRef.current.id }) }); } catch (e) {}
    }
  }, [userId, userName]);

  const micPress = useCallback(() => {
    if (state === S.ACTIVE) { mutedRef.current = false; setMuted(false); listen(); }
    else if (state === S.LISTENING) recRef.current?.stop();
  }, [state, listen]);

  const toggleMute = useCallback(() => {
    const v = !mutedRef.current;
    mutedRef.current = v; setMuted(v);
    if (v) { recRef.current?.stop(); }
    else if (callActiveRef.current && stateRef.current === S.ACTIVE) listenRef.current?.();
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape" && isLive) endCall(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLive, endCall]);

  const status = {
    [S.IDLE]: "Ready when you are",
    [S.CONNECTING]: "Calling…",
    [S.ACTIVE]: muted ? "Muted" : "Paused — tap ▶",
    [S.LISTENING]: "Listening — just talk",
    [S.THINKING]: "Thinking…",
    [S.SPEAKING]: "Speaking",
    [S.ENDED]: "Call ended",
  }[state];

  const ringColor = state === S.SPEAKING ? T.pink : state === S.LISTENING ? T.violet : "transparent";

  return (<>
    <Head>
      <title>{`Call ${agentObj.name} — rico`}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <meta name="theme-color" content="#0f0e17" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <Aurora />
      <div style={{ width: "100%", maxWidth: 430, height: "100vh", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
          <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 20, padding: 4 }}>←</a>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>{agentObj.name}</div>
            {isLive && <div style={{ color: T.sub, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(duration)}</div>}
          </div>
          <select value={langPref} onChange={e => changeLang(e.target.value)} disabled={isLive} aria-label="Language" style={{ background: "transparent", color: T.sub, border: "none", fontSize: 12, fontWeight: 600, outline: "none", fontFamily: font }}>
            <option value="auto" style={{ color: "#000" }}>Auto</option>
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k} style={{ color: "#000" }}>{v.native}</option>)}
          </select>
        </div>

        {/* presence */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, position: "relative" }}>
          <div style={{ position: "relative", width: 210, height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(state === S.SPEAKING || state === S.LISTENING) && [0, 1, 2].map(i => (
              <div key={i} className="ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${ringColor}`, animationDelay: `${i * 0.55}s` }} />
            ))}
            <div style={{ width: 178, height: 178, borderRadius: "50%", padding: 3, background: isLive ? T.grad : T.panel2 }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `radial-gradient(120% 120% at 50% 0%, ${agentObj.look?.hoodie || "#ffe566"}40 0%, #161226 75%)`, overflow: "hidden", display: "flex", justifyContent: "center", border: `1px solid ${T.line}` }}>
                <div style={{ marginTop: 8 }}>
                  <TonyCharacter size={285} look={agentObj.look || {}} float="none" animated={false} pose="down" expr="😊" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ color: T.text, fontWeight: 600, fontSize: 14.5, textAlign: "center" }}>{status}</div>
            {transcript && <div style={{ color: T.sub, fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 6, maxWidth: 300 }}>"{transcript}…"</div>}
          </div>

          {/* voice mode */}
          {!isLive && state !== S.ENDED && (
            <div style={{ display: "flex", gap: 8 }}>
              {[["human", "✨ Real voice"], ["classic", "Robo voice"]].map(([v, label]) => (
                <button key={v} onClick={() => changeVoiceMode(v)} style={{ background: voiceMode === v ? T.grad : T.panel2, border: `1px solid ${T.line}`, color: voiceMode === v ? "white" : T.sub, fontWeight: 700, fontSize: 12, padding: "8px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{label}</button>
              ))}
            </div>
          )}

          {/* last exchange */}
          {messages.length > 0 && (
            <div style={{ position: "absolute", bottom: 8, left: 22, right: 22, maxHeight: 110, overflow: "hidden", display: "flex", flexDirection: "column", gap: 6, maskImage: "linear-gradient(to bottom, transparent, black 28%)" }}>
              {messages.slice(-3).map((m, i) => (
                <div key={i} style={{ color: m.role === "user" ? T.sub : T.text, fontSize: 12.5, lineHeight: 1.5, textAlign: m.role === "user" ? "right" : "left" }}>
                  {m.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* controls */}
        <div style={{ padding: "18px 22px 30px", display: "flex", justifyContent: "center", alignItems: "center", gap: 22, position: "relative", zIndex: 5 }}>
          {state === S.IDLE && (
            <button onClick={startCall} disabled={!voicesReady} style={{ width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 16, padding: "16px 0", borderRadius: 100, cursor: "pointer", fontFamily: font, boxShadow: "0 12px 36px rgba(255,94,126,0.4)", opacity: voicesReady ? 1 : 0.6 }}>
              📞 Call {agentObj.name}
            </button>
          )}
          {state === S.CONNECTING && <div style={{ color: T.sub, fontWeight: 600, fontSize: 14, padding: "16px 0" }}>Ringing…</div>}
          {isLive && (<>
            <button onClick={toggleMute} style={{ width: 56, height: 56, borderRadius: "50%", background: muted ? "#ff5e7e33" : T.panel2, border: `1px solid ${T.line}`, fontSize: 19, cursor: "pointer" }}>{muted ? "🔇" : "🎙"}</button>
            <button onClick={micPress} disabled={state === S.THINKING || state === S.SPEAKING}
              style={{ width: 74, height: 74, borderRadius: "50%", background: state === S.LISTENING ? `${T.violet}` : T.panel2, border: `1px solid ${T.line}`, color: "white", fontSize: 24, cursor: (state === S.THINKING || state === S.SPEAKING) ? "not-allowed" : "pointer", opacity: (state === S.THINKING || state === S.SPEAKING) ? 0.45 : 1 }}>
              {state === S.LISTENING ? "✓" : "▶"}
            </button>
            <button onClick={endCall} style={{ width: 56, height: 56, borderRadius: "50%", background: "#e63946", border: "none", fontSize: 19, cursor: "pointer" }}>📵</button>
          </>)}
          {state === S.ENDED && (
            <div style={{ width: "100%", display: "flex", gap: 10 }}>
              <button onClick={() => { setState(S.IDLE); setMessages([]); setDuration(0); }} style={{ flex: 1, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 14.5, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Call again</button>
              <a href="/" style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 14.5, padding: "14px 0", borderRadius: 100, textAlign: "center", textDecoration: "none" }}>Back to chats</a>
            </div>
          )}
        </div>

        {(error || voiceNotice) && (
          <div style={{ position: "absolute", top: 64, left: 20, right: 20, textAlign: "center", color: error ? T.pink : T.sub, fontSize: 12, fontWeight: 600, zIndex: 6 }}>{error || voiceNotice}</div>
        )}

        <RealRat busy={state === S.THINKING} height={32} bottom={108} />
      </div>
    </div>
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.bg}; }
      .ring { animation: ring-pulse 1.8s ease-out infinite; }
      @keyframes ring-pulse { 0% { transform: scale(0.85); opacity: 0.9; } 100% { transform: scale(1.45); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) { .ring { animation: none; opacity: 0.3; } }
    `}</style>
  </>);
}
