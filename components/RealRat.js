// A realistic rat. Anatomy: low wedge body, haunch hump over the hind legs, small
// forelegs, tail as long as the body, small side-set eye, fine whiskers. The fur
// edge uses an feTurbulence displacement so the silhouette is fuzzy, not vector-smooth.
// Locomotion: low fast scuttle with leg-blur, hard freezes, sniffing, darting.
// props: busy (paused, sniffing toward screen), height, bottom (offset above inputs)

export default function RealRat({ busy = false, height = 34, bottom = 0 }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom, height, overflow: "hidden", pointerEvents: "none", zIndex: 4 }}>
      <div className={busy ? "rt-runner rt-paused" : "rt-runner rt-darting"}>
        <div className="rt-body-wrap" style={{ width: height * 3.4, height: height }}>
          <svg viewBox="0 0 240 72" width="100%" height="100%">
            <defs>
              <linearGradient id="rtCoat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f4337" />
                <stop offset="30%" stopColor="#6b5b48" />
                <stop offset="62%" stopColor="#8a7860" />
                <stop offset="85%" stopColor="#b9aa8e" />
                <stop offset="100%" stopColor="#d9cdb4" />
              </linearGradient>
              <radialGradient id="rtHaunch" cx="45%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#7d6c56" />
                <stop offset="70%" stopColor="#65564490" />
                <stop offset="100%" stopColor="#5a4c3c00" />
              </radialGradient>
              <linearGradient id="rtTail" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#a98f80" />
                <stop offset="100%" stopColor="#c5a99b" />
              </linearGradient>
              {/* fur edge — turbulence-displaced outline so it never looks plastic */}
              <filter id="rtFur" x="-8%" y="-12%" width="116%" height="124%">
                <feTurbulence type="fractalNoise" baseFrequency="0.12 0.55" numOctaves="2" seed="7" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>

            {/* ground shadow */}
            <ellipse cx="112" cy="68" rx="78" ry="3.2" fill="#000" opacity="0.18" />

            {/* tail — as long as the body, dragging with a low whip */}
            <g className="rt-tail">
              <path d="M48,50 Q20,58 4,52 Q-12,46 -16,34" fill="none" stroke="url(#rtTail)" strokeWidth="4.6" strokeLinecap="round" />
              <path d="M16,54 Q0,50 -10,40 Q-15,35 -16,33" fill="none" stroke="#8d756a" strokeWidth="2.1" strokeLinecap="round" />
            </g>

            <g className="rt-pitch">
              {/* far legs (behind body) */}
              <g className="rt-pose-b" opacity="0.85">
                <path d="M86,56 Q80,63 70,66 L80,67" fill="none" stroke="#4a3e31" strokeWidth="4.6" strokeLinecap="round" />
                <path d="M158,57 Q158,63 152,66 L159,66" fill="none" stroke="#4a3e31" strokeWidth="3.4" strokeLinecap="round" />
              </g>
              <g className="rt-pose-a" opacity="0.85">
                <path d="M84,56 Q88,63 96,66 L104,66" fill="none" stroke="#4a3e31" strokeWidth="4.6" strokeLinecap="round" />
                <path d="M160,56 Q164,61 170,64 L176,64" fill="none" stroke="#4a3e31" strokeWidth="3.4" strokeLinecap="round" />
              </g>

              {/* body — wedge profile, haunch hump, nose low */}
              <g filter="url(#rtFur)">
                <path d="M208,54 Q210,52 206,48 Q198,41 186,38 Q172,34.5 160,34.5 Q132,20 98,22 Q64,25 50,38 Q43,45 50,51 Q62,59 96,60 Q136,61 168,58 Q190,57 202,56 Q207,55.5 208,54 Z" fill="url(#rtCoat)" />
                {/* agouti patchiness */}
                <path d="M100,23 Q130,21 156,33 Q130,26 104,27 Q98,27 100,23 Z" fill="#403628" opacity="0.55" />
                <path d="M64,30 Q88,24 112,26 Q86,29 70,35 Z" fill="#594b3a" opacity="0.4" />
                {/* belly light */}
                <path d="M70,56 Q110,60 165,57 Q120,61 80,58 Z" fill="#e3d8bf" opacity="0.65" />
              </g>
              {/* haunch volume over hind leg */}
              <ellipse cx="86" cy="42" rx="24" ry="17" fill="url(#rtHaunch)" />
              <path d="M66,32 Q88,25 106,34" fill="none" stroke="#cdbfa3" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />

              {/* near legs */}
              <g className="rt-pose-a">
                <path d="M92,57 Q98,64 108,67 L118,67" fill="none" stroke="#6b5b48" strokeWidth="5" strokeLinecap="round" />
                <path d="M166,57 Q170,63 178,66 L184,65" fill="none" stroke="#6b5b48" strokeWidth="3.8" strokeLinecap="round" />
              </g>
              <g className="rt-pose-b">
                <path d="M94,57 Q88,64 78,68 L88,68" fill="none" stroke="#6b5b48" strokeWidth="5" strokeLinecap="round" />
                <path d="M164,57 Q160,64 154,67 L161,67" fill="none" stroke="#6b5b48" strokeWidth="3.8" strokeLinecap="round" />
              </g>

              {/* ear — thin, rounded, slightly translucent pink */}
              <path d="M170,36 Q166,24 175,22 Q184,21 184,30 Q184,36 177,38 Z" fill="#8a7460" />
              <path d="M172,34 Q170,26 176,25 Q181,25 181,31 Q181,35 176,36 Z" fill="#c79a90" opacity="0.85" />
              {/* eye — small, side-set, glassy */}
              <circle cx="184" cy="42" r="2.6" fill="#0e0a06" />
              <circle cx="184.9" cy="41.2" r="0.8" fill="#fff" opacity="0.95" />
              <circle cx="184" cy="42" r="3.4" fill="none" stroke="#3d3226" strokeWidth="0.7" opacity="0.5" />
              {/* muzzle shading + mouth line */}
              <path d="M196,46 Q203,49 206,52" fill="none" stroke="#4a3e31" strokeWidth="0.9" opacity="0.6" />
              {/* nose */}
              <g className="rt-nose"><path d="M206,48 Q210,49 208,52 Q205,53 204,50 Z" fill="#c2766e" /></g>
              {/* whiskers — fine, fanned, double-toned */}
              <g className="rt-whiskers">
                <g stroke="#2e261d" strokeWidth="0.7" opacity="0.5" fill="none">
                  <path d="M200,48 Q216,40 228,36" /><path d="M201,50 Q219,48 232,47" /><path d="M200,52 Q216,57 226,62" />
                </g>
                <g stroke="#f4ede0" strokeWidth="0.55" opacity="0.8" fill="none">
                  <path d="M200,49 Q217,44 230,41" /><path d="M200,51 Q218,52 231,53" /><path d="M199,53 Q214,60 223,65" />
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
      <style>{`
        .rt-runner { position: absolute; bottom: 0; will-change: left, transform; }
        /* real rat locomotion: explosive low darts, hard freezes, sniff, dart */
        .rt-darting { animation: rt-dart 13s linear infinite; }
        @keyframes rt-dart {
          0%    { left: -24%; transform: scaleX(1); }
          7%    { left: 26%;  transform: scaleX(1); }
          10.5% { left: 26%;  transform: scaleX(1); }
          12%   { left: 29%;  transform: scaleX(1); }
          17%   { left: 29%;  transform: scaleX(1); }
          24%   { left: 84%;  transform: scaleX(1); }
          28%   { left: 84%;  transform: scaleX(-1); }
          35%   { left: 50%;  transform: scaleX(-1); }
          40%   { left: 50%;  transform: scaleX(-1); }
          41.5% { left: 47%;  transform: scaleX(-1); }
          49%   { left: -24%; transform: scaleX(-1); }
          51%   { left: -24%; transform: scaleX(1); }
          63%   { left: 14%;  transform: scaleX(1); }
          68%   { left: 14%;  transform: scaleX(1); }
          80%   { left: 58%;  transform: scaleX(1); }
          83%   { left: 58%;  transform: scaleX(1); }
          100%  { left: 112%; transform: scaleX(1); }
        }
        .rt-paused { left: auto; right: 6%; animation: rt-settle 0.35s ease both; }
        @keyframes rt-settle { from { transform: translateY(6px); opacity: 0.4; } to { transform: translateY(0); opacity: 1; } }

        /* low scuttle: tiny ground-hugging jitter, no cartoon bounce */
        .rt-darting .rt-body-wrap { animation: rt-scuttle 0.16s linear infinite; }
        @keyframes rt-scuttle { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.2px); } }

        /* leg blur: alternate the two stride poses very fast */
        .rt-darting .rt-pose-a { animation: rt-stride-a 0.12s steps(1) infinite; }
        .rt-darting .rt-pose-b { animation: rt-stride-b 0.12s steps(1) infinite; }
        @keyframes rt-stride-a { 0%,49% { opacity: 1; } 50%,100% { opacity: 0.15; } }
        @keyframes rt-stride-b { 0%,49% { opacity: 0.15; } 50%,100% { opacity: 1; } }
        .rt-paused .rt-pose-b { opacity: 0.12; }

        .rt-darting .rt-tail { animation: rt-tailwhip 0.45s ease-in-out infinite; transform-origin: 48px 50px; }
        @keyframes rt-tailwhip { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(3.5deg); } }

        /* paused: nose works fast, head pitches up slightly, whiskers twitch */
        .rt-paused .rt-pitch { animation: rt-peek 2.2s ease-in-out infinite; transform-origin: 80% 85%; }
        @keyframes rt-peek { 0%,100% { transform: rotate(0deg); } 35% { transform: rotate(-2.5deg); } 55% { transform: rotate(-2.5deg); } 70% { transform: rotate(0deg); } }
        .rt-nose { animation: rt-sniff 0.5s ease-in-out infinite; transform-origin: 206px 50px; }
        @keyframes rt-sniff { 0%,100% { transform: scale(1); } 30% { transform: scale(1.3); } 55% { transform: scale(0.95); } 75% { transform: scale(1.2); } }
        .rt-paused .rt-whiskers { animation: rt-twitch 0.5s ease-in-out infinite; transform-origin: 200px 50px; }
        @keyframes rt-twitch { 0%,100% { transform: rotate(0deg); } 40% { transform: rotate(2deg); } 70% { transform: rotate(-1.5deg); } }

        @media (prefers-reduced-motion: reduce) {
          .rt-darting, .rt-darting .rt-body-wrap, .rt-pose-a, .rt-pose-b, .rt-tail, .rt-nose, .rt-pitch, .rt-whiskers { animation: none !important; }
          .rt-darting { left: 72%; }
        }
      `}</style>
    </div>
  );
}
