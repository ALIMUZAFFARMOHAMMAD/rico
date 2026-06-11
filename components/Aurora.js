// Ambient animated surface — slow-drifting aurora blobs behind every screen.
// Pure CSS transforms (GPU-composited); honors prefers-reduced-motion.

export default function Aurora() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div className="au-blob au-1" />
      <div className="au-blob au-2" />
      <div className="au-blob au-3" />
      <div className="au-grain" />
      <style>{`
        .au-blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; will-change: transform; }
        .au-1 { width: 55vw; height: 55vw; max-width: 600px; max-height: 600px; background: radial-gradient(circle, #ff5e7e 0%, transparent 65%); top: -12%; left: -10%; animation: au-d1 26s ease-in-out infinite; }
        .au-2 { width: 60vw; height: 60vw; max-width: 660px; max-height: 660px; background: radial-gradient(circle, #8b5cf6 0%, transparent 65%); bottom: -18%; right: -12%; animation: au-d2 31s ease-in-out infinite; }
        .au-3 { width: 40vw; height: 40vw; max-width: 460px; max-height: 460px; background: radial-gradient(circle, #38bdf8 0%, transparent 65%); top: 38%; left: 52%; opacity: 0.3; animation: au-d3 38s ease-in-out infinite; }
        @keyframes au-d1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(9vw,6vh) scale(1.15); } 66% { transform: translate(-4vw,10vh) scale(0.92); } }
        @keyframes au-d2 { 0%,100% { transform: translate(0,0) scale(1); } 40% { transform: translate(-10vw,-8vh) scale(1.12); } 75% { transform: translate(5vw,-3vh) scale(0.95); } }
        @keyframes au-d3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-12vw,-12vh) scale(1.25); } }
        .au-grain { position: absolute; inset: 0; opacity: 0.05; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E"); }
        @media (prefers-reduced-motion: reduce) { .au-blob { animation: none !important; } }
      `}</style>
    </div>
  );
}
