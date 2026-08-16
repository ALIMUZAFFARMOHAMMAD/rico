// Floating group voice call — works simultaneously with GameBoard (z-index 140).
// Minimizes to a pill; each character speaks in their own TTS voice.
import { useState, useRef, useCallback, useEffect } from "react";
import TonyCharacter from "./TonyCharacter";
import { getAgent } from "../lib/agents";

const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.07)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6" };
const font = "'Inter',system-ui,sans-serif";

const S = { IDLE: "idle", LISTENING: "listening", THINKING: "thinking", SPEAKING: "speaking" };

export default function GroupVoiceCall({ group, userName, userId, lang, onMessage, onEnd }) {
  const [state, setState] = useState(S.IDLE);
  const [expanded, setExpanded] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [speaker, setSpeaker] = useState(null); // agentId currently speaking
  const [log, setLog] = useState([]); // [{from, text}]
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const recRef = useRef(null);
  const activeRef = useRef(true);
  const mutedRef = useRef(false);
  const stateRef = useRef(S.IDLE);
  const histRef = useRef(group.messages || []);
  useEffect(() => { stateRef.current = state; }, [state]);

  // stop everything on unmount
  useEffect(() => () => {
    activeRef.current = false;
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try { recRef.current?.stop(); } catch (e) {}
  }, []);

  // play a single agent's reply via ElevenLabs TTS, falling back to browser synth
  const playReply = useCallback(async (text, agentId) => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: lang || "en", agentId }) });
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise(res => { audio.onended = res; audio.onerror = res; audio.play().catch(res); setTimeout(res, text.length * 95 + 3500); });
        URL.revokeObjectURL(url);
        audioRef.current = null;
        return;
      }
    } catch (e) {}
    // browser fallback
    await new Promise(res => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.onend = res; u.onerror = res;
      window.speechSynthesis.speak(u);
      setTimeout(res, text.length * 80 + 3000);
    });
  }, [lang]);

  const listen = useCallback(() => {
    if (!activeRef.current || mutedRef.current) { setState(S.IDLE); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setState(S.IDLE); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = lang === "ar" ? "ar-SA" : "en-US";
    let final = "";
    rec.onresult = e => { final = Array.from(e.results).map(r => r[0].transcript).join(""); setTranscript(final); };
    rec.onend = async () => {
      setTranscript("");
      if (!activeRef.current) return;
      if (!final.trim()) { if (!mutedRef.current) setTimeout(listen, 300); else setState(S.IDLE); return; }
      setState(S.THINKING); setSpeaker(null);
      const withUser = [...histRef.current, { from: "user", text: final }];
      histRef.current = withUser;
      setLog(l => [...l, { from: "user", text: final }]);
      if (onMessage) onMessage({ from: "user", text: final });
      try {
        const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", groupName: group.name, agents: group.agentIds, messages: withUser, userName, language: lang || "en" }) });
        const d = await r.json();
        for (const rep of d.replies || []) {
          if (!activeRef.current) break;
          setSpeaker(rep.agentId); setState(S.SPEAKING);
          setLog(l => [...l, { from: rep.agentId, text: rep.text }]);
          histRef.current = [...histRef.current, { from: rep.agentId, text: rep.text }];
          if (onMessage) onMessage({ from: rep.agentId, text: rep.text });
          await playReply(rep.text, rep.agentId);
        }
      } catch (e) {}
      setSpeaker(null);
      if (activeRef.current && !mutedRef.current) setTimeout(listen, 400);
      else setState(S.IDLE);
    };
    recRef.current = rec;
    try { rec.start(); setState(S.LISTENING); } catch (e) { setTimeout(listen, 500); }
  }, [group, lang, userName, onMessage, playReply]);

  const start = useCallback(() => { listen(); }, [listen]);

  const toggleMute = () => {
    const v = !mutedRef.current; mutedRef.current = v; setMuted(v);
    if (v) { try { recRef.current?.stop(); } catch (e) {} window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } setState(S.IDLE); }
    else if (stateRef.current === S.IDLE) listen();
  };

  const end = () => {
    activeRef.current = false;
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try { recRef.current?.stop(); } catch (e) {}
    onEnd?.();
  };

  const activeSpeaker = speaker ? getAgent(speaker) : null;
  const pulseColor = state === S.LISTENING ? T.violet : state === S.SPEAKING ? T.pink : T.sub;
  const NAMES = (group.agentIds || []).map(id => getAgent(id).name).join(", ");

  // minimized pill
  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)} style={{ position: "fixed", bottom: 80, right: 14, zIndex: 140, background: T.bg, border: `1.5px solid ${T.line}`, borderRadius: 100, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", boxShadow: "0 8px 28px rgba(0,0,0,0.55)", fontFamily: font }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: state === S.LISTENING ? T.violet : state === S.SPEAKING ? T.pink : state === S.THINKING ? "#f5c84b" : T.sub, animation: state !== S.IDLE ? "grp-pulse 1.2s ease-in-out infinite" : "none" }} />
        <span style={{ color: T.text, fontWeight: 700, fontSize: 12 }}>{state === S.SPEAKING && activeSpeaker ? `${activeSpeaker.name} speaking` : state === S.LISTENING ? "Listening…" : state === S.THINKING ? "Thinking…" : "Group call"}</span>
        <span style={{ color: T.sub, fontSize: 12 }}>🎙</span>
        <style>{`@keyframes grp-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", width: "min(96vw,420px)", zIndex: 140, background: "#12101e", border: `1.5px solid ${T.line}`, borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.7)", fontFamily: font, overflow: "hidden" }}>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${T.line}` }}>
        <div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>🎙 Group Call</div>
          <div style={{ color: T.sub, fontSize: 11, marginTop: 1 }}>{NAMES}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setExpanded(false)} style={{ background: T.panel, border: `1px solid ${T.line}`, color: T.sub, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 13 }}>—</button>
          <button onClick={end} style={{ background: "#e63946", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      </div>

      {/* speaker area */}
      <div style={{ padding: "14px 16px", minHeight: 72, display: "flex", alignItems: "center", gap: 12 }}>
        {activeSpeaker ? (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${T.pink}`, overflow: "hidden", background: "#161226", display: "flex", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 0 3px ${T.pink}44` }}>
              <div style={{ marginTop: 2 }}><TonyCharacter size={72} look={activeSpeaker.look || {}} float="none" animated={false} pose="down" /></div>
            </div>
            <div>
              <div style={{ color: T.pink, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5 }}>{activeSpeaker.name.toUpperCase()} · SPEAKING</div>
              <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.4, marginTop: 3 }}>{log.filter(m => m.from === speaker).slice(-1)[0]?.text || ""}</div>
            </div>
          </>
        ) : (
          <div style={{ color: state === S.LISTENING ? T.violet : state === S.THINKING ? "#f5c84b" : T.sub, fontSize: 13.5, fontWeight: 600, flex: 1, textAlign: "center" }}>
            {state === S.LISTENING ? `🎙 Listening… ${transcript ? `"${transcript}"` : ""}` : state === S.THINKING ? "💭 Getting responses…" : state === S.IDLE && log.length === 0 ? "Tap 🎙 to start talking with the group" : "Ready for your next message"}
          </div>
        )}
      </div>

      {/* recent log */}
      {log.length > 0 && (
        <div style={{ maxHeight: 80, overflowY: "auto", padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {log.slice(-3).map((m, i) => {
            const a = m.from !== "user" ? getAgent(m.from) : null;
            return (
              <div key={i} style={{ fontSize: 11.5, color: m.from === "user" ? T.sub : T.text, textAlign: m.from === "user" ? "right" : "left" }}>
                {a && <span style={{ color: T.violet, fontWeight: 700 }}>{a.name}: </span>}{m.text}
              </div>
            );
          })}
        </div>
      )}

      {/* controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px 16px 16px", borderTop: `1px solid ${T.line}` }}>
        {state === S.IDLE && log.length === 0 ? (
          <button onClick={start} style={{ background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 14, padding: "12px 32px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>🎙 Start talking</button>
        ) : (
          <>
            <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} style={{ width: 48, height: 48, borderRadius: "50%", background: muted ? "#ff5e7e22" : T.panel, border: `1px solid ${muted ? T.pink : T.line}`, fontSize: 20, cursor: "pointer" }}>{muted ? "🔇" : "🎙"}</button>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.panel, border: `1.5px solid ${pulseColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, animation: state !== S.IDLE ? "grp-pulse 1.4s ease-in-out infinite" : "none" }}>
              {state === S.LISTENING ? "👂" : state === S.THINKING ? "💭" : state === S.SPEAKING ? "🔊" : "💬"}
            </div>
            <button onClick={end} style={{ width: 48, height: 48, borderRadius: "50%", background: "#e6394622", border: `1px solid #e63946`, fontSize: 20, cursor: "pointer" }}>📵</button>
          </>
        )}
      </div>
      <style>{`@keyframes grp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.06)}}`}</style>
    </div>
  );
}
