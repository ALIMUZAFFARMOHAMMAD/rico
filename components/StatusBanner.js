// Honest-by-design outage signal (Nova idea, 2026-08-17). When /api/health reports the
// backend degraded (DB down, e.g. today's Supabase DNS outage, or an AI provider issue
// like the 2026-08-16 Anthropic-credits outage), most routes quietly fall back to cached
// content instead of erroring. Silence reads as neglect, not honesty, to a user who
// doesn't know why their friend stopped saying anything new — this makes it visible.
import { useEffect, useState } from "react";

const POLL_MS = 60000;

export default function StatusBanner() {
  const [down, setDown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () => {
      fetch("/api/health")
        .then(r => r.json())
        .then(d => { if (alive) setDown(!d?.ok); })
        .catch(() => {});
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!down || dismissed) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 9999,
      background: "#3b2a52", color: "#f1e9ff",
      padding: "8px 16px", fontSize: 13, textAlign: "center",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      <span>💜 Some features are briefly paused — we&apos;ll be right back.</span>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 13, textDecoration: "underline", padding: 0 }}
      >
        dismiss
      </button>
    </div>
  );
}
