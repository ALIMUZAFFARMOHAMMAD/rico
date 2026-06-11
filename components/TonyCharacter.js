// Tony — the HiTony mascot. Full-body comic character, pure SVG + CSS keyframes.
// Built to double as a brand asset: render with animated={false} for clean static poses
// (promos, stickers, AI video generation input).
//
// props:
//   size      — height in px (width is ~0.77 × size)
//   expr      — Tony's emoji from the hidden traits JSON (drives the face)
//   state     — "idle" | "thinking" | "talking" | "listening"
//   float     — "drift" (wanders, for chat) | "bob" (for calls) | "none"
//   pose      — "auto" (from state) | "wave" | "thumbs" | "gesture" | "think" | "listen" | "down"
//   animated  — false renders a clean static pose (no blink/talk/sway), for export

const INK = "#1a1008";
const YELLOW = "#ffe566";
const YELLOW_D = "#f0cf45";
const SKIN = "#e8a96e";
const SKIN_D = "#d18f54";
const HAIR = "#241a12";
const RED = "#e63946";
const PURPLE = "#7c4fcd";
const PANTS = "#2a2018";

function mapExpr(expr) {
  switch (expr) {
    case "😄": case "😆": case "🎉": return "big";
    case "🤔": return "think";
    case "😲": case "😮": case "😯": return "surprise";
    case "🤍": case "❤️": case "💙": return "love";
    case "💡": return "idea";
    case "🔮": case "✨": return "sparkle";
    case "😅": return "sweat";
    case "🤝": case "😢": return "care";
    default: return "smile";
  }
}

const BROWS = {
  smile:    { l: "M64,52 Q78,45 92,50",  r: "M108,50 Q122,45 136,52" },
  big:      { l: "M64,48 Q78,40 92,46",  r: "M108,46 Q122,40 136,48" },
  think:    { l: "M64,53 Q78,50 92,52",  r: "M108,46 Q122,39 136,45" },
  surprise: { l: "M64,46 Q78,38 92,44",  r: "M108,44 Q122,38 136,46" },
  love:     { l: "M64,50 Q78,44 92,49",  r: "M108,49 Q122,44 136,50" },
  idea:     { l: "M64,47 Q78,40 92,45",  r: "M108,45 Q122,40 136,47" },
  sparkle:  { l: "M64,49 Q78,43 92,48",  r: "M108,48 Q122,43 136,49" },
  sweat:    { l: "M64,51 Q78,52 92,53",  r: "M108,52 Q122,47 136,51" },
  care:     { l: "M64,54 Q78,50 92,56",  r: "M108,56 Q122,50 136,54" },
};

function Mouth({ face }) {
  switch (face) {
    case "big": return <g><path d="M82,94 Q100,119 118,94 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" /><ellipse cx="100" cy="105" rx="7" ry="4.5" fill={RED} /></g>;
    case "think": return <path d="M90,102 Q100,99 110,103" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case "surprise": return <ellipse cx="100" cy="101" rx="6.5" ry="8.5" fill={INK} />;
    case "care": return <path d="M86,104 Q100,96 114,104" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    case "sweat": return <path d="M86,102 Q100,107 114,99" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    default: return <path d="M84,96 Q100,110 116,96" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
  }
}

function Hand({ x, y, type = "fist", skin = SKIN }) {
  if (type === "open") return (
    <g>
      <ellipse cx={x} cy={y} rx="9" ry="10.5" fill={skin} stroke={INK} strokeWidth="3" />
      <line x1={x - 4} y1={y - 9} x2={x - 4} y2={y - 3} stroke={INK} strokeWidth="1.6" />
      <line x1={x} y1={y - 10} x2={x} y2={y - 4} stroke={INK} strokeWidth="1.6" />
      <line x1={x + 4} y1={y - 9} x2={x + 4} y2={y - 3} stroke={INK} strokeWidth="1.6" />
    </g>
  );
  if (type === "thumb") return (
    <g>
      <circle cx={x} cy={y} r="8.5" fill={skin} stroke={INK} strokeWidth="3" />
      <rect x={x - 2.5} y={y - 22} width="7.5" height="15" rx="3.7" fill={skin} stroke={INK} strokeWidth="3" />
    </g>
  );
  return <circle cx={x} cy={y} r="8" fill={skin} stroke={INK} strokeWidth="3" />;
}

function Arm({ d, sleeve = YELLOW }) {
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth="17" strokeLinecap="round" />
      <path d={d} fill="none" stroke={sleeve} strokeWidth="11" strokeLinecap="round" />
    </g>
  );
}

const RIGHT_ARMS = {
  down:    { d: "M130,138 Q141,162 144,184", hand: { x: 145, y: 189, type: "fist" } },
  gesture: { d: "M130,138 Q150,154 160,142", hand: { x: 163, y: 138, type: "open" }, anim: "tony-gesture" },
  think:   { d: "M130,138 Q154,158 120,116", hand: { x: 117, y: 113, type: "fist" } },
  listen:  { d: "M130,138 Q160,144 153,92",  hand: { x: 152, y: 87, type: "fist" } },
  wave:    { d: "M130,138 Q157,124 161,98",  hand: { x: 163, y: 91, type: "open" }, anim: "tony-wave" },
  thumbs:  { d: "M130,138 Q152,154 163,148", hand: { x: 166, y: 144, type: "thumb" } },
};

export default function TonyCharacter({ size = 140, expr = "😊", state = "idle", float = "drift", pose = "auto", animated = true, look = {} }) {
  // look: { hoodie, hoodieD, skin, skinD, hair, pants } — agent cast variants share the rig
  const C = {
    hoodie: look.hoodie || YELLOW,
    hoodieD: look.hoodieD || YELLOW_D,
    skin: look.skin || SKIN,
    skinD: look.skinD || SKIN_D,
    hair: look.hair || HAIR,
    pants: look.pants || PANTS,
  };
  const face = state === "thinking" ? "think" : mapExpr(expr);
  const talking = animated && state === "talking";
  const listening = state === "listening";
  const effPose = pose !== "auto" ? pose
    : state === "talking" ? "gesture"
    : state === "thinking" ? "think"
    : state === "listening" ? "listen"
    : "down";
  const right = RIGHT_ARMS[effPose] || RIGHT_ARMS.down;
  const brows = BROWS[face] || BROWS.smile;
  const pupilsUp = face === "think" || face === "idea";
  const bigEyes = face === "surprise" || listening;
  const floatClass = !animated ? "" : float === "drift" ? "tony-drift" : float === "bob" ? "tony-bob" : "";
  const w = Math.round(size * 0.77);

  return (
    <div className={`tony-wrap ${floatClass}`} style={{ width: w, height: size, display: "inline-block", lineHeight: 0 }}>
      <svg viewBox="0 0 200 262" width={w} height={size} xmlns="http://www.w3.org/2000/svg" aria-label="Tony, the HiTony mascot">
        {/* ground shadow */}
        {animated && <ellipse cx="100" cy="256" rx="46" ry="6" fill={INK} opacity="0.14" />}

        <g className={animated ? "tony-sway" : ""}>
          {/* legs */}
          <path d="M76,196 L76,234 Q76,240 82,240 L92,240 L94,198 Z" fill={C.pants} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M124,196 L124,234 Q124,240 118,240 L108,240 L106,198 Z" fill={C.pants} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          {/* sneakers */}
          <path d="M74,238 Q66,252 78,253 L96,253 Q100,251 97,238 Z" fill="white" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M126,238 Q134,252 122,253 L104,253 Q100,251 103,238 Z" fill="white" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <line x1="74" y1="247" x2="98" y2="247" stroke={INK} strokeWidth="2" />
          <line x1="102" y1="247" x2="126" y2="247" stroke={INK} strokeWidth="2" />

          {/* left arm (relaxed) */}
          <Arm d="M70,138 Q59,162 56,184" sleeve={C.hoodie} />
          <Hand x={55} y={189} type="fist" skin={C.skin} />

          {/* neck */}
          <rect x="91" y="110" width="18" height="22" fill={C.skin} stroke={INK} strokeWidth="3" />

          {/* hoodie body */}
          <path d="M62,200 L62,152 Q62,128 88,124 L112,124 Q138,128 138,152 L138,200 Q120,206 100,206 Q80,206 62,200 Z" fill={C.hoodie} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          {/* cel shading */}
          <path d="M126,128 Q138,134 138,152 L138,199 Q130,202 122,204 Q130,168 126,128 Z" fill={C.hoodieD} opacity="0.7" stroke="none" />
          {/* hood collar */}
          <path d="M80,126 Q100,142 120,126 Q119,137 100,141 Q81,137 80,126 Z" fill={C.hoodieD} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          {/* drawstrings */}
          <line x1="93" y1="138" x2="91" y2="152" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="107" y1="138" x2="109" y2="152" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="91" cy="154" r="2" fill={INK} />
          <circle cx="109" cy="154" r="2" fill={INK} />
          {/* front pocket */}
          <path d="M80,172 L120,172 L113,194 L87,194 Z" fill={C.hoodie} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          {/* warm-orbit chest emblem */}
          <g transform="translate(100,160)">
            <ellipse cx="0" cy="0" rx="11" ry="5.5" fill="none" stroke={PURPLE} strokeWidth="2.2" transform="rotate(-18)" />
            <circle cx="0" cy="0" r="3" fill={RED} />
            <circle cx="9.5" cy="-4" r="2" fill={PURPLE} />
          </g>

          {/* right arm (posed) */}
          <g className={animated && right.anim ? right.anim : ""} style={{ transformOrigin: "130px 138px" }}>
            <Arm d={right.d} sleeve={C.hoodie} />
            <Hand {...right.hand} skin={C.skin} />
          </g>

          {/* head group */}
          <g className={animated ? "tony-headtilt" : ""} style={{ transformOrigin: "100px 110px" }}>
            {/* ears */}
            <ellipse cx="51" cy="74" rx="7" ry="10" fill={C.skin} stroke={INK} strokeWidth="3" />
            <ellipse cx="149" cy="74" rx="7" ry="10" fill={C.skin} stroke={INK} strokeWidth="3" />
            {/* head */}
            <path d="M52,66 Q52,22 100,22 Q148,22 148,66 Q148,98 128,111 Q100,124 72,111 Q52,98 52,66 Z" fill={C.skin} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            {/* face shading */}
            <path d="M128,40 Q146,52 144,76 Q142,98 126,108 Q140,90 138,66 Q137,48 128,40 Z" fill={C.skinD} opacity="0.5" stroke="none" />
            {/* hair — swooped quiff with comic fringe */}
            <path d="M52,64 Q50,18 100,18 Q150,18 148,64 L141,56 L136,64 L127,48 L116,60 L104,44 L93,58 L82,46 L72,60 L62,50 L56,64 Z" fill={C.hair} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M64,30 Q80,22 98,26" fill="none" stroke="white" opacity="0.25" strokeWidth="3" strokeLinecap="round" />
            {/* beard line */}
            {look.beard !== false && <path d="M60,86 Q70,112 100,117 Q130,112 140,86" fill="none" stroke={C.hair} strokeWidth="6" strokeLinecap="round" />}
            {/* brows */}
            <path d={brows.l} fill="none" stroke={C.hair} strokeWidth="5.5" strokeLinecap="round" />
            <path d={brows.r} fill="none" stroke={C.hair} strokeWidth="5.5" strokeLinecap="round" />
            {/* eyes */}
            {face === "love" ? (
              <g>
                <path d="M80,62 c-4,-7 -13,-4 -12,4 c1,5 8,9 12,12 c4,-3 11,-7 12,-12 c1,-8 -8,-11 -12,-4 Z" fill={RED} stroke={INK} strokeWidth="2.5" />
                <path d="M120,62 c-4,-7 -13,-4 -12,4 c1,5 8,9 12,12 c4,-3 11,-7 12,-12 c1,-8 -8,-11 -12,-4 Z" fill={RED} stroke={INK} strokeWidth="2.5" />
              </g>
            ) : face === "sparkle" ? (
              <g>
                <path d="M80,56 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z" fill={PURPLE} stroke={INK} strokeWidth="1.8" />
                <path d="M120,56 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z" fill={PURPLE} stroke={INK} strokeWidth="1.8" />
              </g>
            ) : (
              <g>
                <ellipse cx="80" cy="66" rx={bigEyes ? 10.5 : 9} ry={bigEyes ? 12.5 : 10.5} fill="white" stroke={INK} strokeWidth="2.8" />
                <ellipse cx="120" cy="66" rx={bigEyes ? 10.5 : 9} ry={bigEyes ? 12.5 : 10.5} fill="white" stroke={INK} strokeWidth="2.8" />
                <g className={animated && state === "idle" ? "tony-wander" : ""}>
                  <circle cx="80" cy={pupilsUp ? 61 : 68} r={bigEyes ? 4.8 : 4.2} fill="#3a2410" />
                  <circle cx="120" cy={pupilsUp ? 61 : 68} r={bigEyes ? 4.8 : 4.2} fill="#3a2410" />
                  <circle cx="81.5" cy={pupilsUp ? 59.5 : 66.5} r="1.4" fill="white" />
                  <circle cx="121.5" cy={pupilsUp ? 59.5 : 66.5} r="1.4" fill="white" />
                </g>
                {animated && (
                  <g className="tony-blink">
                    <ellipse cx="80" cy="66" rx="11" ry="13" fill={C.skin} />
                    <ellipse cx="120" cy="66" rx="11" ry="13" fill={C.skin} />
                  </g>
                )}
              </g>
            )}
            {/* nose */}
            <path d="M100,74 Q104,82 99,86" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            {/* blush */}
            <ellipse cx="68" cy="86" rx="7" ry="4.5" fill="#f08a8a" opacity={face === "love" || face === "big" ? 0.85 : 0.4} />
            <ellipse cx="132" cy="86" rx="7" ry="4.5" fill="#f08a8a" opacity={face === "love" || face === "big" ? 0.85 : 0.4} />
            {/* mouth */}
            {talking ? (
              <g>
                <g className="tony-mouth-a"><path d="M84,96 Q100,110 116,96" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" /></g>
                <g className="tony-mouth-b"><ellipse cx="100" cy="101" rx="10" ry="9" fill={INK} /><ellipse cx="100" cy="105" rx="5.5" ry="3.5" fill={RED} /></g>
              </g>
            ) : <Mouth face={face} />}

            {/* accessories */}
            {face === "idea" && <g className={animated ? "tony-acc" : ""}><path d="M158,18 a9,9 0 1,1 9,13 l0,6 -9,0 0,-6 a9,9 0 0,1 0,-13 Z" fill={YELLOW} stroke={INK} strokeWidth="2.5" /><line x1="160" y1="41" x2="166" y2="41" stroke={INK} strokeWidth="2.5" /></g>}
            {face === "surprise" && <g className={animated ? "tony-acc" : ""} stroke={RED} strokeWidth="4" strokeLinecap="round"><line x1="156" y1="26" x2="163" y2="14" /><line x1="166" y1="36" x2="176" y2="29" /><line x1="149" y1="19" x2="151" y2="9" /></g>}
            {face === "love" && <path className={animated ? "tony-acc" : ""} d="M163,22 c-3,-5 -10,-2 -9,3 c1,4 6,6 9,9 c3,-3 8,-5 9,-9 c1,-5 -6,-8 -9,-3 Z" fill={RED} stroke={INK} strokeWidth="2" />}
            {face === "think" && <text x="156" y="32" fontFamily="Bangers,cursive" fontSize="30" fill={PURPLE} stroke={INK} strokeWidth="1" className={animated ? "tony-acc" : ""}>?</text>}
            {face === "sweat" && <path d="M150,48 q5,9 0,13 q-6,-4 0,-13 Z" fill="#7fd4ff" stroke={INK} strokeWidth="2.2" className={animated ? "tony-acc" : ""} />}
            {listening && <g className={animated ? "tony-acc" : ""} fill="none" stroke={PURPLE} strokeWidth="3.5" strokeLinecap="round"><path d="M162,64 q6,12 0,24" /><path d="M170,59 q9,17 0,34" opacity="0.55" /></g>}
            {talking && <g className="tony-talk-arcs" fill="none" stroke={RED} strokeWidth="3.5" strokeLinecap="round"><path d="M126,98 q6,5 0,11" /><path d="M134,94 q9,8 0,18" opacity="0.6" /></g>}
          </g>
        </g>
      </svg>
      {animated && <style>{`
        .tony-drift { animation: tony-drift 12s ease-in-out infinite; }
        .tony-bob { animation: tony-bob 3.4s ease-in-out infinite; }
        @keyframes tony-drift {
          0%   { transform: translate(0px, 0px) rotate(-2deg); }
          22%  { transform: translate(-13px, -11px) rotate(2deg); }
          45%  { transform: translate(9px, -19px) rotate(-1.5deg); }
          70%  { transform: translate(15px, -5px) rotate(3deg); }
          100% { transform: translate(0px, 0px) rotate(-2deg); }
        }
        @keyframes tony-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
        .tony-sway { transform-origin: 100px 256px; animation: tony-sway 4.4s ease-in-out infinite; }
        @keyframes tony-sway {
          0%, 100% { transform: rotate(-1.3deg); }
          50%      { transform: rotate(1.3deg); }
        }
        .tony-headtilt { animation: tony-headtilt 6.5s ease-in-out infinite; }
        @keyframes tony-headtilt {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-2deg); }
          60% { transform: rotate(1.6deg); }
        }
        .tony-blink { transform-origin: 100px 66px; animation: tony-blink 4.3s infinite; transform: scaleY(0); }
        @keyframes tony-blink {
          0%, 91%, 100% { transform: scaleY(0); }
          94%, 97% { transform: scaleY(1); }
        }
        .tony-wander { animation: tony-wander 7.5s ease-in-out infinite; }
        @keyframes tony-wander {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(2.6px, 0.6px); }
          55% { transform: translate(-2.6px, 1.2px); }
          80% { transform: translate(1.2px, -1.2px); }
        }
        .tony-mouth-a { animation: tony-talk-a 0.42s steps(1) infinite; }
        .tony-mouth-b { animation: tony-talk-b 0.42s steps(1) infinite; }
        @keyframes tony-talk-a { 0%, 49% { opacity: 0; } 50%, 100% { opacity: 1; } }
        @keyframes tony-talk-b { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .tony-talk-arcs { animation: tony-talk-b 0.42s steps(1) infinite; }
        .tony-gesture { animation: tony-gesture 0.9s ease-in-out infinite; }
        @keyframes tony-gesture {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-7deg); }
        }
        .tony-wave { animation: tony-wave 1s ease-in-out infinite; }
        @keyframes tony-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-14deg); }
        }
        .tony-acc { animation: tony-pop 0.4s ease both; transform-origin: 158px 30px; }
        @keyframes tony-pop { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
      `}</style>}
    </div>
  );
}
