// Friendship-themed hero for the landing screen — a warm little cluster of
// three friends with a connecting spark above them. Replaces the old running rat.
export default function FriendsHero({ size = 168 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 240 174" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="fhA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#ff8fb1" /></linearGradient>
        <linearGradient id="fhB" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#a87fd4" /></linearGradient>
        <linearGradient id="fhC" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6aa9d9" /><stop offset="100%" stopColor="#8fb6ff" /></linearGradient>
        <linearGradient id="fhSpark" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
      </defs>

      {/* connecting spark / heart linking the three */}
      <g className="fh-spark">
        <path d="M120,20 C116,12 104,12 104,22 C104,30 120,40 120,40 C120,40 136,30 136,22 C136,12 124,12 120,20 Z" fill="url(#fhSpark)" />
        <circle cx="84" cy="30" r="2.4" fill="#ff8fb1" /><circle cx="156" cy="28" r="2.4" fill="#8fb6ff" /><circle cx="120" cy="6" r="2" fill="#8b5cf6" />
      </g>

      {/* left friend */}
      <g className="fh-f fh-l">
        <circle cx="64" cy="112" r="40" fill="url(#fhA)" />
        <circle cx="53" cy="106" r="4.6" fill="#2a1626" /><circle cx="77" cy="106" r="4.6" fill="#2a1626" />
        <path d="M52,124 Q64,134 76,124" stroke="#2a1626" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <circle cx="46" cy="120" r="5" fill="#fff" opacity="0.18" />
      </g>

      {/* right friend */}
      <g className="fh-f fh-r">
        <circle cx="176" cy="112" r="40" fill="url(#fhC)" />
        <circle cx="165" cy="106" r="4.6" fill="#1a2030" /><circle cx="189" cy="106" r="4.6" fill="#1a2030" />
        <path d="M164,124 Q176,134 188,124" stroke="#1a2030" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <circle cx="194" cy="120" r="5" fill="#fff" opacity="0.18" />
      </g>

      {/* center friend, slightly forward */}
      <g className="fh-f fh-c">
        <circle cx="120" cy="120" r="48" fill="url(#fhB)" />
        <circle cx="107" cy="113" r="5.4" fill="#1d1430" /><circle cx="133" cy="113" r="5.4" fill="#1d1430" />
        <path d="M105,132 Q120,145 135,132" stroke="#1d1430" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="101" cy="126" r="6" fill="#fff" opacity="0.16" />
        {/* tiny cheek blush */}
        <circle cx="99" cy="124" r="5" fill="#ff5e7e" opacity="0.25" /><circle cx="141" cy="124" r="5" fill="#ff5e7e" opacity="0.25" />
      </g>

      <style>{`
        .fh-f { transform-origin: center bottom; }
        .fh-c { animation: fh-bob 3.4s ease-in-out infinite; }
        .fh-l { animation: fh-bob 3.4s ease-in-out infinite 0.4s; }
        .fh-r { animation: fh-bob 3.4s ease-in-out infinite 0.8s; }
        .fh-spark { transform-origin: 120px 24px; animation: fh-beat 2.2s ease-in-out infinite; }
        @keyframes fh-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes fh-beat { 0%,100% { transform: scale(1); opacity: 0.95; } 50% { transform: scale(1.12); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .fh-c,.fh-l,.fh-r,.fh-spark { animation: none; } }
      `}</style>
    </svg>
  );
}
