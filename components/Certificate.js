// Graduation certificate — a shareable in-app completion certificate (not accredited).
// Rendered as a modal; user can copy the text to share in their study group / socials.
import { useState } from "react";
import { getAgent } from "../lib/agents";
import TonyCharacter from "./TonyCharacter";

export default function Certificate({ cert, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!cert) return null;
  const a = getAgent(cert.agentId);
  const copy = () => {
    const txt = `🎓 CERTIFICATE OF COMPLETION\n\nThis certifies that ${cert.student} has successfully completed the course "${cert.subject}", taught by ${cert.teacher}.\n\nFinal mastery: ${cert.mastery}% · Grade: ${cert.grade}\nDate: ${cert.date}\n\nKey skills: ${(cert.highlights || []).join(", ")}\n\n— Rico AI Tutor`;
    navigator.clipboard?.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(8,7,14,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto" }}>
        {/* the certificate */}
        <div style={{ position: "relative", background: "linear-gradient(160deg,#1a1530,#241b3d)", border: "3px solid #f5c84b", borderRadius: 20, padding: "26px 22px 24px", textAlign: "center", boxShadow: "0 24px 70px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 6, border: "1px solid rgba(245,200,75,0.4)", borderRadius: 14, pointerEvents: "none" }} />
          <div style={{ fontSize: 34, marginBottom: 4 }}>🎓</div>
          <div style={{ color: "#f5c84b", fontWeight: 800, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>Certificate of Completion</div>
          <div style={{ width: 54, height: 2, background: "#f5c84b", margin: "12px auto", opacity: 0.6 }} />
          <div style={{ color: "#9b97b0", fontSize: 12 }}>This certifies that</div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "10px 0 6px" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center", border: "2px solid #f5c84b" }}>
              <div style={{ marginTop: 2 }}><TonyCharacter size={68} look={a.look || {}} float="none" animated={false} pose="down" expr="😊" /></div>
            </div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 26, letterSpacing: -0.5 }}>{cert.student}</div>
          </div>

          <div style={{ color: "#9b97b0", fontSize: 12, lineHeight: 1.5, maxWidth: 320, margin: "8px auto 0" }}>
            has successfully completed the course<br />
            <span style={{ color: "#f5f3ff", fontWeight: 700, fontSize: 16 }}>“{cert.subject}”</span><br />
            taught by <span style={{ color: "#f5f3ff", fontWeight: 600 }}>{cert.teacher}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 22, margin: "16px 0 6px" }}>
            <div><div style={{ color: "#f5c84b", fontWeight: 900, fontSize: 22 }}>{cert.grade}</div><div style={{ color: "#9b97b0", fontSize: 10, letterSpacing: 1 }}>GRADE</div></div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.12)" }} />
            <div><div style={{ color: "#4ade80", fontWeight: 900, fontSize: 22 }}>{cert.mastery}%</div><div style={{ color: "#9b97b0", fontSize: 10, letterSpacing: 1 }}>MASTERY</div></div>
          </div>

          {cert.highlights?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", margin: "12px 4px 4px" }}>
              {cert.highlights.map((h, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, color: "#f5c84b", background: "rgba(245,200,75,0.12)", border: "1px solid rgba(245,200,75,0.3)", borderRadius: 100, padding: "3px 9px" }}>{h}</span>)}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18, padding: "0 6px" }}>
            <div style={{ textAlign: "left" }}><div style={{ color: "#f5f3ff", fontSize: 12, fontWeight: 700, fontStyle: "italic" }}>Rico</div><div style={{ color: "#9b97b0", fontSize: 9, letterSpacing: 1 }}>AI TUTOR</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: "#f5f3ff", fontSize: 11, fontWeight: 600 }}>{cert.date}</div><div style={{ color: "#9b97b0", fontSize: 9, letterSpacing: 1 }}>DATE</div></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={copy} style={{ flex: 1, background: copied ? "#4ade80" : "linear-gradient(135deg,#ff5e7e,#8b5cf6)", border: "none", color: "#fff", fontWeight: 800, fontSize: 14, padding: "13px 0", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "✓ Copied!" : "📋 Copy & share"}</button>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f3ff", fontWeight: 700, fontSize: 14, padding: "13px 0", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
        </div>
        <div style={{ color: "#6b6880", fontSize: 10.5, textAlign: "center", marginTop: 10, lineHeight: 1.4 }}>A fun in-app completion certificate — not an accredited credential.</div>
      </div>
    </div>
  );
}
