// Living-memory moat, made visible (client surface).
// Shows warm chips of what Rico's friends remember about you — the "it actually
// knows me" moment. Renders nothing until there's real memory to show.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function MemorySpotlight({ userId, lang, T, font }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetch(`/api/remembers?userId=${encodeURIComponent(userId)}&lang=${encodeURIComponent(lang || "en")}`)
      .then(r => r.json())
      .then(d => {
        if (alive && d?.ok && Array.isArray(d.items) && d.items.length) {
          setItems(d.items);
          // Instrument: the living-memory panel actually rendered (Pillar #2 impact).
          fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "spotlight_shown" }) }).catch(() => {});
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
        background: `linear-gradient(140deg, ${T.violet}1c, ${T.pink}10)`,
        border: `1px solid ${T.line}`, backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🧠</span>
        <span style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>What your friends remember about you</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((it, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 22 }}
            style={{
              display: "inline-flex", alignItems: "center",
              color: T.text, fontSize: 12.5, fontWeight: 600, fontFamily: font,
              background: `${T.violet}1f`, border: `1px solid ${T.violet}3a`,
              padding: "7px 13px", borderRadius: 100, lineHeight: 1.2,
            }}
          >
            {it}
          </motion.span>
        ))}
      </div>
      <div style={{ color: T.sub, fontSize: 11, marginTop: 12, lineHeight: 1.4 }}>
        The more you talk, the more your friends know you — across every device. 💜
      </div>
    </motion.div>
  );
}
