// A quick, friendly feature tour shown once after sign-in (post-consent).
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TonyCharacter from "./TonyCharacter";

const T = { bg: "#0f0e17", panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", violet: "#8b5cf6" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

const STEPS = [
  { emote: "wave", expr: "😄", icon: "👋", title: "Welcome to Rico", body: "Your people, always. Match, chat and voice-call with AI friends — each one a real character with their own personality." },
  { sample: "checkin", icon: "💬", title: "Your friends text you first", body: "Not just when you open the app — Rico's friends reach out on their own, referencing what's actually going on with you. Here's what that looks like:" },
  { emote: "peek", expr: "😊", icon: "💘", title: "Swipe to meet friends", body: "Browse the deck — swipe right (or tap ♥) to connect, left to pass. The moment you match, they message you first." },
  { emote: "celebrate", expr: "😄", icon: "🧠", title: "Every friend is an expert", body: "Tony for career, Arjun for sport, Luna for films, Baba for life advice, Hari · Yusuf · Grace for faith, Anand for yoga — and more. They each stay in their lane." },
  { emote: "nod", expr: "😊", icon: "💬", title: "Talks your way", body: "Message or voice-call any friend in 10 languages — English, Hindi, Spanish, Chinese, German, French, Portuguese, Japanese, Korean & Arabic. Rico even picks up your slang and catchphrases, and starts talking the way you do." },
  { emote: "dance", expr: "🔮", icon: "🪞", title: "Make your AI Twin", body: "As Rico gets to know you, create a twin of yourself that others can meet. Add your real voice, and turn a selfie into your avatar." },
  { emote: "wave", expr: "😄", icon: "👥", title: "Groups & clubs", body: "Start a group with a few friends, or join clubs — Movie Club, Game Day, Gita Circle, and more." },
  { sample: "memory", icon: "🔒", title: "They remember you — and it's yours", body: "The longer you talk, the more your friends know. You control all of it in the Memory Vault: see it, wipe it, anytime. Friendship only, AI always honestly labeled." },
];

const PREVIEW_BADGE = { display: "inline-block", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: T.violet, background: `${T.violet}22`, padding: "2px 9px", borderRadius: 100, marginBottom: 10 };

// Static mock of the real ProactiveCheckin card (no fetch, no props) — shows a new user
// exactly what a real check-in looks like before they have any chat history to generate one.
function MockCheckin() {
  return (
    <div style={{ width: "100%", maxWidth: 320, display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", padding: "13px 14px", borderRadius: 18, background: `linear-gradient(140deg, ${T.violet}26, #ff5e7e1c)`, border: `1px solid ${T.violet}55` }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", background: T.grad }}>🎓</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ color: T.text, fontWeight: 800, fontSize: 13.5 }}>Tony</span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: T.violet, background: `${T.violet}22`, padding: "2px 6px", borderRadius: 100 }}>texted you</span>
        </div>
        <div style={{ color: T.text, fontSize: 13, lineHeight: 1.4, opacity: 0.95 }}>"how'd your exam go? been thinking about you 💜"</div>
      </div>
    </div>
  );
}

// Static mock of the real MemorySpotlight chips.
function MockChips() {
  const items = ["Studying abroad", "Prepping for interviews", "Misses home"];
  return (
    <div style={{ width: "100%", maxWidth: 320, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {items.map((it, i) => (
        <span key={i} style={{ color: T.text, fontSize: 12, fontWeight: 600, background: `${T.violet}1f`, border: `1px solid ${T.violet}3a`, padding: "6px 12px", borderRadius: 100 }}>{it}</span>
      ))}
    </div>
  );
}

export default function Onboarding({ onDone }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const next = () => last ? onDone() : setI(i + 1);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, height: "100%", display: "flex", flexDirection: "column", padding: "16px 24px 26px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onDone} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font, padding: 6 }}>Skip</button>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          {!step.sample && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <TonyCharacter size={170} look={{ hoodie: "#8b5cf6", hoodieD: "#7146d1" }} float="none" animated={false} emote={step.emote} expr={step.expr} />
              <div style={{ position: "absolute", bottom: 6, right: -6, fontSize: 34, filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" }}>{step.icon}</div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {step.sample && <div style={PREVIEW_BADGE}>preview</div>}
              <div style={{ fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: -0.4 }}>{step.title}</div>
              <div style={{ color: T.sub, fontSize: 14, lineHeight: 1.6, marginTop: 10, maxWidth: 320 }}>{step.body}</div>
              {step.sample === "checkin" && <div style={{ marginTop: 16 }}><MockCheckin /></div>}
              {step.sample === "memory" && <div style={{ marginTop: 16 }}><MockChips /></div>}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* progress dots */}
        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 18 }}>
          {STEPS.map((_, k) => (
            <div key={k} onClick={() => setI(k)} style={{ height: 7, borderRadius: 100, cursor: "pointer", width: k === i ? 22 : 7, background: k === i ? T.violet : T.panel2, transition: "width 0.25s, background 0.25s" }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {i > 0 && <button onClick={() => setI(i - 1)} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 15, padding: "14px 22px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Back</button>}
          <button onClick={next} style={{ flex: 1, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{last ? "Start exploring" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
