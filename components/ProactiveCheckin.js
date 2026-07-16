// Flagship #1 — "Rico texts you first" (client surface).
// Fetches a memory-grounded proactive check-in and shows it as a dismissible card
// at the top of Chats. Tapping it opens the chat with that friend, message in hand.
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "rico_checkin_dismissed";

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
            fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "checkin_reply", variant: data.lapsed ? "missed" : "checkin" }) }).catch(() => {});
            dismiss();
            onOpen?.(data.agentId);
          }}
          style={{
            display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
            padding: "13px 14px", borderRadius: 18, marginBottom: 14,
            background: `linear-gradient(140deg, ${T.violet}26, ${T.pink}1c)`,
            border: `1px solid ${T.violet}55`, backdropFilter: "blur(10px)",
            boxShadow: `0 8px 26px ${T.violet}22`,
          }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0, fontSize: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: T.grad || `linear-gradient(140deg, ${T.violet}, ${T.pink})`,
            boxShadow: `0 4px 14px ${T.pink}44`,
          }}>
            {data.emoji || "💬"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <span style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>{data.name}</span>
              <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase",
                color: T.violet, background: `${T.violet}22`, padding: "2px 7px", borderRadius: 100,
              }}>
                {data.lapsed ? "missed you 💜" : "texted you"}
              </span>
              {data.streak >= 2 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                  color: T.text, background: `${T.pink}22`, padding: "2px 7px", borderRadius: 100,
                }}>
                  🔥 {data.streak} days in a row
                </span>
              )}
            </div>
            <div style={{ color: T.text, fontSize: 13.5, lineHeight: 1.45, opacity: 0.95 }}>{data.message}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ color: T.violet, fontSize: 12, fontWeight: 700, fontFamily: font }}>Reply →</span>
              <button
                onClick={playVoice}
                disabled={voice === "loading"}
                aria-label="Play voice note"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${T.violet}1f`, border: `1px solid ${T.violet}55`, color: T.text, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font }}
              >
                {voice === "loading" ? "…generating" : voice === "playing" ? "⏸ Stop" : "🔊 Voice note"}
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{ background: "transparent", border: "none", color: T.sub, fontSize: 16, cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0 }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
