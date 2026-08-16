// Brand asset page — Tony mascot poses for promos, decks, and video generation.
// Static SVGs are also exported at /mascot/*.svg for direct download.
import Head from "next/head";
import TonyCharacter from "../components/TonyCharacter";

const INK = "#1a1008";
const POSES = [
  { name: "tony-wave",     label: "WAVE",      props: { pose: "wave",    expr: "😄" } },
  { name: "tony-thumbsup", label: "THUMBS UP", props: { pose: "thumbs",  expr: "😄" } },
  { name: "tony-talking",  label: "TALKING",   props: { pose: "gesture", expr: "😊" } },
  { name: "tony-thinking", label: "THINKING",  props: { pose: "think",   expr: "🤔" } },
  { name: "tony-listening",label: "LISTENING", props: { pose: "listen",  expr: "😊", state: "listening" } },
  { name: "tony-love",     label: "LOVE",      props: { pose: "down",    expr: "🤍" } },
  { name: "tony-idea",     label: "IDEA",      props: { pose: "gesture", expr: "💡" } },
  { name: "tony-surprised",label: "SURPRISED", props: { pose: "down",    expr: "😲" } },
];

export default function MascotPage() {
  return (<>
    <Head>
      <title>Tony — mascot kit · hitony.ai</title>
    </Head>
    <div style={{ minHeight: "100vh", background: "#fdf8f0", fontFamily: "'Comic Neue',cursive", padding: 24, backgroundImage: "linear-gradient(rgba(26,16,8,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,16,8,0.05) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontFamily: "Bangers,cursive", fontSize: 44, color: "#7c4fcd", letterSpacing: 3, WebkitTextStroke: `1px ${INK}` }}>TONY — MASCOT KIT</div>
        <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>The HiTony mascot. Animated preview below; each pose downloads as a clean static SVG (vector — scales to any size for print, decks, or AI video input).</div>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 24 }}>Direct URLs: hitony.vercel.app/mascot/&lt;name&gt;.svg</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 18 }}>
          {POSES.map(p => (
            <div key={p.name} style={{ border: `3px solid ${INK}`, background: "white", boxShadow: `5px 5px 0 ${INK}`, padding: 16, textAlign: "center" }}>
              <TonyCharacter size={190} float="bob" state={p.props.state || "idle"} {...p.props} />
              <div style={{ fontFamily: "Bangers,cursive", fontSize: 18, color: INK, letterSpacing: 1, marginTop: 8 }}>{p.label}</div>
              <a href={`/mascot/${p.name}.svg`} download style={{ display: "inline-block", marginTop: 6, background: "#e63946", color: "white", border: `2px solid ${INK}`, padding: "4px 12px", fontFamily: "Bangers,cursive", fontSize: 13, textDecoration: "none", boxShadow: `2px 2px 0 ${INK}` }}>⬇ SVG</a>
            </div>
          ))}
        </div>

        {/* static instances used for SVG export — clean, no animation */}
        <div id="export-row" style={{ position: "absolute", left: -9999, top: 0 }}>
          {POSES.map(p => (
            <div key={p.name} data-name={p.name}>
              <TonyCharacter size={520} float="none" animated={false} state={p.props.state || "idle"} {...p.props} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>);
}
