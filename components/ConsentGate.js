// Shown once after sign-in until accepted. Plain-language Terms, Privacy & AI consent.
import { useState } from "react";
import { CONSENT_VERSION } from "../lib/consent";

const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.055)", panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: T.text, fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{icon} {title}</div>
      <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function ConsentGate({ userId, onAccept }) {
  const [adult, setAdult] = useState(false);
  const [understand, setUnderstand] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = adult && understand && agree;

  async function accept() {
    if (!ready) return;
    setBusy(true);
    try { localStorage.setItem(`rico_consent_${userId}`, CONSENT_VERSION); } catch (e) {}
    try { await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }); } catch (e) {}
    onAccept();
  }

  const Check = ({ on, set, children }) => (
    <label onClick={() => set(!on)} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 10 }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${on ? "transparent" : T.line}`, background: on ? T.grad : "transparent", color: "white", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{on ? "✓" : ""}</span>
      <span style={{ color: T.text, fontSize: 12.5, lineHeight: 1.5 }}>{children}</span>
    </label>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 12px" }}>
          <div style={{ fontSize: 22, fontWeight: 900, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Before you start</div>
          <div style={{ color: T.sub, fontSize: 12.5, marginTop: 3 }}>A quick, honest heads-up about how Rico works and your rights.</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 12px" }}>
          <Section icon="🤖" title="These are AI, not real people">
            Every friend, twin, and voice on Rico is <b style={{ color: T.text }}>artificial intelligence</b>. Conversations are AI-generated and can be wrong, made up, or out of date. Nothing here is a real human relationship, and replies should not be relied on as fact.
          </Section>
          <Section icon="💬" title="Friendship only — not professional advice">
            Rico is for friendly companionship. It is <b style={{ color: T.text }}>not</b> a source of medical, mental-health, legal, or financial advice, and not a crisis service. If you're struggling or in danger, please contact a qualified professional or your local emergency number.
          </Section>
          <Section icon="🔒" title="Your data & your control">
            We store your chats, the personality read Rico forms, and short notes from your calls so your friends can remember you. You can view and delete any of it anytime in the <b style={{ color: T.text }}>Memory Vault</b>, or have an agent forget you completely. You may request full deletion of your account data.
          </Section>
          <Section icon="🎙" title="Voice cloning — your own voice only">
            If you choose to clone a voice, it must be <b style={{ color: T.text }}>your own</b>. You consent to a clone of your voice being used by your twin on calls with people who match it. Never record or upload anyone else's voice. You can remove your cloned voice at any time.
          </Section>
          <Section icon="📸" title="Photo to avatar">
            If you make an avatar from a photo, the image is analyzed once to design a cartoon avatar and is <b style={{ color: T.text }}>not stored</b> — only the resulting colors are kept. Only upload photos of yourself.
          </Section>
          <Section icon="🪞" title="Your AI Twin">
            Your twin is an AI version of you that other people can chat and call. You can refresh or retire it anytime. Don't put other people's private information into your conversations.
          </Section>
          <Section icon="🚫" title="Be kind & safe">
            No harassment, hate, illegal content, or impersonating others. Every agent message has a report button — please use it. We may remove access for misuse.
          </Section>
          <Section icon="⚖️" title="No warranty">
            Rico is provided "as is," without guarantees, and to the maximum extent permitted by law we're not liable for how AI responses are used. By continuing you consent to the processing described above.
          </Section>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <a href="/terms" target="_blank" style={{ color: T.violet, textDecoration: "none", fontWeight: 600 }}>Read full Terms of Service</a>
            <span style={{ color: T.line }}> · </span>
            <a href="/privacy" target="_blank" style={{ color: T.violet, textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
          </div>
        </div>

        <div style={{ padding: "12px 20px 22px", borderTop: `1px solid ${T.line}`, background: "rgba(15,14,23,0.9)" }}>
          <Check on={adult} set={setAdult}>I am <b style={{ color: T.text }}>13 or older</b> (and have a parent's permission if I'm under the age of digital consent where I live).</Check>
          <Check on={understand} set={setUnderstand}>I understand these are <b style={{ color: T.text }}>AI</b>, not real people, and not professional advice.</Check>
          <Check on={agree} set={setAgree}>I agree to the <b style={{ color: T.text }}>Terms, Privacy & AI consent</b> above.</Check>
          <button onClick={accept} disabled={!ready || busy} style={{ width: "100%", marginTop: 6, background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: ready ? "pointer" : "not-allowed", opacity: ready ? 1 : 0.45, fontFamily: font }}>
            {busy ? "One sec…" : "Agree & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
