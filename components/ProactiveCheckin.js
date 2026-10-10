// Flagship #1 — "Rico texts you first" (client surface).
// Fetches a memory-grounded proactive check-in and shows it as a dismissible card
// at the top of Chats. Tapping it opens the chat with that friend, message in hand.
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "rico_checkin_dismissed";
const SHOWN_KEY = "rico_checkin_shown";

export default function ProactiveCheckin({ userId, lang, T, font, onOpen }) {
  const [data, setData] = useState(null);
  const [voice, setVoice] = useState("idle"); // idle | loading | playing
  const audioRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const url = `/api/checkin?userId=${encodeURIComponent(userId)}&lang=${encodeURIComponent(lang || "en")}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (!alive || !d?.ok || !d.message) return;
        let dismissed = "";
        try { dismissed = localStorage.getItem(DISMISS_KEY) || ""; } catch (e) {}
        if (dismissed === d.message) return; // already waved this one away
        setData(d);
        // Instrument: the proactive check-in was actually shown (Flagship #1 impact).
        // Tagged by variant (normal vs. "missed you") so /api/stats can rank which pulls more replies.
        // Count each message once — every Chats remount re-fired this, inflating the reply-rate denominator.
        let seen = "";
        try { seen = localStorage.getItem(SHOWN_KEY) || ""; localStorage.setItem(SHOWN_KEY, d.message); } catch (e) {}
        if (seen === d.message) return;
        fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "checkin_shown", variant: d.lapsed ? "missed" : "checkin" }) }).catch(() => {});
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [userId, lang]);

  const dismiss = (e) => {
    e?.stopPropagation();
    try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch (e2) {}
    try { if (data?.message) localStorage.setItem(DISMISS_KEY, data.message); } catch (e2) {}
    setData(null);
  };

  // Voice-note check-in: hear the message in the friend's own voice (generated on tap → cost-controlled).
  const playVoice = async (e) => {
    e.stopPropagation();
    if (voice === "loading") return;
    if (voice === "playing" && audioRef.current) { audioRef.current.pause(); audioRef.current = null; setVoice("idle"); return; }
    try {
      setVoice("loading");
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "checkin_voice" }) }).catch(() => {});
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: data.message, agentId: data.agentId }) });
      if (!r.ok) { setVoice("idle"); return; }
      const blob = await r.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setVoice("idle");
      audio.onerror = () => setVoice("idle");
      setVoice("playing");
      audio.play().catch(() => setVoice("idle"));
    } catch (err) { setVoice("idle"); }
  };

  useEffect(() => () => { try { if (audioRef.current) audioRef.current.pause(); } catch (e) {} }, []);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={() => {
            // Instrument: the check-in earned a reply (user tapped through to chat).
            fetch("/api/track", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "checkin_reply", variant: data.lapsed ? "missed" : "checkin" }) }).catch(() => {});
            dismiss();
            onOpen?.(data.agentId);
          }}
          style={{
            cursor: "pointer", padding: 16, borderRadius: 22, marginBottom: 14,
            background: "#1d1a30", border: "1px solid rgba(167,139,250,0.35)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: "#5b3fd6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 19 }} className="rm-display">
              {(data.name || "?").slice(0, 1)}
              <span style={{ position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: "50%", background: "#2dd4bf", border: "2px solid #1d1a30", animation: "rm-ring 1.6s ease-out infinite" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 14.5 }}>{data.lapsed ? `${data.name} missed you` : `${data.name} texted you first`}</div>
              <div style={{ color: "#c4b5fd", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4 }}>
                {data.lapsed ? `IT'S BEEN ${data.daysAway} DAYS` : "REMEMBERED FROM YOUR LAST CHAT"}
                {data.streak >= 2 ? ` · ${data.streak}-DAY STREAK` : ""}
              </div>
            </div>
            <button onClick={dismiss} aria-label="Dismiss" style={{ width: 44, height: 44, margin: "-8px -8px 0 0", border: "none", background: "transparent", color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div style={{ marginTop: 10, color: "#ece9fb", fontSize: 14.5, lineHeight: 1.45 }}>{data.message}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <button onClick={playVoice} disabled={voice === "loading"} aria-label={voice === "playing" ? "Pause voice note" : "Play voice note"} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: T.grad, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: voice === "loading" ? 0.6 : 1 }}>
              {voice === "playing"
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>}
            </button>
            <div aria-hidden="true" style={{ flex: 1, height: 30, display: "flex", alignItems: "center", gap: 3 }}>
              {[10, 18, 26, 14, 22, 30, 16, 24, 12, 28, 20, 14, 26, 18, 10, 22, 30, 16, 12, 24].map((h, i) => (
                <span key={i} style={{ flex: 1, height: h, borderRadius: 2, background: "#a78bfa", transformOrigin: "center", animation: voice === "playing" ? `rm-wave .9s ease-in-out ${(i * 0.06).toFixed(2)}s infinite` : "none", opacity: voice === "loading" ? 0.5 : 1 }} />
              ))}
            </div>
            <span style={{ color: T.sub, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{voice === "loading" ? "loading…" : "voice note"}</span>
          </div>
          <button style={{ marginTop: 12, width: "100%", height: 44, borderRadius: 14, border: "none", background: "#2b2742", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: font }}>Reply to {data.name}</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
