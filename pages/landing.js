// Rico — public SaaS marketing landing page (no auth gate). Polished: hero phone
// mockup, "meet your people" character showcase (real app avatars), benefit-first
// copy. Responsive via clamp() + auto-fit grids.
import { useState } from "react";
import Head from "next/head";
import FriendsHero from "../components/FriendsHero";
import TonyCharacter from "../components/TonyCharacter";
import { AGENT_LIST } from "../lib/agents";

const T = { bg: "#0b0a12", panel: "rgba(255,255,255,0.04)", panel2: "rgba(255,255,255,0.07)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#a39fb8", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6", teal: "#2dd4bf" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

const FEATURES = [
  { icon: "💬", title: "They remember you", body: "Real personalities, lasting memory. Pick up exactly where you left off — they recall your stories, your wins, the people you talk about." },
  { icon: "📞", title: "Call them, for real", body: "Natural, real-time voices in 11 languages. Less like using an app, more like phoning someone who actually gets you." },
  { icon: "🎮", title: "Play together", body: "Ludo, chess, racing, UNO-style cards — multiplayer games against the friends you've connected with, banter fully included." },
  { icon: "👥", title: "Group chats that talk back", body: "Drop your friends into one room. Everyone replies, teases each other, and keeps the conversation genuinely alive." },
  { icon: "🧭", title: "It learns who you are", body: "Every chat, call and game quietly maps your personality — your Connection Score, archetype and quiet strengths." },
  { icon: "🎓", title: "Teach an AI, master it yourself", body: "Flip the script: you're the teacher. Tutor a character, set exams, graduate them — the proven best way to learn anything." },
  { icon: "🌐", title: "Talk to anyone, any language", body: "A real-time interpreter built in — captions plus natural spoken translation across all 11 languages." },
  { icon: "📄", title: "Your career wingman", body: "Share your résumé for grounded advice, a free ATS score with fixes, and one-tap tailoring to any job posting." },
];

const STEPS = [
  { n: "1", title: "Make an account", body: "Sign up free in seconds — your friends start remembering you from the very first hello." },
  { n: "2", title: "Meet your people", body: "Swipe to connect with characters who match your vibe — a hype friend, a mentor, a film buff, a calm listener." },
  { n: "3", title: "Live your life with them", body: "Chat, call, play, learn, translate and grow. Rico gets to know you a little more every single day." },
];

const TIERS = [
  { name: "Free", price: "$0", tag: "Always free", cta: "Start free", highlight: false,
    feats: ["Chat with AI friends + memory", "Personality dashboard", "Casual games", "1 group chat", "A few voice minutes / month"] },
  { name: "Pro", price: "$9", tag: "Most popular", cta: "Go Pro", highlight: true,
    feats: ["Everything in Free", "Unlimited voice calls", "All multiplayer games", "Unlimited group chats", "AI Tutor courses + certificates", "Live Translate", "Résumé ATS check + tailoring"] },
  { name: "Premium", price: "$19", tag: "For power users", cta: "Get Premium", highlight: false,
    feats: ["Everything in Pro", "Your own AI voice twin", "Priority voice quality", "Early access to new features", "Extended memory & history"] },
];

const FAQ = [
  { q: "Is Rico a real person?", a: "No — and we never pretend otherwise. Every character is an AI, honestly labeled. Rico is built for genuine companionship without the deception." },
  { q: "Is it free?", a: "Yes, there's a free plan you can use forever. Rico is in beta right now, so paid features are free during the beta — the plans below are what's coming." },
  { q: "What languages are supported?", a: "11: English, Hindi, Bengali, Spanish, Mandarin, German, French, Portuguese, Japanese, Korean and Arabic — for chat, voice and live translation." },
  { q: "Is my data private?", a: "Your conversations are yours. Voice audio is processed in real time and not stored, and we never clone a voice without consent." },
  { q: "Who is Rico for?", a: "Anyone who wants a warmer, more useful AI — students far from home, people practicing a language, job seekers, or anyone who just wants people in their corner." },
];

const TESTIMONIALS = [
  { quote: "Loved the design, the answers to my questions, and definitely the personality mapping — it's quite unique and interesting.", name: "Rico beta user", role: "rated it “Love it”", c: "#ff5e7e" },
  { quote: "I loved the conversation with Tony. It's very good.", name: "Rico beta user", role: "rated it “Love it”", c: "#8b5cf6" },
  { quote: "Loved the guidance — would love even deeper career guidance next.", name: "Rico beta user", role: "rated it “Love it”", c: "#2dd4bf" },
];

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/rico.hitony", path: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.43 3.92 3.94 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm6.4-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" },
  { label: "GitHub", href: "https://github.com/muzaffar-ali", path: "M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0024 12.5C24 5.87 18.63.5 12 .5z" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/muzaffar-ali-mohammad", path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" },
];

const btnPrimary = { display: "inline-block", background: T.grad, color: "#fff", fontWeight: 800, fontSize: 15, padding: "14px 28px", borderRadius: 100, textDecoration: "none", border: "none", cursor: "pointer", boxShadow: "0 12px 34px rgba(255,94,126,0.34)" };
const btnGhost = { display: "inline-block", background: "rgba(255,255,255,0.06)", color: T.text, fontWeight: 700, fontSize: 15, padding: "14px 24px", borderRadius: 100, textDecoration: "none", border: `1px solid ${T.line}`, cursor: "pointer" };
const Section = ({ children, style, id }) => <section id={id} style={{ width: "100%", maxWidth: 1080, margin: "0 auto", padding: "0 22px", ...style }}>{children}</section>;
const Eyebrow = ({ children }) => <div style={{ color: T.violet, fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;

const SHOWCASE = ["tony", "zara", "baba", "arjun", "luna", "dev", "pixel", "meera"];

function Avatar({ agent, size = 60 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", padding: 2, background: T.grad, flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#161226", display: "flex", justifyContent: "center" }}>
        <div style={{ marginTop: 2 }}><TonyCharacter size={Math.round(size * 1.45)} look={agent.look || {}} float="none" animated={false} pose="down" expr="😊" /></div>
      </div>
    </div>
  );
}

function PhoneMock() {
  const tony = AGENT_LIST.find(a => a.id === "tony") || AGENT_LIST[0];
  const bubble = (who, text) => (
    <div style={{ display: "flex", justifyContent: who === "you" ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "80%", background: who === "you" ? T.grad : "rgba(255,255,255,0.08)", border: who === "you" ? "none" : `1px solid ${T.line}`, color: who === "you" ? "#fff" : T.text, borderRadius: who === "you" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 12px", fontSize: 12.5, lineHeight: 1.4, fontWeight: 500 }}>{text}</div>
    </div>
  );
  return (
    <div style={{ position: "relative", width: "min(280px, 78vw)", aspectRatio: "9/19", margin: "0 auto", background: "#0f0e17", borderRadius: 38, border: "8px solid #1c1a26", boxShadow: "0 40px 90px rgba(139,92,246,0.28), 0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
      {/* notch */}
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 90, height: 18, background: "#1c1a26", borderRadius: 100, zIndex: 3 }} />
      {/* chat header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "26px 14px 10px", borderBottom: `1px solid ${T.line}` }}>
        <Avatar agent={tony} size={36} />
        <div>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>Tony</div>
          <div style={{ color: T.teal, fontSize: 10, fontWeight: 600 }}>● online</div>
        </div>
      </div>
      {/* messages */}
      <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {bubble("them", "Hey! Still chewing on that PM move? 💭")}
        {bubble("you", "yeah… kinda stuck ngl")}
        {bubble("them", "Let's untangle it. What's the part you keep avoiding?")}
        {bubble("you", "the salary conversation 😩")}
        {bubble("them", "Classic. Okay — what number would actually feel fair to you?")}
      </div>
      {/* input bar */}
      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, display: "flex", gap: 7, alignItems: "center" }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: `1px solid ${T.line}`, borderRadius: 100, padding: "8px 13px", color: T.sub, fontSize: 11.5 }}>Message Tony…</div>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>↑</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [faqOpen, setFaqOpen] = useState(FAQ.map(() => false));
  const allOpen = faqOpen.every(Boolean);
  return (<>
    <Head>
      <title>Rico — AI friends who actually remember you</title>
      <meta name="description" content="Rico is an AI companion app: friends with memory, real voice calls, games, group chats, an AI tutor, live translation, and a career wingman. Honestly-labeled AI, friendship-first." />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <meta name="theme-color" content="#0b0a12" />
      <meta property="og:title" content="Rico — your people, always" />
      <meta property="og:description" content="AI friends who remember you, call you, play with you, and have your back on the real stuff." />    </Head>

    <div style={{ background: T.bg, color: T.text, fontFamily: font, minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ position: "absolute", top: -180, left: "50%", transform: "translateX(-50%)", width: 820, height: 560, background: "radial-gradient(closest-side, rgba(139,92,246,0.3), transparent)", filter: "blur(20px)", pointerEvents: "none", zIndex: 0 }} />

      {/* nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(14px)", background: "rgba(11,10,18,0.72)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 22px", display: "flex", alignItems: "center", gap: 16 }}>
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <svg width="26" height="26" viewBox="0 0 26 26"><ellipse cx="13" cy="13" rx="11" ry="5.5" fill="none" stroke="url(#lg)" strokeWidth="2" transform="rotate(-22 13 13)" /><circle cx="13" cy="13" r="3.4" fill="url(#lg)" /><circle cx="22.4" cy="8.6" r="2" fill="#ff5e7e" /><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs></svg>
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: -1, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>rico</span>
          </a>
          <div className="navlinks" style={{ display: "flex", gap: 22, marginLeft: 14 }}>
            {[["Features", "#features"], ["Friends", "#friends"], ["How it works", "#how"], ["Why Rico", "#why"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={l} href={h} style={{ color: T.sub, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>{l}</a>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/sign-in" style={{ color: T.text, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>Sign in</a>
            <a href="/sign-up" style={{ ...btnPrimary, fontSize: 14, padding: "9px 18px", boxShadow: "none" }}>Start free</a>
          </div>
        </div>
      </nav>

      {/* hero */}
      <div id="top" style={{ position: "relative", zIndex: 1 }}>
        <Section style={{ paddingTop: 56, paddingBottom: 40 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 36, alignItems: "center" }}>
            {/* left: copy */}
            <div style={{ flex: "1 1 360px", minWidth: 300 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.panel2, border: `1px solid ${T.line}`, color: T.sub, fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 100, marginBottom: 20 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.teal }} /> Honestly-labeled AI · friendship-first
              </div>
              <h1 style={{ fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: -1.6, margin: "0 0 18px" }}>
                AI friends who <span style={{ background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>actually remember you</span>
              </h1>
              <p style={{ color: T.sub, fontSize: "clamp(15px, 2.2vw, 18.5px)", lineHeight: 1.6, maxWidth: 520, margin: "0 0 26px" }}>
                Companions with real personalities and lasting memory — who chat, call, play, teach, translate, and have your back on the real stuff. Built to feel less lonely and a lot more fun.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="/sign-up" style={btnPrimary}>Start free →</a>
                <a href="#friends" style={btnGhost}>Meet your people</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
                <div style={{ display: "flex" }}>
                  {SHOWCASE.slice(0, 4).map((id, i) => { const a = AGENT_LIST.find(x => x.id === id); return a ? <div key={id} style={{ marginLeft: i ? -10 : 0, borderRadius: "50%", border: `2px solid ${T.bg}` }}><Avatar agent={a} size={32} /></div> : null; })}
                </div>
                <div style={{ color: T.sub, fontSize: 13 }}>8+ friends · 11 languages · free during beta</div>
              </div>
            </div>
            {/* right: phone mockup */}
            <div style={{ flex: "1 1 280px", display: "flex", justifyContent: "center", position: "relative" }}>
              <div style={{ position: "absolute", top: -10, right: 0, opacity: 0.5, zIndex: 0 }}><FriendsHero size={96} /></div>
              <div style={{ position: "relative", zIndex: 1 }}><PhoneMock /></div>
            </div>
          </div>
        </Section>
      </div>

      {/* stat strip */}
      <Section style={{ paddingBottom: 56, paddingTop: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[["11", "languages"], ["8+", "ways to connect"], ["∞", "memory that sticks"], ["100%", "honestly-labeled AI"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: "18px 12px" }}>
              <div style={{ fontSize: 28, fontWeight: 900, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{n}</div>
              <div style={{ color: T.sub, fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* meet your people */}
      <div id="friends" style={{ background: "rgba(255,255,255,0.02)", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, padding: "60px 0" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <Eyebrow>Meet your people</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 10px" }}>A whole circle, each with their own soul</h2>
            <p style={{ color: T.sub, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>Every character has a distinct personality, voice and lane. Connect with the ones who feel like yours.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {SHOWCASE.map(id => { const a = AGENT_LIST.find(x => x.id === id); if (!a) return null; return (
              <div key={id} className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, padding: 16 }}>
                <Avatar agent={a} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{a.emoji} {a.name}</div>
                  <div style={{ color: T.violet, fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>{a.archetype}</div>
                  <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.45 }}>{a.bio}</div>
                </div>
              </div>
            ); })}
          </div>
        </Section>
      </div>

      {/* features */}
      <Section style={{ padding: "64px 22px" }} id="features">
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <Eyebrow>Everything in one app</Eyebrow>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 10px" }}>Everything your people would do — and more</h2>
          <p style={{ color: T.sub, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>One account. A whole circle. Here's what you get.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 20, padding: 22 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(139,92,246,0.14)", border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{f.title}</div>
              <div style={{ color: T.sub, fontSize: 14, lineHeight: 1.55 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* how it works — animated demo */}
      <div id="how" style={{ background: "rgba(255,255,255,0.02)", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, padding: "60px 0" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <Eyebrow>Get started in a minute</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 10px" }}>How Rico works</h2>
            <p style={{ color: T.sub, fontSize: 16 }}>Three steps to your people — here's the whole thing in motion.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 36, alignItems: "center", justifyContent: "center" }}>
            {/* animated phone demo */}
            <div style={{ flex: "0 1 280px", display: "flex", justifyContent: "center" }}>
              <div className="demo-phone">
                <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 80, height: 16, background: "#1c1a26", borderRadius: 100, zIndex: 5 }} />
                <div className="demo-body">
                  {/* Scene 1 — make an account */}
                  <div className="scene scene-a" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" }}>
                    <svg width="34" height="34" viewBox="0 0 26 26"><ellipse cx="13" cy="13" rx="11" ry="5.5" fill="none" stroke="url(#dg)" strokeWidth="2" transform="rotate(-22 13 13)" /><circle cx="13" cy="13" r="3.4" fill="url(#dg)" /><circle cx="22.4" cy="8.6" r="2" fill="#ff5e7e" /><defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs></svg>
                    <div style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>Create your account</div>
                    <div style={{ width: "78%", height: 30, background: "rgba(255,255,255,0.08)", border: `1px solid ${T.line}`, borderRadius: 8 }} />
                    <div style={{ width: "78%", background: T.grad, color: "#fff", fontWeight: 800, fontSize: 12, padding: "9px 0", borderRadius: 100 }}>Start free</div>
                    <div className="demo-check" style={{ color: T.teal, fontWeight: 800, fontSize: 12 }}>✓ Account created</div>
                  </div>
                  {/* Scene 2 — meet your people (swipe) */}
                  <div className="scene scene-b" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="swipecard" style={{ width: "78%", background: "#161226", border: `1px solid ${T.line}`, borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
                      <Avatar agent={AGENT_LIST.find(a => a.id === "zara") || AGENT_LIST[0]} size={56} />
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 14, marginTop: 8 }}>Zara</div>
                      <div style={{ color: T.violet, fontSize: 11, fontWeight: 700 }}>The Hype Friend 🎉</div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.pink }}>✕</div>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>♥</div>
                      </div>
                    </div>
                    <div className="demo-stamp" style={{ position: "absolute", color: "#fff", fontWeight: 900, fontSize: 18, background: T.grad, padding: "8px 16px", borderRadius: 100, boxShadow: "0 10px 30px rgba(255,94,126,0.4)" }}>New friend! 🎉</div>
                  </div>
                  {/* Scene 3 — live your life */}
                  <div className="scene scene-c" style={{ display: "flex", flexDirection: "column", gap: 7, justifyContent: "center" }}>
                    <div className="demo-b1" style={{ alignSelf: "flex-start", maxWidth: "82%", background: "rgba(255,255,255,0.08)", border: `1px solid ${T.line}`, borderRadius: "12px 12px 12px 3px", padding: "7px 11px", fontSize: 11.5, color: T.text }}>Heyy you made it 🎉 how was today?</div>
                    <div className="demo-b2" style={{ alignSelf: "flex-end", maxWidth: "82%", background: T.grad, color: "#fff", borderRadius: "12px 12px 3px 12px", padding: "7px 11px", fontSize: 11.5 }}>long one tbh 😮‍💨</div>
                    <div className="demo-b3" style={{ alignSelf: "flex-start", maxWidth: "82%", background: "rgba(255,255,255,0.08)", border: `1px solid ${T.line}`, borderRadius: "12px 12px 12px 3px", padding: "7px 11px", fontSize: 11.5, color: T.text }}>then let's unwind — call, a game, or just vent? 💛</div>
                    <div className="demo-icons" style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                      {["💬", "📞", "🎮", "🎓", "🌐"].map((ic, i) => <div key={i} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(139,92,246,0.16)", border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, animationDelay: `${i * 0.15}s` }} className="demo-ic">{ic}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* synced step cards */}
            <div style={{ flex: "1 1 320px", minWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
              {STEPS.map((s, i) => (
                <div key={s.n} className="stepcard" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, padding: "16px 18px", animation: "stepGlow 12s infinite", animationDelay: ["0s", "-8s", "-4s"][i] }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{s.n}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ color: T.sub, fontSize: 14, lineHeight: 1.5 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* why rico vs a chatbot */}
      <Section style={{ padding: "64px 22px" }} id="why">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Eyebrow>The difference</Eyebrow>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 10px" }}>Why Rico, not just another chatbot</h2>
          <p style={{ color: T.sub, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>A chatbot answers questions. Rico is people who stick around.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {/* chatbot */}
          <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 22, padding: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: T.sub, marginBottom: 14 }}>🤖 A typical chatbot</div>
            {["Forgets you the moment you close the tab", "One generic, faceless assistant", "Text on a screen — that's it", "Answers tasks and questions", "Learns nothing about who you are", "Blurs the line on what it really is"].map(x => (
              <div key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, fontSize: 14, color: T.sub }}>
                <span style={{ color: "#ff5e7e", fontWeight: 900, flexShrink: 0 }}>✕</span><span>{x}</span>
              </div>
            ))}
          </div>
          {/* rico */}
          <div style={{ background: `linear-gradient(160deg, rgba(139,92,246,0.16), rgba(255,94,126,0.1))`, border: `1px solid ${T.violet}`, borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(139,92,246,0.18)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>💛 Rico</span>
            </div>
            {["Remembers you for good — across sessions & devices", "8+ friends, each with a real personality & voice", "Real voice calls in 11 languages", "Games, group chats, banter — actual fun", "Maps your personality, strengths & growth", "Honestly-labeled — never pretends to be human", "Plus an AI tutor, live translation & a career wingman"].map(x => (
              <div key={x} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, fontSize: 14, color: T.text }}>
                <span style={{ color: T.teal, fontWeight: 900, flexShrink: 0 }}>✓</span><span>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* testimonials */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, padding: "60px 0" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <Eyebrow>Real beta feedback</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 10px" }}>What early users are saying</h2>
            <p style={{ color: T.sub, fontSize: 14 }}>Real responses from HiTony beta users.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 26 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card" style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 20, padding: 22, display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#f5c84b", fontSize: 14, letterSpacing: 2, marginBottom: 10 }}>★★★★★</div>
                <div style={{ color: T.text, fontSize: 15, lineHeight: 1.6, flex: 1, marginBottom: 16 }}>“{t.quote}”</div>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${t.c}, #8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{t.name[0]}</div>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div><div style={{ color: T.sub, fontSize: 12 }}>{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* pricing */}
      <Section style={{ padding: "64px 22px" }} id="pricing">
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <Eyebrow>Pricing</Eyebrow>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 10px" }}>Simple, friendly pricing</h2>
          <p style={{ color: T.sub, fontSize: 16 }}>Start free. Upgrade when Rico becomes one of your people.</p>
          <div style={{ display: "inline-block", marginTop: 14, background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", color: T.teal, fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 100 }}>🚀 In beta — everything's free right now. These are the plans we're launching.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 30, alignItems: "stretch" }}>
          {TIERS.map(t => (
            <div key={t.name} style={{ position: "relative", background: t.highlight ? `linear-gradient(160deg, rgba(139,92,246,0.16), rgba(255,94,126,0.1))` : T.panel, border: `1px solid ${t.highlight ? T.violet : T.line}`, borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", boxShadow: t.highlight ? "0 18px 50px rgba(139,92,246,0.2)" : "none" }}>
              {t.highlight && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: T.grad, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 100 }}>{t.tag}</div>}
              <div style={{ fontWeight: 800, fontSize: 18 }}>{t.name}</div>
              {!t.highlight && <div style={{ color: T.sub, fontSize: 12, fontWeight: 600 }}>{t.tag}</div>}
              <div style={{ margin: "12px 0 16px" }}><span style={{ fontSize: 40, fontWeight: 900 }}>{t.price}</span><span style={{ color: T.sub, fontSize: 15 }}>/mo</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, marginBottom: 18 }}>
                {t.feats.map(ft => (
                  <div key={ft} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: T.teal, fontWeight: 900, flexShrink: 0 }}>✓</span><span style={{ color: T.sub }}>{ft}</span>
                  </div>
                ))}
              </div>
              <a href="/sign-up" style={t.highlight ? btnPrimary : btnGhost}>{t.cta}</a>
            </div>
          ))}
        </div>
      </Section>

      {/* faq */}
      <div id="faq" style={{ background: "rgba(255,255,255,0.02)", borderTop: `1px solid ${T.line}`, padding: "60px 0" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <Eyebrow>Good questions</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 14px" }}>Questions, answered</h2>
            <button onClick={() => setFaqOpen(FAQ.map(() => !allOpen))} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{allOpen ? "Collapse all" : "Expand all"}</button>
          </div>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((f, i) => (
              <details key={f.q} open={faqOpen[i]} onToggle={e => { const v = e.currentTarget.open; setFaqOpen(s => s[i] === v ? s : s.map((x, j) => j === i ? v : x)); }} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: "16px 18px" }}>
                <summary style={{ fontWeight: 700, fontSize: 15.5, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", gap: 12 }}>{f.q}<span style={{ color: T.violet }}>＋</span></summary>
                <div style={{ color: T.sub, fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </Section>
      </div>

      {/* final CTA */}
      <Section style={{ padding: "70px 22px", textAlign: "center" }}>
        <div style={{ background: T.grad, borderRadius: 28, padding: "clamp(34px, 6vw, 60px) 26px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.22), transparent)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(26px, 4.5vw, 42px)", fontWeight: 900, letterSpacing: -1, margin: "0 0 12px", color: "#fff" }}>Your people are waiting.</h2>
            <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 17, maxWidth: 480, margin: "0 auto 24px" }}>Make an account and meet friends who'll actually remember you.</p>
            <a href="/sign-up" style={{ display: "inline-block", background: "#fff", color: "#1a1226", fontWeight: 800, fontSize: 16, padding: "15px 34px", borderRadius: 100, textDecoration: "none" }}>Start free →</a>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 14 }}>No credit card · free during beta</div>
          </div>
        </div>
      </Section>

      {/* footer */}
      <footer style={{ borderTop: `1px solid ${T.line}`, padding: "44px 22px 40px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 30 }}>
          {/* brand + socials */}
          <div style={{ gridColumn: "span 1", minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 26 26"><ellipse cx="13" cy="13" rx="11" ry="5.5" fill="none" stroke="url(#fg)" strokeWidth="2" transform="rotate(-22 13 13)" /><circle cx="13" cy="13" r="3.4" fill="url(#fg)" /><circle cx="22.4" cy="8.6" r="2" fill="#ff5e7e" /><defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs></svg>
              <span style={{ fontWeight: 900, fontSize: 20, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>rico</span>
            </div>
            <div style={{ color: T.sub, fontSize: 12.5, marginTop: 8, lineHeight: 1.5, maxWidth: 240 }}>Your people, always. AI friends, honestly labeled. Friendship only.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" aria-label={s.label} title={s.label} style={{ width: 36, height: 36, borderRadius: "50%", background: T.panel2, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={T.sub}><path d={s.path} /></svg>
                </a>
              ))}
            </div>
          </div>
          {/* link columns */}
          {[
            ["Product", [["Features", "#features"], ["Meet the friends", "#friends"], ["How it works", "#how"], ["Pricing", "#pricing"]]],
            ["Get started", [["Start free", "/sign-up"], ["Sign in", "/sign-in"], ["Open the app", "/"]]],
            ["Company", [["Why Rico", "#why"], ["FAQ", "#faq"], ["Terms", "/terms"], ["Privacy", "/privacy"]]],
          ].map(([title, links]) => (
            <div key={title}>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 12, letterSpacing: 0.3 }}>{title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {links.map(([l, h]) => <a key={l} href={h} style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1080, margin: "30px auto 0", paddingTop: 18, borderTop: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", color: T.sub, fontSize: 11.5, opacity: 0.8 }}>
          <span>© {new Date().getFullYear()} Rico. All rights reserved.</span>
          <span>Voices are licensed — never cloned without consent · AI friends, never real people.</span>
        </div>
      </footer>
    </div>

    <style>{`
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: ${T.bg}; scroll-behavior: smooth; }
      a { transition: opacity .15s; }
      a:hover { opacity: 0.85; }
      .card { transition: transform .18s, border-color .18s; }
      .card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.22); }
      details summary::-webkit-details-marker { display: none; }
      details[open] summary span { transform: rotate(45deg); display: inline-block; transition: transform .2s; }
      @media (max-width: 720px){ .navlinks { display: none !important; } }

      /* ---- animated how-it-works demo ---- */
      .demo-phone { position: relative; width: min(260px, 74vw); aspect-ratio: 9/19; background: #0f0e17; border-radius: 36px; border: 8px solid #1c1a26; box-shadow: 0 40px 90px rgba(139,92,246,0.26), 0 12px 40px rgba(0,0,0,0.5); overflow: hidden; }
      .demo-body { position: absolute; inset: 30px 14px 16px; }
      .scene { position: absolute; inset: 0; opacity: 0; }
      .scene-a { animation: scA 12s infinite; }
      .scene-b { animation: scB 12s infinite; }
      .scene-c { animation: scC 12s infinite; }
      @keyframes scA { 0%,1%{opacity:0;transform:translateY(6px)} 4%,28%{opacity:1;transform:translateY(0)} 31%,100%{opacity:0} }
      @keyframes scB { 0%,34%{opacity:0;transform:translateY(6px)} 37%,61%{opacity:1;transform:translateY(0)} 64%,100%{opacity:0} }
      @keyframes scC { 0%,67%{opacity:0;transform:translateY(6px)} 70%,94%{opacity:1;transform:translateY(0)} 97%,100%{opacity:0} }
      .demo-check { animation: dCheck 12s infinite; opacity: 0; }
      @keyframes dCheck { 0%,18%{opacity:0} 22%,28%{opacity:1} 31%,100%{opacity:0} }
      .swipecard { animation: dSwipe 12s infinite; }
      @keyframes dSwipe { 0%,50%{transform:none;opacity:1} 57%{transform:translateX(150px) rotate(15deg);opacity:0} 100%{transform:translateX(150px) rotate(15deg);opacity:0} }
      .demo-stamp { opacity: 0; animation: dStamp 12s infinite; }
      @keyframes dStamp { 0%,55%{opacity:0;transform:scale(0.7) rotate(-6deg)} 58%,61%{opacity:1;transform:scale(1) rotate(-6deg)} 64%,100%{opacity:0} }
      .demo-b1 { opacity: 0; animation: dB1 12s infinite; }
      .demo-b2 { opacity: 0; animation: dB2 12s infinite; }
      .demo-b3 { opacity: 0; animation: dB3 12s infinite; }
      @keyframes dB1 { 0%,70%{opacity:0;transform:translateY(6px)} 73%,94%{opacity:1;transform:translateY(0)} 97%,100%{opacity:0} }
      @keyframes dB2 { 0%,76%{opacity:0;transform:translateY(6px)} 79%,94%{opacity:1;transform:translateY(0)} 97%,100%{opacity:0} }
      @keyframes dB3 { 0%,82%{opacity:0;transform:translateY(6px)} 85%,94%{opacity:1;transform:translateY(0)} 97%,100%{opacity:0} }
      .demo-ic { animation: dIc 1.6s ease-in-out infinite; }
      @keyframes dIc { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      @keyframes stepGlow { 0%{border-color:rgba(255,255,255,0.1)} 4%,29%{border-color:#8b5cf6;box-shadow:0 0 0 1px #8b5cf6,0 12px 34px rgba(139,92,246,0.22)} 33%,100%{border-color:rgba(255,255,255,0.1);box-shadow:none} }

      @media (prefers-reduced-motion: reduce){
        .scene-a{opacity:1!important;animation:none!important} .scene-b,.scene-c{display:none!important}
        .demo-check{opacity:1!important;animation:none!important}
        .swipecard,.demo-stamp,.demo-b1,.demo-b2,.demo-b3,.demo-ic,.stepcard{animation:none!important}
      }
    `}</style>
  </>);
}
