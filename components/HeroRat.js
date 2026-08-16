// Rico — a friendly sitting rat. The mascot face for the welcome screen.
// Soft realistic fur with cute proportions; gentle idle (breathe, blink, nose & ear twitch, tail sway).
const INK = "#211913";

export default function HeroRat({ size = 170 }) {
  return (
    <div className="herorat" style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-label="Rico the rat">
        <defs>
          <radialGradient id="hrBody" cx="50%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#bcae9a" /><stop offset="55%" stopColor="#9c8c76" /><stop offset="100%" stopColor="#776958" />
          </radialGradient>
          <radialGradient id="hrEar" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#ecbcae" /><stop offset="68%" stopColor="#b88c7a" /><stop offset="100%" stopColor="#8a7461" />
          </radialGradient>
          <linearGradient id="hrBelly" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ece1d1" /><stop offset="100%" stopColor="#cdc0a9" /></linearGradient>
          <linearGradient id="hrTail" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#caa392" /><stop offset="100%" stopColor="#a4806f" /></linearGradient>
          <filter id="hrFur" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.85 0.85" numOctaves="2" seed="6" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" /></filter>
        </defs>

        {/* ground shadow */}
        <ellipse cx="100" cy="188" rx="58" ry="9" fill="#000" opacity="0.18" />

        {/* tail curling up the right side */}
        <path className="hr-tail" d="M138,168 Q182,162 182,124 Q182,98 162,96" fill="none" stroke="url(#hrTail)" strokeWidth="6.5" strokeLinecap="round" />

        <g className="hr-breathe">
          {/* hind feet */}
          <ellipse cx="72" cy="180" rx="13" ry="7" fill="#caa392" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="128" cy="180" rx="13" ry="7" fill="#caa392" stroke={INK} strokeWidth="2.5" />

          {/* body + head as one furry form */}
          <g filter="url(#hrFur)">
            <ellipse cx="100" cy="135" rx="54" ry="52" fill="url(#hrBody)" stroke={INK} strokeWidth="3.5" />
            <circle cx="100" cy="82" r="44" fill="url(#hrBody)" stroke={INK} strokeWidth="3.5" />
          </g>
          {/* belly */}
          <ellipse cx="100" cy="146" rx="30" ry="34" fill="url(#hrBelly)" opacity="0.92" />

          {/* ears */}
          <g className="hr-earL"><ellipse cx="68" cy="44" rx="19" ry="21" fill="url(#hrEar)" stroke={INK} strokeWidth="3" /><ellipse cx="69" cy="46" rx="10" ry="12" fill="#d99a8c" opacity="0.85" /></g>
          <g className="hr-earR"><ellipse cx="132" cy="44" rx="19" ry="21" fill="url(#hrEar)" stroke={INK} strokeWidth="3" /><ellipse cx="131" cy="46" rx="10" ry="12" fill="#d99a8c" opacity="0.85" /></g>

          {/* cheek blush */}
          <ellipse cx="66" cy="98" rx="11" ry="7" fill="#e79b94" opacity="0.45" />
          <ellipse cx="134" cy="98" rx="11" ry="7" fill="#e79b94" opacity="0.45" />

          {/* eyes (big & friendly) */}
          <g>
            <circle cx="83" cy="80" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
            <circle cx="117" cy="80" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
            <g className="hr-eyes">
              <circle cx="85" cy="82" r="6.5" fill="#1a120c" /><circle cx="119" cy="82" r="6.5" fill="#1a120c" />
              <circle cx="87" cy="79.5" r="2.2" fill="#fff" /><circle cx="121" cy="79.5" r="2.2" fill="#fff" />
            </g>
            <g className="hr-blink"><ellipse cx="83" cy="80" rx="12" ry="13" fill="url(#hrBody)" /><ellipse cx="117" cy="80" rx="12" ry="13" fill="url(#hrBody)" /></g>
          </g>

          {/* snout + nose */}
          <ellipse cx="100" cy="103" rx="16" ry="13" fill="#e6dccb" opacity="0.7" />
          <g className="hr-nose"><path d="M100,104 c-4,-5 -12,-2 -10,4 c1.5,4 7,7 10,9 c3,-2 8.5,-5 10,-9 c2,-6 -6,-9 -10,-4 Z" fill="#d97f78" stroke={INK} strokeWidth="2" /></g>
          <path d="M100,116 q-6,5 -12,2 M100,116 q6,5 12,2" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />

          {/* whiskers */}
          <g className="hr-whisk" stroke={INK} strokeWidth="1.4" opacity="0.55" fill="none">
            <path d="M88,108 Q60,104 44,108" /><path d="M88,112 Q60,114 46,120" />
            <path d="M112,108 Q140,104 156,108" /><path d="M112,112 Q140,114 154,120" />
          </g>

          {/* little front paws — the right one waves hello on load */}
          <ellipse cx="86" cy="142" rx="9" ry="11" fill="url(#hrBody)" stroke={INK} strokeWidth="2.8" />
          <g className="hr-wave-paw" style={{ transformOrigin: "112px 140px" }}>
            <ellipse cx="114" cy="142" rx="9" ry="11" fill="url(#hrBody)" stroke={INK} strokeWidth="2.8" />
          </g>
        </g>
      </svg>
      <style>{`
        .herorat { animation: hr-pop 0.6s cubic-bezier(.2,1.35,.4,1) both; }
        @keyframes hr-pop { 0%{opacity:0;transform:scale(0.65) translateY(14px)} 60%{opacity:1;transform:scale(1.05)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        .herorat .hr-wave-paw { animation: hr-wave 2.4s ease-in-out 0.55s both; }
        @keyframes hr-wave {
          0%{transform:translate(0,0) rotate(0)}
          16%{transform:translate(18px,-62px) rotate(6deg)}
          28%{transform:translate(18px,-62px) rotate(-18deg)}
          40%{transform:translate(18px,-62px) rotate(8deg)}
          52%{transform:translate(18px,-62px) rotate(-18deg)}
          64%{transform:translate(18px,-62px) rotate(6deg)}
          84%{transform:translate(0,0) rotate(0)}
          100%{transform:translate(0,0) rotate(0)}
        }
        .herorat .hr-breathe { animation: hr-breathe 3.4s ease-in-out infinite; transform-origin: 100px 150px; }
        @keyframes hr-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.025)} }
        .herorat .hr-tail { animation: hr-tail 3.2s ease-in-out infinite; transform-origin: 138px 168px; }
        @keyframes hr-tail { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-5deg)} }
        .herorat .hr-blink { transform-origin: 100px 80px; animation: hr-blink 4.6s infinite; transform: scaleY(0); }
        @keyframes hr-blink { 0%,92%,100%{transform:scaleY(0)} 95%,97%{transform:scaleY(1)} }
        .herorat .hr-nose { animation: hr-nose 1.4s ease-in-out infinite; transform-origin: 100px 110px; }
        @keyframes hr-nose { 0%,100%{transform:scale(1)} 35%{transform:scale(1.16)} 55%{transform:scale(1)} }
        .herorat .hr-earL { animation: hr-earL 5s ease-in-out infinite; transform-origin: 68px 44px; }
        .herorat .hr-earR { animation: hr-earR 5s ease-in-out infinite 0.5s; transform-origin: 132px 44px; }
        @keyframes hr-earL { 0%,86%,100%{transform:rotate(0)} 92%{transform:rotate(-8deg)} }
        @keyframes hr-earR { 0%,80%,100%{transform:rotate(0)} 88%{transform:rotate(8deg)} }
        @media (prefers-reduced-motion: reduce){ .herorat *{animation:none!important} }
      `}</style>
    </div>
  );
}
