// Rico — voice call screen. Hands-free conversation loop with per-agent voices
// (catalog agents + community twins). Dark call UI with pulsing presence rings.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useUser } from "@clerk/nextjs";
import { LANGS, getStoredPref, storePref, getDetectedLang, storeDetectedLang, detectLang } from "../lib/i18n";
import TonyCharacter from "../components/TonyCharacter";
import Aurora from "../components/Aurora";
import { getAgent } from "../lib/agents";
import { checkMicrophone, createVoiceInput } from "../lib/voice-input";
import { createVoiceOutput } from "../lib/voice-output";

const S = { IDLE:"idle", CONNECTING:"connecting", ACTIVE:"active", LISTENING:"listening", THINKING:"thinking", SPEAKING:"speaking", ENDED:"ended" };
const T = { bg:"#0f0e17", panel:"rgba(255,255,255,0.055)", panel2:"rgba(255,255,255,0.09)", line:"rgba(255,255,255,0.1)", text:"#f5f3ff", sub:"#9b97b0", grad:"linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink:"#ff5e7e", violet:"#8b5cf6" };
const font = "'DM Sans',system-ui,-apple-system,sans-serif";

export default function VoicePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  useEffect(() => { if (isLoaded && !isSignedIn) window.location.href = "/"; }, [isLoaded, isSignedIn]);
  const [state, setState] = useState(S.IDLE);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [inputStatus, setInputStatus] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const serverInputRef = useRef(true);
  const callEpochRef = useRef(0);
  const [lang, setLangState] = useState("en");
  const [langPref, setLangPref] = useState("auto");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [outputError, setOutputError] = useState("");
  const [preview, setPreview] = useState("");
  const previewEpochRef = useRef(0);
  const [voiceMode, setVoiceMode] = useState("human");
  const [agentObj, setAgentObj] = useState(getAgent("tony"));
  // Accessibility: "type, don't talk" mode for non-speaking users — they type, Rico still replies in voice + text.
  const [typeMode, setTypeMode] = useState(false);
  const typeModeRef = useRef(false);
  const [callInput, setCallInput] = useState("");
  useEffect(() => { try { const v = localStorage.getItem("rico_typemode") === "1"; setTypeMode(v); typeModeRef.current = v; } catch (e) {} }, []);

  const voiceModeRef = useRef("human");
  const outputRef = useRef(null);
  if (!outputRef.current) outputRef.current = createVoiceOutput();
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
  const [buildMode, setBuildMode] = useState(false);
  const buildRef = useRef(false);
  // build-mode voice capture → clone the user's voice from this very conversation
  const [cloneConsent, setCloneConsent] = useState(true);
  const cloneConsentRef = useRef(true);
  const [cloneStatus, setCloneStatus] = useState(""); // "" | capturing | cloning | done | short | notready | fail
  const [cloneErr, setCloneErr] = useState(""); // server's reason when cloning fails (e.g. plan has no voice cloning)
  const clipRecRef = useRef(null);
  const clipChunksRef = useRef([]);
  const clipStreamRef = useRef(null);
  const clipMsRef = useRef(0);
  const clipStartRef = useRef(0);

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
    const params = new URLSearchParams(window.location.search);
    const aid = params.get("agent") || "tony";
    if (params.get("build") === "1") { buildRef.current = true; setBuildMode(true); }
    if (aid.startsWith("twin__")) {
      fetch("/api/tts", { signal: AbortSignal.timeout(30000), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warm: true, agentId: aid }) }).catch(() => {}); // wake the self-hosted voice GPU before the first reply
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
    previewEpochRef.current++; outputRef.current.cancel(); window.speechSynthesis?.cancel(); setPreview(""); setOutputError("");
    setVoiceMode(v); voiceModeRef.current = v;
    window.localStorage.setItem("hitony_voice", v);
  }, []);
  useEffect(() => {
    const v = window.localStorage.getItem("hitony_voice");
    if (v === "human" || v === "classic") { setVoiceMode(v); voiceModeRef.current = v; }
  }, []);

  useEffect(() => {
    function loadVoices() {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      const matches = voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(lang));
      const rank = v => (/natural|neural|premium|enhanced|online/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : /microsoft/i.test(v.name) ? 2 : 3);
      matches.sort((a, b) => rank(a) - rank(b));
      voiceRef.current = matches[0] || null;
      setVoiceNotice(!matches.length && lang !== "en" ? "No device voice for this language. Choose Expressive voice." : "");
    }
    loadVoices();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [lang]);

  useEffect(() => {
    if (isLive) { timerRef.current = setInterval(() => setDuration(d => { durationRef.current = d + 1; return d + 1; }), 1000); }
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

  const speak = useCallback(async (text) => {
    const epoch = callEpochRef.current;
    if (!callActiveRef.current) return;
    setOutputError("");
    if (voiceModeRef.current === "human") {
      try {
        await outputRef.current.speak({ text, language: langRef.current, agentId: agentRef.current.id });
      } catch (e) { if (callActiveRef.current && epoch === callEpochRef.current) setOutputError(e.message); }
      return;
    }
    if (!callActiveRef.current || epoch !== callEpochRef.current) return;
    await speakBrowser(text);
  }, [speakBrowser]);

  const previewVoice = useCallback(async () => {
    if (preview) { previewEpochRef.current++; outputRef.current.cancel(); window.speechSynthesis?.cancel(); setPreview(""); return; }
    const epoch = ++previewEpochRef.current;
    setOutputError(""); setPreview("Preparing voice…");
    const samples = {
      en: "Hey, it's good to hear from you! That sounds like a big step. Let's take it one thing at a time — what's on your mind?",
      hi: "अरे, तुमसे बात करके अच्छा लगा! ये तो बड़ा कदम है। चलो, एक-एक चीज़ समझते हैं। तुम्हारे मन में क्या चल रहा है?",
      es: "¡Qué gusto escucharte! Parece un gran paso. Vamos poco a poco. ¿Qué tienes en mente?",
    };
    const language = samples[langRef.current] ? langRef.current : "en";
    try {
      if (voiceModeRef.current === "human") await outputRef.current.speak({ text: samples[language], language, agentId: agentRef.current.id }, () => setPreview("Playing preview…"));
      else { setPreview("Playing device voice…"); await speakBrowser(samples[language]); }
    } catch (e) { if (epoch === previewEpochRef.current) setOutputError(e.message); }
    finally { if (epoch === previewEpochRef.current) setPreview(""); }
  }, [preview, speakBrowser]);

  const handleSpoke = useCallback(async (text) => {
    if (!callActiveRef.current) return;
    const epoch = callEpochRef.current;
    autoDetect(text);
    setState(S.THINKING); setInputStatus("");
    const h = [...histRef.current, { role: "user", content: text }];
    histRef.current = h;
    setMessages(p => [...p, { role: "user", text }]);
    try {
      const r = await fetch("/api/voice", { signal: AbortSignal.timeout(45000), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h, mode: "chat", userName, userId, language: langRef.current, agentId: agentRef.current.id, build: buildRef.current }) });
      const d = await r.json();
      if (!callActiveRef.current || epoch !== callEpochRef.current) return;
      if (!r.ok) throw new Error(d.error || "Voice chat unavailable");
      const reply = d.text || "Say that again?";
      const fullHistory = [...h, { role: "assistant", content: reply }];
      histRef.current = fullHistory;
      setMessages(p => [...p, { role: "agent", text: reply }]);
      if (userId) fetch("/api/voice", { signal: AbortSignal.timeout(45000), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "save_call", userId, userName, callMessages: fullHistory, agentId: agentRef.current.id }) }).catch(() => {});
      setState(S.SPEAKING);
      await speak(reply);
      if (epoch !== callEpochRef.current) return;
      if (callActiveRef.current && !mutedRef.current) listenRef.current?.();
      else if (callActiveRef.current) setState(S.ACTIVE);
    } catch (e) {
      if (!callActiveRef.current || epoch !== callEpochRef.current) return;
      setError("Connection hiccup");
      if (callActiveRef.current && !mutedRef.current) listenRef.current?.();
      else if (callActiveRef.current) setState(S.ACTIVE);
    }
  }, [speak, userName, userId, autoDetect]);

  // capture clean user audio only while listening (Rico is silent then) — used to clone the voice
  const clipResume = useCallback(() => {
    const mr = clipRecRef.current; if (!mr) return;
    try { if (mr.state === "inactive") mr.start(); else if (mr.state === "paused") mr.resume(); clipStartRef.current = Date.now(); } catch (e) {}
  }, []);
  const clipPause = useCallback(() => {
    const mr = clipRecRef.current; if (!mr) return;
    try { if (mr.state === "recording") { mr.pause(); clipMsRef.current += Date.now() - clipStartRef.current; } } catch (e) {}
  }, []);

  const listen = useCallback(() => {
    recRef.current?.cancel();
    if (!callActiveRef.current || mutedRef.current || typeModeRef.current) {
      if (callActiveRef.current) setState(S.ACTIVE);
      return;
    }
    setError(""); setTranscript(""); setInputStatus("Opening microphone…");
    setState(S.ACTIVE);
    const input = createVoiceInput({
      language: (LANGS[langRef.current] || LANGS.en).speech,
      preferServer: serverInputRef.current,
      onFallback: () => { serverInputRef.current = true; },
      onTranscript: setTranscript,
      onStatus: value => { setInputStatus(value); if (value === "Transcribing…") { clipPause(); setState(S.THINKING); } },
      onLevel: setMicLevel,
      onListening: () => { setState(S.LISTENING); if (buildRef.current && cloneConsentRef.current) clipResume(); },
      onText: text => {
        clipPause(); setTranscript("");
        if (callActiveRef.current && !mutedRef.current && !typeModeRef.current) void handleSpoke(text);
      },
      onError: message => { clipPause(); setTranscript(""); setInputStatus(""); setError(message); if (callActiveRef.current) setState(S.ACTIVE); },
    });
    recRef.current = input;
    input.start();
  }, [handleSpoke, clipResume, clipPause]);
  useEffect(() => { listenRef.current = listen; }, [listen]);

  const toggleTypeMode = useCallback(() => {
    const v = !typeModeRef.current; typeModeRef.current = v; setTypeMode(v);
    try { localStorage.setItem("rico_typemode", v ? "1" : "0"); } catch (e) {}
    if (v) { recRef.current?.cancel(); clipPause(); setTranscript(""); setInputStatus(""); if (callActiveRef.current && (inputStatus === "Transcribing…" || (stateRef.current !== S.THINKING && stateRef.current !== S.SPEAKING))) setState(S.ACTIVE); }
    else if (callActiveRef.current && !mutedRef.current && stateRef.current === S.ACTIVE) listenRef.current?.();
  }, [clipPause, inputStatus]);
  const sendTyped = useCallback(() => {
    const txt = callInput.trim();
    if (!txt || !callActiveRef.current) return;
    if (stateRef.current === S.THINKING || stateRef.current === S.SPEAKING) return;
    setCallInput(""); setTranscript(txt);
    handleSpoke(txt);
  }, [callInput, handleSpoke]);

  const startCall = useCallback(async () => {
    if (callActiveRef.current) return;
    previewEpochRef.current++; outputRef.current.cancel(); setPreview(""); setOutputError("");
    const epoch = ++callEpochRef.current;
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const warmup = new SpeechSynthesisUtterance(" ");
      warmup.volume = 0; window.speechSynthesis.speak(warmup);
    }
    setState(S.CONNECTING); setDuration(0); setMessages([]); histRef.current = []; setError(""); setCloneStatus("");
    callActiveRef.current = true;
    mutedRef.current = false; setMuted(false); serverInputRef.current = true;
    if (!typeModeRef.current) {
      setInputStatus("Waiting for microphone permission…");
      try { await checkMicrophone(); }
      catch (error) { if (epoch !== callEpochRef.current) return; callActiveRef.current = false; setState(S.IDLE); setError(error.message); return; }
      if (!callActiveRef.current || epoch !== callEpochRef.current) return;
    }
    setInputStatus("");
    // build mode: open a separate recorder to capture the user's voice for cloning
    if (buildRef.current && cloneConsentRef.current) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (!callActiveRef.current || epoch !== callEpochRef.current) { s.getTracks().forEach(track => track.stop()); return; }
        clipStreamRef.current = s;
        const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
        const mr = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
        clipChunksRef.current = []; clipMsRef.current = 0;
        mr.ondataavailable = e => { if (e.data.size) clipChunksRef.current.push(e.data); };
        clipRecRef.current = mr; setCloneStatus("capturing");
      } catch (e) { clipRecRef.current = null; }
    }
    await new Promise(r => setTimeout(r, 700));
    try {
      const r = await fetch("/api/voice", { signal: AbortSignal.timeout(45000), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [], mode: "init", userName, userId, language: langRef.current, agentId: agentRef.current.id, build: buildRef.current }) });
      if (r.status === 401) { callActiveRef.current = false; clipStreamRef.current?.getTracks().forEach(track => track.stop()); setState(S.IDLE); setError("You're signed out — sign in again to call."); return; }
      const d = await r.json();
      if (!callActiveRef.current || epoch !== callEpochRef.current) return;
      if (!r.ok) throw new Error("Call unavailable");
      const g = d.text || `Hey${userName ? ` ${userName}` : ""}! So good to hear you. What's going on?`;
      histRef.current = [{ role: "assistant", content: g }];
      setMessages([{ role: "agent", text: g }]);
      setState(S.SPEAKING);
      await speak(g);
      if (epoch !== callEpochRef.current) return;
      if (callActiveRef.current && !mutedRef.current) listenRef.current?.();
      else if (callActiveRef.current) setState(S.ACTIVE);
    } catch (e) { if (epoch !== callEpochRef.current) return; callActiveRef.current = false; clipStreamRef.current?.getTracks().forEach(track => track.stop()); setState(S.IDLE); setError("Couldn't connect."); }
  }, [speak, userName, userId]);

  const endCall = useCallback(async () => {
    callActiveRef.current = false; callEpochRef.current++;
    setInputStatus(""); setMicLevel(0);
    window.speechSynthesis?.cancel();
    outputRef.current.cancel();
    recRef.current?.cancel();
    setState(S.ENDED);
    if (userId && histRef.current.length > 1) {
      try { await fetch("/api/voice", { signal: AbortSignal.timeout(45000), method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "save_call", userId, userName, callMessages: histRef.current, agentId: agentRef.current.id }) }); } catch (e) {}
      // log the call for the personality dashboard's voice score
      try { fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "voice", seconds: durationRef.current }) }); } catch (e) {}
    }
    // build mode: finalize the captured voice and clone it onto the twin
    if (buildRef.current && cloneConsentRef.current && clipRecRef.current && userId) {
      const mr = clipRecRef.current;
      try {
        if (mr.state === "recording") clipMsRef.current += Date.now() - clipStartRef.current;
        if (mr.state !== "inactive") await new Promise(res => { mr.onstop = res; mr.stop(); });
      } catch (e) {}
      clipStreamRef.current?.getTracks().forEach(t => t.stop());
      const secs = clipMsRef.current / 1000;
      if (secs < 22) { setCloneStatus("short"); return; }
      setCloneStatus("cloning");
      try {
        // make sure the twin exists (this session may have just unlocked it)
        let twin = await fetch(`/api/twin?id=twin__${userId}`).then(r => r.json()).then(d => d.twin).catch(() => null);
        if (!twin) {
          const cr = await fetch("/api/twin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, userName }) }).then(r => r.json()).catch(() => ({}));
          twin = cr.twin;
          if (!twin) { setCloneStatus("notready"); return; }
        }
        const blob = new Blob(clipChunksRef.current, { type: mr.mimeType || "audio/webm" });
        const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
        const r = await fetch("/api/twin-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, userName, audio: b64, mime: blob.type, consent: true }) });
        const d = await r.json().catch(() => ({}));
        setCloneErr(d.error || "");
        setCloneStatus(d.ok ? "done" : "fail");
      } catch (e) { setCloneStatus("fail"); }
    }
  }, [userId, userName]);

  const micPress = useCallback(() => {
    if (state === S.ACTIVE) { mutedRef.current = false; setMuted(false); listen(); }
    else if (state === S.LISTENING) recRef.current?.finish();
  }, [state, listen]);

  const toggleMute = useCallback(() => {
    const v = !mutedRef.current;
    mutedRef.current = v; setMuted(v);
    if (v) { recRef.current?.cancel(); clipPause(); setTranscript(""); setInputStatus(""); if (stateRef.current === S.LISTENING || stateRef.current === S.ACTIVE || inputStatus === "Transcribing…") setState(S.ACTIVE); }
    else if (callActiveRef.current && stateRef.current === S.ACTIVE) listenRef.current?.();
  }, [clipPause, inputStatus]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape" && isLive) endCall(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLive, endCall]);

  useEffect(() => () => {
    callActiveRef.current = false; callEpochRef.current++;
    recRef.current?.cancel();
    clipStreamRef.current?.getTracks().forEach(track => track.stop());
    window.speechSynthesis?.cancel();
    previewEpochRef.current++; outputRef.current.cancel();
  }, []);

  const status = {
    [S.IDLE]: "Ready when you are",
    [S.CONNECTING]: inputStatus || "Calling…",
    [S.ACTIVE]: muted ? "Muted" : "Paused — tap ▶",
    [S.LISTENING]: inputStatus || "Listening — just talk",
    [S.THINKING]: inputStatus === "Transcribing…" ? "Transcribing…" : "Thinking…",
    [S.SPEAKING]: "Speaking",
    [S.ENDED]: "Call ended",
  }[state];

  const ringColor = state === S.SPEAKING ? T.pink : state === S.LISTENING ? T.violet : "transparent";

  return (<>
    <Head>
      <title>ricomates</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <meta name="theme-color" content="#0f0e17" />    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <Aurora />
      <div style={{ width: "100%", maxWidth: 430, height: "100vh", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px" }}>
          <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 20, padding: 4 }}>←</a>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>{buildMode ? "Building your twin" : agentObj.name}</div>
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
                {agentObj.avatar ? <img src={agentObj.avatar} alt={`${agentObj.name}'s AI portrait`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ marginTop: 8 }}>
                  <TonyCharacter size={285} look={agentObj.look || {}} float="none" animated={false} pose="down" expr="😊" />
                </div>}
              </div>
            </div>
          </div>
          <div>
            <div style={{ color: T.text, fontWeight: 600, fontSize: 14.5, textAlign: "center" }}>{status}</div>
            {transcript && <div style={{ color: T.sub, fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 6, maxWidth: 300 }}>"{transcript}…"</div>}
          </div>
          {/* live caption of Rico's reply — for deaf/HoH users, type-mode, and noisy rooms */}
          {isLive && (() => {
            const lastAgent = [...messages].reverse().find(m => m.role === "agent");
            return lastAgent ? (
              <div aria-live="polite" style={{ maxWidth: 340, margin: "2px 8px 0", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.line}`, borderRadius: 16, padding: "12px 16px" }}>
                <div style={{ color: T.sub, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{agentObj.name.toUpperCase()}</div>
                <div style={{ color: state === S.SPEAKING ? T.text : "#cfc9e6", fontSize: 17, lineHeight: 1.5, textAlign: "center", fontWeight: 500 }}>{lastAgent.text}</div>
              </div>
            ) : null;
          })()}

          {/* voice mode */}
          {state === S.IDLE && (
            <div style={{ textAlign: "center", maxWidth: 340 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {[["human", "✨ Expressive voice"], ["classic", "Device voice"]].map(([v, label]) => (
                  <button key={v} aria-pressed={voiceMode === v} onClick={() => changeVoiceMode(v)} style={{ background: voiceMode === v ? T.grad : T.panel2, border: `1px solid ${T.line}`, color: voiceMode === v ? "white" : T.sub, fontWeight: 700, fontSize: 12, padding: "8px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{label}</button>
                ))}
              </div>
              <p style={{ color: T.sub, fontSize: 12, lineHeight: 1.5, margin: "10px 8px" }}>{voiceMode === "human" ? "Natural pauses and more expressive delivery, in your companion’s own voice." : "Uses your device’s built-in voice. Expression varies by browser."}</p>
              <button disabled={!isLoaded || !isSignedIn} onClick={previewVoice} style={{ border: `1px solid ${T.line}`, borderRadius: 20, padding: "9px 16px", color: T.text, background: T.panel2, cursor: "pointer" }}>{preview ? "■ Stop preview" : "▶ Preview voice"}</button>
              <div role="status" aria-live="polite" style={{ minHeight: 18, marginTop: 6, color: T.sub, fontSize: 12 }}>{preview || "Listen first · no microphone needed"}</div>
            </div>
          )}

          {/* last exchange — only when NOT live (the live caption above is the single
              source during a call; showing both here collided/duplicated the text) */}
          {messages.length > 0 && !isLive && (
            <div style={{ position: "absolute", bottom: 8, left: 22, right: 22, maxHeight: 110, overflow: "hidden", display: "flex", flexDirection: "column", gap: 6, maskImage: "linear-gradient(to bottom, transparent, black 28%)" }}>
              {messages.slice(-3).map((m, i) => (
                <div key={i} style={{ color: m.role === "user" ? T.sub : T.text, fontSize: 12.5, lineHeight: 1.5, textAlign: m.role === "user" ? "right" : "left" }}>
                  {m.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* accessibility: type-instead-of-speak toggle */}
        {(state === S.IDLE || isLive) && (
          <div style={{ textAlign: "center", position: "relative", zIndex: 5 }}>
            {state === S.IDLE && !typeMode && <p style={{ padding: "0 24px", marginBottom: 8, color: T.sub, fontSize: 12 }}>Allow microphone access when asked. Spoken turns use our speech transcription service.</p>}
            <button onClick={toggleTypeMode} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, padding: "6px 10px" }}>
              {typeMode ? "🎙 Switch to voice" : "✍️ Can't speak? Type instead"}
            </button>
          </div>
        )}

        {/* controls */}
        <div style={{ padding: "10px 22px 30px", display: "flex", justifyContent: "center", alignItems: "center", gap: 22, position: "relative", zIndex: 5 }}>
          {state === S.IDLE && (
            <button onClick={startCall} disabled={!isLoaded || !isSignedIn} style={{ width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 16, padding: "16px 0", borderRadius: 100, cursor: "pointer", fontFamily: font, boxShadow: "0 12px 36px rgba(255,94,126,0.4)", opacity: isLoaded && isSignedIn ? 1 : 0.6 }}>
              {buildMode ? "🎙 Start — talk to Rico" : `📞 Call ${agentObj.name}`}
            </button>
          )}
          {state === S.IDLE && buildMode && (
            <div style={{ position: "absolute", bottom: 70, left: 22, right: 22 }}>
              <div style={{ textAlign: "center", color: T.sub, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>Just chat naturally — Rico learns your character, and the more you talk the closer your twin gets to unlocking.</div>
              <label onClick={() => { const v = !cloneConsentRef.current; cloneConsentRef.current = v; setCloneConsent(v); }} style={{ display: "flex", gap: 9, alignItems: "flex-start", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${T.line}`, background: cloneConsent ? T.grad : "transparent", color: "white", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{cloneConsent ? "✓" : ""}</span>
                <span style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.45, maxWidth: 280 }}>Also clone <b style={{ color: T.text }}>my own voice</b> from this chat, so my twin sounds like me on calls.</span>
              </label>
            </div>
          )}
          {state === S.CONNECTING && <div style={{ color: T.sub, fontWeight: 600, fontSize: 14, padding: "16px 0" }}>Connecting… <button onClick={endCall}>Cancel call</button></div>}
          {isLive && typeMode && (<>
            <input value={callInput} onChange={e => setCallInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendTyped(); }}
              placeholder={state === S.SPEAKING ? "Rico is speaking…" : state === S.THINKING ? "Rico is thinking…" : "Type your message…"}
              disabled={state === S.THINKING || state === S.SPEAKING} autoFocus
              style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 15, padding: "14px 16px", borderRadius: 100, outline: "none", fontFamily: font, opacity: (state === S.THINKING || state === S.SPEAKING) ? 0.5 : 1 }} />
            <button onClick={sendTyped} disabled={!callInput.trim() || state === S.THINKING || state === S.SPEAKING}
              style={{ width: 54, height: 54, borderRadius: "50%", background: T.grad, border: "none", color: "white", fontSize: 20, cursor: callInput.trim() ? "pointer" : "not-allowed", opacity: (!callInput.trim() || state === S.THINKING || state === S.SPEAKING) ? 0.5 : 1, flexShrink: 0 }}>➤</button>
            <button aria-label="End call" onClick={endCall} style={{ width: 54, height: 54, borderRadius: "50%", background: "#e63946", border: "none", fontSize: 18, cursor: "pointer", flexShrink: 0 }}>📵</button>
          </>)}
          {isLive && !typeMode && (<>
            <button aria-label={muted ? "Unmute microphone" : "Mute microphone"} onClick={toggleMute} style={{ width: 56, height: 56, borderRadius: "50%", background: muted ? "#ff5e7e33" : T.panel2, border: `1px solid ${T.line}`, fontSize: 19, cursor: "pointer" }}>{muted ? "🔇" : "🎙"}</button>
            <button aria-label={state === S.LISTENING ? "Send spoken message" : "Retry microphone"} onClick={micPress} disabled={state === S.THINKING || state === S.SPEAKING}
              style={{ width: 74, height: 74, borderRadius: "50%", background: state === S.LISTENING ? `${T.violet}` : T.panel2, border: `1px solid ${T.line}`, color: "white", fontSize: 24, cursor: (state === S.THINKING || state === S.SPEAKING) ? "not-allowed" : "pointer", opacity: (state === S.THINKING || state === S.SPEAKING) ? 0.45 : 1 }}>
              {state === S.LISTENING ? "✓" : "▶"}
            </button>
            <button aria-label="End call" onClick={endCall} style={{ width: 56, height: 56, borderRadius: "50%", background: "#e63946", border: "none", fontSize: 19, cursor: "pointer" }}>📵</button>
          </>)}
          {state === S.ENDED && (
            <div style={{ width: "100%" }}>
              {buildMode && cloneStatus && (
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, marginBottom: 12, color: cloneStatus === "done" ? "#4ade80" : cloneStatus === "cloning" ? T.sub : T.sub }}>
                  {cloneStatus === "cloning" && "✨ Cloning your voice onto your twin…"}
                  {cloneStatus === "done" && "✓ Your twin now talks in your voice"}
                  {cloneStatus === "short" && "Voice not cloned — too little speech this time. Try a longer chat."}
                  {cloneStatus === "notready" && "Keep chatting a bit more — your twin needs to know you before it gets your voice."}
                  {cloneStatus === "fail" && (cloneErr || "Couldn't clone your voice this time — you can add it later from your profile.")}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setState(S.IDLE); setMessages([]); setDuration(0); setCloneStatus(""); }} style={{ flex: 1, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 14.5, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{buildMode ? "Talk more" : "Call again"}</button>
                <a href="/" style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 14.5, padding: "14px 0", borderRadius: 100, textAlign: "center", textDecoration: "none" }}>Done</a>
              </div>
            </div>
          )}
        </div>

        {isLive && !typeMode && serverInputRef.current && state === S.LISTENING && (
          <div aria-label="Microphone input level" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(micLevel * 100)} style={{ position: "absolute", bottom: 110, left: "35%", width: "30%", height: 6, background: T.panel2, borderRadius: 8 }}>
            <div style={{ width: `${Math.max(2, micLevel * 100)}%`, height: "100%", background: T.violet, borderRadius: 8 }} />
          </div>
        )}
        {outputError && <div role="alert" style={{ padding: "8px 22px", color: T.pink, fontSize: 12, textAlign: "center" }}>{outputError}{isLive && " You can still read the reply above."}</div>}
        {(error || (voiceMode === "classic" && voiceNotice)) && (
          <div role={error ? "alert" : "status"} style={{ position: "absolute", top: 64, left: 20, right: 20, textAlign: "center", color: error ? T.pink : T.sub, fontSize: 12, fontWeight: 600, zIndex: 6 }}>{error || voiceNotice}{error && isLive && !typeMode && state === S.ACTIVE && <button onClick={() => { serverInputRef.current = true; mutedRef.current = false; setMuted(false); listen(); }} style={{ display: "block", margin: "8px auto", padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer" }}>Retry microphone</button>}</div>
        )}

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

