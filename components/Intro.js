// Brand intro after sign-in: the "rico" logo appears, three friend circles
// gather under the wordmark and a heart sparks between them, then the app opens.
// Plays once per app load.
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FRIENDS = [
  { grad: ["#ff5e7e", "#ff9bb0"], face: "◡" },
  { grad: ["#8b5cf6", "#b89bff"], face: "◡" },
  { grad: ["#2dd4bf", "#7fe9da"], face: "◡" },
];

function Friend({ data, i, phase }) {
  return (
    <svg viewBox="0 0 60 60" width="46" height="46" className={phase === "sniff" ? "fr-beat" : ""} style={{ animationDelay: `${i * 0.12}s` }}>
      <defs>
        <linearGradient id={`frg${i}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={data.grad[0]} /><stop offset="100%" stopColor={data.grad[1]} />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="22" fill={`url(#frg${i})`} />
      <circle cx="23" cy="26" r="2.6" fill="#fff" /><circle cx="37" cy="26" r="2.6" fill="#fff" />
      <path d="M22,36 Q30,43 38,36" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Intro({ onDone }) {
  const [phase, setPhase] = useState("run"); // run -> sniff (gather) -> out
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("sniff"), 1500);
    const t2 = setTimeout(() => setPhase("out"), 3300);
    const t3 = setTimeout(() => doneRef.current(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div animate={{ opacity: phase === "out" ? 0 : 1 }} transition={{ duration: 0.5 }} style={{ position: "fixed", inset: 0, zIndex: 130, background: "#0f0e17", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ position: "relative", width: 320, height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* logo */}
        <motion.div initial={{ opacity: 0, scale: 0.72, y: 6 }} animate={{ opacity: 1, scale: phase === "sniff" ? [1, 1.06, 1] : 1, y: 0 }} transition={{ opacity: { duration: 0.7 }, y: { duration: 0.7, ease: "easeOut" }, scale: phase === "sniff" ? { duration: 0.55, times: [0, 0.5, 1] } : { duration: 0.7, ease: "easeOut" } }} style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
          <svg width="48" height="48" viewBox="0 0 26 26">
            <ellipse cx="13" cy="13" rx="11" ry="5.5" fill="none" stroke="url(#ig)" strokeWidth="2" transform="rotate(-22 13 13)" />
            <circle cx="13" cy="13" r="3.4" fill="url(#ig)" />
            <circle cx="22.4" cy="8.6" r="2" fill="#ff5e7e" />
            <defs><linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 50, letterSpacing: -2, background: "linear-gradient(135deg,#ff5e7e,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>rico</span>
        </motion.div>

        {/* heart spark rising between the friends as they gather */}
        {phase === "sniff" && (
          <div style={{ position: "absolute", left: "50%", bottom: 86, marginLeft: -6, zIndex: 3 }}>
            {[0, 1, 2].map(k => <div key={k} className="heartmark" style={{ animationDelay: `${k * 0.2}s`, left: (k - 1) * 12 }}>💛</div>)}
          </div>
        )}

        {/* three friends slide in and gather under the wordmark */}
        <div style={{ display: "flex", gap: 8, marginTop: 22, zIndex: 1 }}>
          {FRIENDS.map((f, i) => (
            <motion.div
              key={i}
              initial={{ y: 60, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: i * 0.14, ease: [0.25, 1, 0.4, 1] }}
            >
              <Friend data={f} i={i} phase={phase} />
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .fr-beat { animation: fr-beat 1.2s ease-in-out infinite; transform-origin: 50% 50%; }
        @keyframes fr-beat { 0%,100%{transform:scale(1)} 40%{transform:scale(1.12)} 60%{transform:scale(1.04)} }
        .heartmark { position:absolute; font-size:14px; opacity:0; animation: heartrise 1.2s ease-out infinite; }
        @keyframes heartrise { 0%{opacity:0;transform:translateY(0) scale(0.6)} 30%{opacity:1} 100%{opacity:0;transform:translateY(-52px) scale(1.25)} }
        @media (prefers-reduced-motion: reduce){ .fr-beat,.heartmark{animation:none!important} }
      `}</style>
    </motion.div>
  );
}
