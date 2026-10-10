// "While you were away" — a weekly recap card on the Me tab so a lapsed user has a
// reason to open the app without needing push/email infra. Renders nothing until
// there's a real week of activity to recap.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function WeeklyDigest({ userId, lang, T, font }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetch(`/api/digest?userId=${encodeURIComponent(userId)}&lang=${encodeURIComponent(lang || "en")}`)
      .then(r => r.json())
      .then(d => {
        if (alive && d?.ok && Array.isArray(d.items) && d.items.length) {
          setItems(d.items);
          // Instrument: the weekly digest actually rendered (5th retention lever).
          fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "digest_shown" }) }).catch(() => {});
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [userId, lang]);

  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        borderRadius: 22, padding: 18, marginBottom: 14,
        background: T.panel, border: `1px solid ${T.line}`, backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📆</span>
        <span style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>Your week with Rico</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            style={{ display: "flex", alignItems: "flex-start", gap: 8, color: T.text, fontSize: 13, fontWeight: 600, fontFamily: font, lineHeight: 1.4 }}
          >
            <span style={{ color: T.violet }}>•</span>
            <span>{it}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
