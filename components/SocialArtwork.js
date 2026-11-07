import { useId } from "react";

const palettes = {
  coast: ["#93c4c4", "#e9dbc0", "#3c818a", "#1c525d", "#f9d68b"],
  sunrise: ["#df9891", "#f5d3ac", "#8c8d80", "#425951", "#ffe6a3"],
  space: ["#302b59", "#847699", "#b9a5cc", "#575984", "#f7ca95"],
  coffee: ["#d8b79c", "#eee1c8", "#b67356", "#576552", "#e9c89d"],
  books: ["#8dafa9", "#e2dbc4", "#d89b75", "#354d52", "#edcb8d"],
  garden: ["#a5bbaa", "#e0dcc0", "#597e67", "#2e5444", "#e7bba0"],
};

export default function SocialArtwork({ theme = "coast", title = "A little everyday wonder", compact = false }) {
  const uid = useId().replace(/:/g, "");
  const [sky, light, main, dark, accent] = palettes[theme] || palettes.coast;
  const words = title.split(" ");
  const first = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const second = words.slice(Math.ceil(words.length / 2)).join(" ");
  return <svg viewBox="0 0 600 660" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${theme} illustration: ${title}`}>
    <defs><linearGradient id={`${uid}sky`} x2="0" y2="1"><stop stopColor={sky} /><stop offset="1" stopColor={light} /></linearGradient><pattern id={`${uid}grain`} width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#fff" opacity=".2" /></pattern></defs>
    <rect width="600" height="660" fill={`url(#${uid}sky)`} />
    {(theme === "coast" || theme === "sunrise") && <>
      <circle cx="410" cy="195" r="76" fill={accent} />
      <path d="M-40 385 130 215 325 407 470 300 650 415V660H0Z" fill={dark} opacity=".35" />
      <path d="M-40 450Q150 300 340 420T650 385V660H0Z" fill={main} />
      <path d="M-20 475Q180 410 350 480T650 460V660H0Z" fill={dark} />
      <path d="M-20 500Q140 460 310 510T650 505M-20 547Q180 500 350 555T650 540M80 585Q220 550 400 593" fill="none" stroke={light} strokeWidth="3" opacity=".5" />
      <path d="m95 165 16-6 16 6m22 33 13-5 13 5" fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      {theme === "coast" && <><path d="M322 456h97l-18 16h-63Z" fill={light} /><path d="M370 355v101h-63Z" fill={light} /><path d="M376 383v73h43Z" fill={accent} /></>}
    </>}
    {theme === "space" && <>
      {[[70,90],[170,210],[510,160],[460,390],[90,410],[330,110],[255,360],[540,510],[65,290],[375,490]].map(([x,y],i)=><g key={i} fill={light}><circle cx={x} cy={y} r={i%3+1.5} /><path d={`M${x-7} ${y}h14M${x} ${y-7}v14`} stroke={light} opacity={i%2?0:.6} /></g>)}
      <circle cx="340" cy="290" r="105" fill={accent} /><path d="M244 247q90-30 185 36M238 286q90-30 203 34M246 332q90-25 175 24" fill="none" stroke={main} strokeWidth="15" opacity=".35" />
      <ellipse cx="340" cy="300" rx="182" ry="42" transform="rotate(-25 340 300)" fill="none" stroke={light} strokeWidth="13" />
      <circle cx="130" cy="455" r="34" fill={main} /><path d="M0 590Q280 510 600 610V660H0" fill={dark} />
    </>}
    {(theme === "coffee" || theme === "books") && <>
      <rect x="295" y="90" width="210" height="255" rx="100" fill={light} opacity=".75" /><circle cx="410" cy="183" r="49" fill={accent} /><path d="M400 90v255M295 220h210" stroke={main} strokeWidth="8" opacity=".5" />
      <path d="M0 430Q300 410 600 435V660H0" fill={main} /><ellipse cx="270" cy="495" rx="160" ry="33" fill={dark} opacity=".2" />
      {theme === "coffee" ? <><ellipse cx="260" cy="489" rx="113" ry="24" fill={light} /><path d="M180 365h160v72q0 55-80 55t-80-55Z" fill={light} /><path d="M339 384h24q47 0 36 43t-59 20" fill="none" stroke={light} strokeWidth="19" /><ellipse cx="260" cy="366" rx="80" ry="24" fill={dark} /><ellipse cx="260" cy="368" rx="65" ry="16" fill="#9a6549" /><path d="M231 363q25-25 32 0 15-24 30-4-17 15-30 20Z" fill={light} /><path d="M228 320q-25-25 0-50t0-50M285 315q-25-25 0-50" stroke={light} strokeWidth="7" fill="none" opacity=".7" /></> : <><rect x="125" y="460" width="305" height="45" rx="7" fill={dark} /><path d="M140 468h275v28H140" fill={light} /><rect x="155" y="410" width="245" height="47" rx="6" fill={accent} /><path d="M175 422h207v22H175" fill={light} /><path d="M130 372q60-40 130-4 70-36 145 4v74q-75-36-145-4-70-32-130-4Z" fill={light} /><path d="M260 368v74M145 385q50-24 99 0m-98 14q50-24 98 0m34-14q50-24 99 0m-99 14q50-24 99 0" fill="none" stroke={main} strokeWidth="3" /></>}
      <path d="M85 365q-15-80-42-96 2 59 42 96m0 0q4-65 38-86-4 60-38 86" fill={dark} /><path d="M58 355h57l-8 75H68Z" fill={accent} />
    </>}
    {theme === "garden" && <>
      <circle cx="425" cy="178" r="70" fill={accent} /><path d="M0 460Q300 400 600 460V660H0" fill={main} opacity=".45" />
      <path d="M230 375h155l-26 162H257Z" fill={accent} /><ellipse cx="308" cy="375" rx="77" ry="17" fill={dark} /><path d="M307 376V175M307 280l-67-65M307 320l73-70" stroke={dark} strokeWidth="8" fill="none" />
      <path d="M307 260q-113-15-111-97 92 8 111 97M310 301q105-7 109-95-92 3-109 95M307 210q-62-45-21-112 58 58 21 112M305 352q-96 1-105-67 77-6 105 67" fill={dark} />
      <path d="M120 458V320m0 75-30-33m30 1 30-31" stroke={dark} strokeWidth="5" /><circle cx="117" cy="307" r="28" fill={light} /><circle cx="117" cy="307" r="9" fill={accent} /><path d="M83 435h75l-13 71H95Z" fill={light} />
      <path d="M461 482V354" stroke={dark} strokeWidth="5" /><ellipse cx="444" cy="394" rx="14" ry="34" transform="rotate(-40 444 394)" fill={dark} /><ellipse cx="478" cy="370" rx="14" ry="34" transform="rotate(40 478 370)" fill={dark} /><path d="M427 460h72l-9 75h-54Z" fill={dark} />
    </>}
    <rect width="600" height="660" fill={`url(#${uid}grain)`} />
    {!compact && <><rect x="30" y="30" width="147" height="31" rx="15" fill="#fff" opacity=".68" /><text x="104" y="50" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill={dark} letterSpacing="2">RICOMATES STUDIO</text><text x="36" y="570" fontFamily="Georgia, serif" fontSize="32" fill={theme === "space" || theme === "coast" || theme === "sunrise" ? light : dark}><tspan x="36">{first}</tspan><tspan x="36" dy="36">{second}</tspan></text></>}
  </svg>;
}
