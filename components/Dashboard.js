// Personality Dashboard — the "who am I here" view. Pulls /api/profile (Big-Five
// traits + chat/voice/games activity aggregated across every conversation) and turns
// it into a warm, friendship-flavoured snapshot: a Connection Score, a personality
// archetype, Big-Five bars, per-pillar score cards, and a plain-language read-out.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const C = {
  text: "#f5f3ff", sub: "#9b97b0", line: "rgba(255,255,255,0.1)",
  panel: "rgba(255,255,255,0.055)", panel2: "rgba(255,255,255,0.09)",
  grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6",
};
const font = "'Inter',system-ui,-apple-system,sans-serif";

// Friendly names for the Big Five (we never show clinical labels to users).
const TRAITS = [
  { k: "O", label: "Openness", emoji: "🌈", blurb: "curious & imaginative", color: "#ff8fb1" },
  { k: "C", label: "Drive", emoji: "🎯", blurb: "focused & dependable", color: "#8fb6ff" },
  { k: "E", label: "Social", emoji: "🔥", blurb: "outgoing & energising", color: "#ffb55e" },
  { k: "A", label: "Empathy", emoji: "🤝", blurb: "warm & considerate", color: "#7ddba3" },
  { k: "N", label: "Reflection", emoji: "🌙", blurb: "sensitive & self-aware", color: "#c9a2f0" },
];
const ARCH = {
  O: { name: "The Explorer", line: "You chase ideas, novelty and the big questions." },
  C: { name: "The Builder", line: "You turn good intentions into real follow-through." },
  E: { name: "The Spark", line: "You bring the energy and pull people together." },
  A: { name: "The Heart", line: "You lead with warmth and look after your people." },
  N: { name: "The Deep Feeler", line: "You feel things fully and reflect deeply." },
};

function band(score) {
  return score >= 76 ? "Inner circle" : score >= 51 ? "In the groove" : score >= 21 ? "Warming up" : "Just getting started";
}

export default function Dashboard({ userId, userName, onOpenGroups }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let on = true;
    fetch(`/api/profile?userId=${userId}`)
      .then(r => r.json())
      .then(d => { if (on) { setData(d && d.ok ? d : { empty: true }); setLoading(false); } })
      .catch(() => { if (on) { setData({ empty: true }); setLoading(false); } });
    return () => { on = false; };
  }, [userId]);

  if (loading) return (
    <div style={{ borderRadius: 22, padding: 22, background: C.panel, border: `1px solid ${C.line}`, marginBottom: 14, textAlign: "center", color: C.sub, fontSize: 13 }}>
      Pulling your profile together…
    </div>
  );

  const ocean = data?.ocean;
  const chat = data?.chat || { totalMessages: 0, friendCount: 0, friends: [] };
  const voice = data?.voice || { calls: 0, minutes: 0 };
  const games = data?.games || { total: 0, byKey: {} };
  const days = data?.activity?.days || 0;

  // per-pillar scores (capped) → a single Connection Score out of 100
  const chatScore = Math.min(40, Math.round(chat.totalMessages * 0.8 + chat.friendCount * 3));
  const voiceScore = Math.min(25, Math.round(voice.minutes * 5 + voice.calls * 3));
  const gameScore = Math.min(20, games.total * 4);
  const streakScore = Math.min(15, days * 2);
  const connection = Math.min(100, chatScore + voiceScore + gameScore + streakScore);

  const hasAnything = chat.totalMessages > 0 || voice.calls > 0 || games.total > 0;

  // empty state — nudge them to feed the three pillars
  if (!hasAnything) return (
    <div style={{ borderRadius: 22, padding: 20, background: `linear-gradient(140deg,${C.violet}22,${C.pink}14)`, border: `1px solid ${C.line}`, marginBottom: 14 }}>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 17 }}>🧭 Your personality dashboard</div>
      <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
        As you <b style={{ color: C.text }}>chat</b>, <b style={{ color: C.text }}>voice-call</b> and <b style={{ color: C.text }}>play games</b> with your friends, Rico quietly learns who you are and builds a picture of your personality and strengths right here.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {[["💬", "Chat"], ["📞", "Call"], ["🎮", "Play"]].map(([i, l]) => (
          <div key={l} style={{ flex: 1, textAlign: "center", padding: "12px 0", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 14 }}>
            <div style={{ fontSize: 20 }}>{i}</div><div style={{ color: C.sub, fontSize: 11.5, fontWeight: 600, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={() => { window.location.href = "/classroom"; }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontFamily: font, marginTop: 10 }}>
        <div style={{ fontSize: 20 }}>🎓</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>Or become the teacher</div>
          <div style={{ color: C.sub, fontSize: 11, lineHeight: 1.4 }}>Teach a friend any subject in the AI Tutor.</div>
        </div>
        <div style={{ color: C.sub, fontSize: 16 }}>→</div>
      </button>
    </div>
  );

  // top trait → archetype
  let topK = "A";
  if (ocean) topK = TRAITS.map(t => t.k).reduce((a, b) => (ocean[b] > ocean[a] ? b : a), "O");
  const arch = ARCH[topK];

  const pillars = [
    { icon: "💬", label: "Chats", main: chat.totalMessages, sub: `${chat.friendCount} friend${chat.friendCount === 1 ? "" : "s"}`, score: chatScore, cap: 40 },
    { icon: "📞", label: "Voice", main: voice.minutes, sub: `${voice.calls} call${voice.calls === 1 ? "" : "s"} · min`, score: voiceScore, cap: 25 },
    { icon: "🎮", label: "Games", main: games.total, sub: "played", score: gameScore, cap: 20 },
  ];

  // plain-language read-out tying the three pillars + personality together
  const readout = (() => {
    const bits = [];
    bits.push(ocean ? `You read as ${arch.name.toLowerCase().replace("the ", "")} — ${arch.line.toLowerCase()}` : `Rico is still sketching your personality.`);
    const acts = [];
    if (chat.totalMessages > 0) acts.push(`${chat.totalMessages} messages across ${chat.friendCount} friend${chat.friendCount === 1 ? "" : "s"}`);
    if (voice.calls > 0) acts.push(`${voice.calls} voice call${voice.calls === 1 ? "" : "s"}`);
    if (games.total > 0) acts.push(`${games.total} game${games.total === 1 ? "" : "s"}`);
    if (acts.length) bits.push(`So far you've shared ${acts.join(", ").replace(/, ([^,]*)$/, " and $1")}.`);
    bits.push(connection >= 76 ? "These are your people now." : connection >= 51 ? "You're building something real here." : "Keep showing up — it only gets warmer.");
    return bits.join(" ");
  })();

  return (
    <div style={{ marginBottom: 14 }}>
      {/* hero — connection score + archetype */}
      <div style={{ borderRadius: 22, padding: 18, background: `linear-gradient(140deg,${C.violet}2e,${C.pink}1c)`, border: `1px solid ${C.line}`, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Ring value={connection} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.sub, fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Connection score</div>
            {ocean && <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: -0.5, background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 2 }}>{arch.name}</div>}
            <div style={{ color: C.text, fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{band(connection)} · {days} active day{days === 1 ? "" : "s"}</div>
          </div>
        </div>
        <div style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.55, marginTop: 12 }}>{readout}</div>
      </div>

      {/* pillar score cards — chat / voice / games */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
        {pillars.map(p => (
          <div key={p.label} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 19 }}>{p.icon}</div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 22, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{p.main}</div>
            <div style={{ color: C.sub, fontSize: 10.5, fontWeight: 600 }}>{p.label}</div>
            <div style={{ color: C.sub, fontSize: 9.5, marginTop: 1 }}>{p.sub}</div>
            <div style={{ height: 4, borderRadius: 100, background: C.panel2, overflow: "hidden", marginTop: 8 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((p.score / p.cap) * 100)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} style={{ height: "100%", background: C.grad }} />
            </div>
          </div>
        ))}
      </div>

      {/* Big Five bars */}
      {ocean && (
        <div style={{ borderRadius: 22, padding: 18, background: C.panel, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Your five colours</div>
          <div style={{ color: C.sub, fontSize: 11.5, marginBottom: 12 }}>Learned from how you talk with your friends.</div>
          {TRAITS.map(t => (
            <div key={t.k} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ color: C.text, fontSize: 12.5, fontWeight: 600 }}>{t.emoji}&nbsp; {t.label} <span style={{ color: C.sub, fontWeight: 400 }}>· {t.blurb}</span></span>
                <span style={{ color: C.sub, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{ocean[t.k]}</span>
              </div>
              <div style={{ height: 8, borderRadius: 100, background: C.panel2, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(3, ocean[t.k])}%` }} transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.05 }} style={{ height: "100%", background: `linear-gradient(90deg, ${t.color}, ${t.color}cc)`, borderRadius: 100 }} />
              </div>
            </div>
          ))}
          {data.riasec && (
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: C.sub, fontSize: 11.5, fontWeight: 600 }}>Career leanings:</span>
              {data.riasec.split("").map((c, i) => <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.violet, background: `${C.violet}22`, border: `1px solid ${C.line}`, padding: "3px 9px", borderRadius: 100 }}>{RIASEC[c] || c}</span>)}
            </div>
          )}
        </div>
      )}

      {/* group-chat surfacing — connected characters in one room */}
      <button onClick={onOpenGroups} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: `linear-gradient(140deg,${C.violet}22,${C.pink}14)`, border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 16px", cursor: "pointer", fontFamily: font }}>
        <div style={{ fontSize: 22 }}>👥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>Make a group chat</div>
          <div style={{ color: C.sub, fontSize: 11.5, lineHeight: 1.4 }}>Put your connected friends in one room — like a WhatsApp group, but everyone replies.</div>
        </div>
        <div style={{ color: C.sub, fontSize: 18 }}>→</div>
      </button>

      {/* AI Tutor surfacing — teach a friend, learn it yourself */}
      <button onClick={() => { window.location.href = "/classroom"; }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: `linear-gradient(140deg,${C.pink}1c,${C.violet}22)`, border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 16px", cursor: "pointer", fontFamily: font, marginTop: 10 }}>
        <div style={{ fontSize: 22 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>Become the teacher</div>
          <div style={{ color: C.sub, fontSize: 11.5, lineHeight: 1.4 }}>Teach a friend any subject — they learn it, and so do you. The best way to master anything.</div>
        </div>
        <div style={{ color: C.sub, fontSize: 18 }}>→</div>
      </button>
    </div>
  );
}

const RIASEC = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };

function Ring({ value }) {
  const r = 30, circ = 2 * Math.PI * r, off = circ * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <defs><linearGradient id="dashRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <motion.circle cx="38" cy="38" r={r} fill="none" stroke="url(#dashRing)" strokeWidth="7" strokeLinecap="round"
          transform="rotate(-90 38 38)" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: off }} transition={{ type: "spring", stiffness: 90, damping: 20 }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#f5f3ff", fontWeight: 900, fontSize: 20, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
