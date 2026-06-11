// Rico — match, chat and call with AI friends (and AI twins of real people).
// Dating-app layout: swipe deck / chats / profile tabs, framer-motion physics, aurora surface.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { AGENT_LIST, getAgent } from "../lib/agents";
import { detectLang, getStoredPref, storePref, getDetectedLang, storeDetectedLang, LANGS } from "../lib/i18n";
import TonyCharacter from "../components/TonyCharacter";
import RealRat from "../components/RealRat";
import Aurora from "../components/Aurora";

const T = {
  bg: "#0f0e17",
  panel: "rgba(255,255,255,0.055)",
  panel2: "rgba(255,255,255,0.09)",
  line: "rgba(255,255,255,0.1)",
  text: "#f5f3ff",
  sub: "#9b97b0",
  grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)",
  pink: "#ff5e7e",
  violet: "#8b5cf6",
};

const font = "'Inter',system-ui,-apple-system,sans-serif";

function Avatar({ agent, size = 52, ring = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", padding: ring ? 2.5 : 0, background: ring ? T.grad : "transparent", flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `linear-gradient(160deg,${agent?.look?.hoodie || "#ffe566"}33,#1d1930)`, border: `1px solid ${T.line}`, overflow: "hidden", display: "flex", justifyContent: "center" }}>
        <div style={{ marginTop: size * 0.04 }}>
          <TonyCharacter size={size * 1.62} look={agent?.look || {}} float="none" animated={false} pose="down" />
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="26" height="26" viewBox="0 0 26 26">
        <ellipse cx="13" cy="13" rx="11" ry="5.5" fill="none" stroke="url(#og)" strokeWidth="2" transform="rotate(-22 13 13)" />
        <circle cx="13" cy="13" r="3.4" fill="url(#og)" />
        <circle cx="22.4" cy="8.6" r="2" fill="#ff5e7e" />
        <defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
      </svg>
      <span style={{ fontWeight: 800, fontSize: 21, letterSpacing: -0.5, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>rico</span>
    </div>
  );
}

function SwipeCard({ agent, onDecide, topCard }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-16, 16]);
  const likeOp = useTransform(x, [30, 130], [0, 1]);
  const nopeOp = useTransform(x, [-30, -130], [0, 1]);
  return (
    <motion.div
      drag={topCard ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      style={{ x, rotate, position: "absolute", inset: 0, touchAction: "pan-y" }}
      onDragEnd={(e, info) => {
        if (info.offset.x > 110 || info.velocity.x > 600) onDecide("right");
        else if (info.offset.x < -110 || info.velocity.x < -600) onDecide("left");
      }}
      initial={{ scale: 0.96, y: 10, opacity: 0.7 }}
      animate={{ scale: topCard ? 1 : 0.955, y: topCard ? 0 : 12, opacity: 1 }}
      exit={{ x: 0, opacity: 0, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div style={{ height: "100%", borderRadius: 24, overflow: "hidden", background: "#1a1626", border: `1px solid ${T.line}`, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* portrait area */}
        <div style={{ flex: 1.35, background: `radial-gradient(120% 100% at 50% 0%, ${agent.look?.hoodie || "#ffe566"}40 0%, #161226 70%)`, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <TonyCharacter size={235} look={agent.look || {}} float="none" animated={false} pose="down" expr="😊" />
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6 }}>
            <span style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: `1px solid ${T.line}`, color: T.text, fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 100 }}>
              {agent.isTwin ? "🪞 TWIN · echo of a real person" : `${agent.emoji} ${agent.archetype}`}
            </span>
          </div>
          {/* swipe stamps */}
          <motion.div style={{ opacity: likeOp, position: "absolute", top: 24, right: 20, rotate: 12 }}>
            <span style={{ border: "3px solid #4ade80", color: "#4ade80", fontWeight: 900, fontSize: 28, padding: "4px 14px", borderRadius: 10, letterSpacing: 2 }}>FRIEND</span>
          </motion.div>
          <motion.div style={{ opacity: nopeOp, position: "absolute", top: 24, left: 20, rotate: -12 }}>
            <span style={{ border: "3px solid #ff5e7e", color: "#ff5e7e", fontWeight: 900, fontSize: 28, padding: "4px 14px", borderRadius: 10, letterSpacing: 2 }}>PASS</span>
          </motion.div>
        </div>
        {/* info */}
        <div style={{ padding: "16px 18px 18px" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>{agent.name}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 3, lineHeight: 1.45 }}>{agent.bio}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {(agent.interests || []).map(i => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: T.text, background: T.panel2, border: `1px solid ${T.line}`, padding: "4px 11px", borderRadius: 100 }}>{i}</span>)}
          </div>
          {agent.sample && <div style={{ marginTop: 11, fontSize: 12.5, color: T.sub, fontStyle: "italic", borderLeft: `2px solid ${T.violet}`, paddingLeft: 10, lineHeight: 1.5 }}>"{agent.sample}"</div>}
        </div>
      </div>
    </motion.div>
  );
}

export default function Rico() {
  const { user, isLoaded, isSignedIn } = useUser();
  const userName = user?.firstName || user?.fullName?.split(" ")[0] || "";
  const userId = user?.id || null;

  const [tab, setTab] = useState("discover");
  const [matches, setMatches] = useState(["tony"]);
  const [twins, setTwins] = useState([]);
  const [twinMap, setTwinMap] = useState({});
  const [splash, setSplash] = useState(null);
  const [ready, setReady] = useState(false);

  // chat state
  const [chatAgent, setChatAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [traits, setTraits] = useState({ O: 0, C: 0, E: 0, A: 0, N: 0 });
  const [riasec, setRiasec] = useState("");
  const [reportMsg, setReportMsg] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // me / twin state
  const [myTwin, setMyTwin] = useState(null);
  const [twinBusy, setTwinBusy] = useState(false);
  const [twinError, setTwinError] = useState("");
  const [langPref, setLangPref] = useState("auto");

  const langRef = useRef("en");
  const panelRef = useRef(null);
  const histRef = useRef([]);

  const lookup = useCallback((id) => twinMap[id] || getAgent(id), [twinMap]);

  useEffect(() => {
    const p = getStoredPref();
    setLangPref(p);
    langRef.current = p === "auto" ? (getDetectedLang() || "en") : p;
  }, []);

  // matches + twins
  useEffect(() => {
    if (!isLoaded) return;
    let local = ["tony"];
    try { const m = JSON.parse(localStorage.getItem("hitony_matches") || '["tony"]'); if (Array.isArray(m)) local = [...new Set(["tony", ...m])]; } catch (e) {}
    (async () => {
      if (isSignedIn) {
        try {
          const r = await fetch(`/api/matches?userId=${userId}`);
          const server = (await r.json()).matches || [];
          local = [...new Set(["tony", ...server, ...local])];
          const missing = local.filter(id => !server.includes(id));
          if (missing.length) fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agentIds: missing }) }).catch(() => {});
        } catch (e) {}
      }
      setMatches(local);
      localStorage.setItem("hitony_matches", JSON.stringify(local));
      try {
        const tw = await fetch(`/api/twin${userId ? `?exclude=${userId}` : ""}`).then(r => r.json());
        setTwins(tw.twins || []);
        setTwinMap(Object.fromEntries((tw.twins || []).map(t => [t.id, t])));
      } catch (e) {}
      if (isSignedIn) {
        try { const mt = await fetch(`/api/twin?id=twin__${userId}`).then(r => r.json()); if (mt.twin) setMyTwin(mt.twin); } catch (e) {}
      }
      setReady(true);
    })();
  }, [isLoaded, isSignedIn]);

  // resolve any matched twin ids we don't know yet (cross-device)
  useEffect(() => {
    matches.filter(id => id.startsWith("twin__") && !twinMap[id]).forEach(async id => {
      try { const d = await fetch(`/api/twin?id=${id}`).then(r => r.json()); if (d.twin) setTwinMap(p => ({ ...p, [id]: d.twin })); } catch (e) {}
    });
  }, [matches, twinMap]);

  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight; }, [messages, isTyping]);

  const deck = [...AGENT_LIST.filter(a => !matches.includes(a.id)), ...twins.filter(t => !matches.includes(t.id))];
  const [passed, setPassed] = useState([]);
  const visibleDeck = deck.filter(a => !passed.includes(a.id));
  const card = visibleDeck[0];
  const cardNext = visibleDeck[1];
  useEffect(() => { if (visibleDeck.length === 0 && passed.length > 0) setPassed([]); }, [visibleDeck.length, passed.length]);

  function decideCard(dir) {
    if (!card) return;
    if (dir === "right") {
      const m = [...new Set([...matches, card.id])];
      setMatches(m);
      localStorage.setItem("hitony_matches", JSON.stringify(m));
      if (isSignedIn) fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agentIds: [card.id] }) }).catch(() => {});
      setSplash(card);
    } else {
      setPassed(p => [...p, card.id]);
    }
  }

  // ---------- chat ----------
  const callAPI = useCallback(async (body) => {
    const res = await fetch("/api/tony", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: langRef.current, ...body }) });
    if (!res.ok) throw new Error("API " + res.status);
    return res.json();
  }, []);

  const parse = (raw) => {
    let data = null, text = raw.trim();
    const m = raw.match(/\{[^{}]*"O"\s*:\s*\d+[^{}]*\}/);
    if (m) { try { data = JSON.parse(m[0]); text = raw.replace(m[0], "").trim(); } catch (e) {} }
    return { data, text };
  };

  const cacheLast = (agentId, text) => { try { localStorage.setItem(`orbit_last_${agentId}`, text.slice(0, 64)); } catch (e) {} };

  async function openChat(agent) {
    setChatAgent(agent); setMessages([]); setHistory([]); histRef.current = []; setMsgCount(0); setResults(null);
    setIsTyping(true);
    let mem = null;
    if (isSignedIn) {
      try { mem = await fetch(`/api/conversation?userId=${userId}&agent=${agent.id}`).then(r => r.json()); } catch (e) {}
    }
    try {
      if (mem && mem.messages && mem.messages.length > 0) {
        setHistory(mem.messages); histRef.current = mem.messages;
        setTraits(mem.traits || { O: 0, C: 0, E: 0, A: 0, N: 0 }); setRiasec(mem.riasec || ""); setMsgCount(mem.msgCount || 0);
        const d = await callAPI({ messages: [...mem.messages, { role: "user", content: `[RETURNING USER: ${userName}. Welcome them back warmly, reference something from your past chats naturally. 1-3 sentences.]` }], mode: "chat", userName, userId, agentId: agent.id });
        const { data, text } = parse(d.raw || d.text);
        setMessages([{ role: "agent", text, id: Date.now() }]);
        const fh = [...mem.messages, { role: "assistant", content: d.raw || d.text }];
        setHistory(fh); histRef.current = fh;
        cacheLast(agent.id, text);
        if (data) { setTraits({ O: data.O, C: data.C, E: data.E, A: data.A, N: data.N }); if (data.riasec) setRiasec(data.riasec); }
      } else {
        const d = await callAPI({ messages: [], mode: "init", userName, userId, agentId: agent.id });
        const { data, text } = parse(d.raw || d.text);
        setMessages([{ role: "agent", text, id: Date.now() }]);
        const fh = [{ role: "user", content: "[START]" }, { role: "assistant", content: d.raw || d.text }];
        setHistory(fh); histRef.current = fh;
        cacheLast(agent.id, text);
      }
    } catch (e) {
      setMessages([{ role: "agent", text: `Hey! I'm ${agent.name} — so glad we matched. What's on your mind?`, id: Date.now() }]);
    }
    setIsTyping(false);
  }

  async function send() {
    const msg = input.trim();
    if (!msg || isTyping || !chatAgent) return;
    if (getStoredPref() === "auto") { const d = detectLang(msg); if (d && d !== langRef.current) { langRef.current = d; storeDetectedLang(d); } }
    setInput("");
    setMessages(p => [...p, { role: "user", text: msg, id: Date.now() }]);
    const nh = [...histRef.current, { role: "user", content: msg }];
    setHistory(nh); histRef.current = nh;
    setIsTyping(true);
    try {
      const d = await callAPI({ messages: nh, mode: "chat", userName, userId, agentId: chatAgent.id });
      const { data, text } = parse(d.raw || d.text);
      setMessages(p => [...p, { role: "agent", text, id: Date.now() }]);
      cacheLast(chatAgent.id, text);
      const fh = [...nh, { role: "assistant", content: d.raw || d.text }];
      setHistory(fh); histRef.current = fh;
      const nt = data ? { O: data.O, C: data.C, E: data.E, A: data.A, N: data.N } : traits;
      if (data) { setTraits(nt); if (data.riasec) setRiasec(data.riasec); }
      const nc = msgCount + 2; setMsgCount(nc);
      if (isSignedIn) fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agent: chatAgent.id, messages: fh, traits: nt, riasec: data?.riasec || riasec, msgCount: nc }) }).catch(() => {});
    } catch (e) {
      setMessages(p => [...p, { role: "agent", text: "Something went quiet on my end — say that again?", id: Date.now() }]);
    }
    setIsTyping(false);
  }

  async function revealResults() {
    setLoadingResults(true);
    try {
      const d = await callAPI({ messages: histRef.current, mode: "results", traitsData: { ...traits, riasec }, userName, userId, agentId: chatAgent.id });
      setResults(d.results || null);
    } catch (e) {}
    setLoadingResults(false);
  }

  async function sendReport(reason) {
    const m = reportMsg; setReportMsg(null);
    if (!m) return;
    try { await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: userId || "anon", agentId: chatAgent?.id || "tony", message: m.text, reason }) }); } catch (e) {}
  }

  async function createTwin() {
    setTwinBusy(true); setTwinError("");
    try {
      const r = await fetch("/api/twin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, userName }) });
      const d = await r.json();
      if (d.twin) setMyTwin(d.twin); else setTwinError(d.error || "Failed");
    } catch (e) { setTwinError("Failed — try again"); }
    setTwinBusy(false);
  }

  const tier = msgCount >= 40 ? "Close friend" : msgCount >= 10 ? "Friend" : "New friend";

  if (!isLoaded || !ready) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: font }}>
      <Head><title>rico</title></Head>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo /></motion.div>
      <div style={{ color: T.sub, fontSize: 12.5, fontWeight: 500 }}>Rico is fetching your people…</div>
    </div>
  );

  return (<>
    <Head>
      <title>rico — your people, always</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <meta name="theme-color" content="#0f0e17" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <Aurora />
      {/* phone canvas */}
      <div style={{ width: "100%", maxWidth: 430, height: "100vh", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* top bar */}
        <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSignedIn ? <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: { width: 30, height: 30 } } }} />
              : <SignInButton mode="modal"><button style={{ background: T.grad, border: "none", color: "white", fontWeight: 700, fontSize: 12.5, padding: "7px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Sign in</button></SignInButton>}
          </div>
        </div>

        {/* ===== DISCOVER ===== */}
        {tab === "discover" && (
          <div style={{ flex: 1, padding: "4px 18px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <AnimatePresence>
                {cardNext && <SwipeCard key={cardNext.id} agent={cardNext} topCard={false} onDecide={() => {}} />}
                {card && <SwipeCard key={card.id} agent={card} topCard={true} onDecide={decideCard} />}
              </AnimatePresence>
              {!card && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
                  <div style={{ fontSize: 40 }}>🐀</div>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>You've met everyone (for now)</div>
                  <div style={{ color: T.sub, fontSize: 13, maxWidth: 260 }}>Rico is off sniffing out new friends — they'll show up soon. Go talk to yours!</div>
                </div>
              )}
            </div>
            {card && (
              <div style={{ display: "flex", justifyContent: "center", gap: 22, paddingTop: 14 }}>
                <motion.button whileTap={{ scale: 0.82 }} onClick={() => decideCard("left")} aria-label="Pass" style={{ width: 58, height: 58, borderRadius: "50%", background: T.panel2, border: `1px solid ${T.line}`, color: "#ff5e7e", fontSize: 22, cursor: "pointer", backdropFilter: "blur(8px)" }}>✕</motion.button>
                <motion.button whileTap={{ scale: 0.82 }} onClick={() => decideCard("right")} aria-label="Connect" style={{ width: 70, height: 70, borderRadius: "50%", background: T.grad, border: "none", color: "white", fontSize: 26, cursor: "pointer", boxShadow: "0 10px 30px rgba(255,94,126,0.45)" }}>♥</motion.button>
              </div>
            )}
          </div>
        )}

        {/* ===== CHATS ===== */}
        {tab === "chats" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 80px" }}>
            <div style={{ color: T.sub, fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", margin: "6px 2px 12px" }}>Your people</div>
            {matches.map(id => {
              const a = lookup(id);
              let last = ""; try { last = localStorage.getItem(`orbit_last_${id}`) || ""; } catch (e) {}
              return (
                <motion.div key={id} whileTap={{ scale: 0.985 }} onClick={() => openChat(a)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 12px", borderRadius: 18, background: T.panel, border: `1px solid ${T.line}`, marginBottom: 10, cursor: "pointer", backdropFilter: "blur(10px)" }}>
                  <Avatar agent={a} size={50} ring />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                      {a.name} {a.isTwin && <span style={{ fontSize: 10, fontWeight: 700, color: T.violet, background: `${T.violet}22`, padding: "2px 7px", borderRadius: 100 }}>TWIN</span>}
                    </div>
                    <div style={{ color: T.sub, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last || a.bio}</div>
                  </div>
                  <a href={`/voice?agent=${id}`} onClick={e => e.stopPropagation()} style={{ width: 40, height: 40, borderRadius: "50%", background: T.panel2, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>📞</a>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ===== ME ===== */}
        {tab === "me" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 80px" }}>
            <div style={{ borderRadius: 22, padding: 18, background: T.panel, border: `1px solid ${T.line}`, backdropFilter: "blur(10px)", marginBottom: 14 }}>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 19 }}>{isSignedIn ? userName : "Hey, stranger"}</div>
              <div style={{ color: T.sub, fontSize: 13, marginTop: 3 }}>{isSignedIn ? "Your friends remember you across devices." : "Sign in so your friends can remember you."}</div>
              {!isSignedIn && <div style={{ marginTop: 10 }}><SignInButton mode="modal"><button style={{ background: T.grad, border: "none", color: "white", fontWeight: 700, fontSize: 13, padding: "9px 20px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Sign in</button></SignInButton></div>}
            </div>

            {/* TWIN */}
            <div style={{ borderRadius: 22, padding: 18, background: `linear-gradient(140deg,${T.violet}26,${T.pink}1a)`, border: `1px solid ${T.line}`, marginBottom: 14 }}>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>🪞 Your AI Twin</div>
              {myTwin ? (<>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                  <Avatar agent={myTwin} size={48} ring />
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{myTwin.name} <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>· live in the deck</span></div>
                    <div style={{ color: T.sub, fontSize: 12 }}>{myTwin.bio || myTwin.tagline}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={createTwin} disabled={twinBusy} style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 12.5, padding: "9px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{twinBusy ? "Re-learning you…" : "Refresh twin"}</button>
                  <button onClick={async () => { await fetch("/api/twin", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }); setMyTwin(null); }} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 12.5, padding: "9px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Retire</button>
                </div>
              </>) : (<>
                <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
                  Rico learns your character from your conversations and creates an AI version of you — your energy, your humor, your way of talking. Your twin joins the deck, and other people can match and talk with it.
                </div>
                {twinError && <div style={{ color: T.pink, fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{twinError}</div>}
                <button onClick={isSignedIn ? createTwin : undefined} disabled={twinBusy || !isSignedIn} style={{ marginTop: 12, width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: isSignedIn ? "pointer" : "not-allowed", opacity: isSignedIn ? 1 : 0.5, fontFamily: font }}>
                  {twinBusy ? "Learning who you are…" : isSignedIn ? "Create my twin" : "Sign in to create your twin"}
                </button>
              </>)}
            </div>

            {/* settings */}
            <div style={{ borderRadius: 22, background: T.panel, border: `1px solid ${T.line}`, overflow: "hidden", marginBottom: 14 }}>
              {[["🌐", "Language", (
                <select key="l" value={langPref} onChange={e => { setLangPref(e.target.value); storePref(e.target.value); if (e.target.value !== "auto") langRef.current = e.target.value; }} style={{ background: "transparent", color: T.text, border: "none", fontSize: 13.5, fontWeight: 600, outline: "none", fontFamily: font, textAlign: "right" }}>
                  <option value="auto" style={{ color: "#000" }}>Auto-detect</option>
                  {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k} style={{ color: "#000" }}>{v.native}</option>)}
                </select>
              )], ["👥", "Group hangouts", <a key="g" href="/groups" style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>Open →</a>],
              ["🧠", "Memory vault", <a key="m" href="/memory" style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>Open →</a>],
              ].map(([icon, label, control], i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{icon}&nbsp;&nbsp;{label}</div>
                  {control}
                </div>
              ))}
            </div>
            <div style={{ color: T.sub, fontSize: 11, textAlign: "center", lineHeight: 1.6 }}>🐀 That's Rico scurrying around — he finds your people.<br />AI friends, honestly labeled. Friendship only.<br />Voices are licensed — never cloned without consent.</div>
          </div>
        )}

        {/* the rat */}
        <RealRat busy={isTyping || twinBusy} height={34} bottom={64} />

        {/* tab bar */}
        <div style={{ display: "flex", borderTop: `1px solid ${T.line}`, background: "rgba(15,14,23,0.82)", backdropFilter: "blur(16px)", padding: "8px 10px 12px", position: "relative", zIndex: 5 }}>
          {[["discover", "♥", "Discover"], ["chats", "💬", "Chats"], ["me", "👤", "Me"]].map(([k, icon, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", fontFamily: font, position: "relative", padding: "6px 0" }}>
              {tab === k && <motion.div layoutId="tab-pill" style={{ position: "absolute", inset: "0 18%", borderRadius: 100, background: T.panel2 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <div style={{ position: "relative", fontSize: 16 }}>{icon}</div>
              <div style={{ position: "relative", fontSize: 10.5, fontWeight: 700, color: tab === k ? T.text : T.sub, marginTop: 2 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* ===== MATCH SPLASH ===== */}
        <AnimatePresence>
          {splash && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(10,9,16,0.78)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
              <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 240, damping: 18 }} style={{ textAlign: "center", width: "100%" }}>
                <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>It's a match</div>
                <div style={{ color: T.sub, fontSize: 13.5, marginTop: 4 }}>{splash.name} is already typing your first message…</div>
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }} style={{ display: "flex", justifyContent: "center", margin: "22px 0" }}>
                  <Avatar agent={splash} size={130} ring />
                </motion.div>
                <button onClick={() => { const a = splash; setSplash(null); setTab("chats"); openChat(a); }} style={{ width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Say hi</button>
                <button onClick={() => setSplash(null)} style={{ width: "100%", marginTop: 10, background: "transparent", border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Keep swiping</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== CHAT SCREEN ===== */}
        <AnimatePresence>
          {chatAgent && (
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} style={{ position: "absolute", inset: 0, zIndex: 20, background: T.bg, display: "flex", flexDirection: "column" }}>
              <Aurora />
              <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
                {/* chat header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${T.line}`, background: "rgba(15,14,23,0.7)", backdropFilter: "blur(14px)" }}>
                  <button onClick={() => setChatAgent(null)} style={{ background: "transparent", border: "none", color: T.text, fontSize: 20, cursor: "pointer", padding: 4 }}>←</button>
                  <Avatar agent={chatAgent} size={40} ring />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{chatAgent.name}</div>
                    <div style={{ color: T.sub, fontSize: 11.5 }}>{isTyping ? "typing…" : tier}</div>
                  </div>
                  {msgCount >= 6 && <button onClick={revealResults} disabled={loadingResults} title="Personality reveal" style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, borderRadius: 100, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>{loadingResults ? "…" : "✨"}</button>}
                  <a href={`/voice?agent=${chatAgent.id}`} style={{ width: 40, height: 40, borderRadius: "50%", background: T.grad, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16 }}>📞</a>
                </div>
                {/* messages */}
                <div ref={panelRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 70px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.map(m => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", position: "relative" }}
                      onDoubleClick={() => m.role === "agent" && setReportMsg(m)}>
                      <div style={{
                        padding: "11px 15px", fontSize: 14.5, lineHeight: 1.55, color: m.role === "user" ? "white" : T.text,
                        background: m.role === "user" ? T.grad : T.panel2,
                        border: m.role === "user" ? "none" : `1px solid ${T.line}`,
                        borderRadius: m.role === "user" ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
                        backdropFilter: "blur(8px)",
                      }} dangerouslySetInnerHTML={{ __html: m.text.replace(/</g, "&lt;").replace(/\*(.*?)\*/g, "<em>$1</em>") }} />
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div style={{ alignSelf: "flex-start", background: T.panel2, border: `1px solid ${T.line}`, borderRadius: "20px 20px 20px 5px", padding: "13px 16px", display: "flex", gap: 4 }}>
                      {[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} style={{ width: 6, height: 6, borderRadius: "50%", background: T.sub }} />)}
                    </div>
                  )}
                </div>
                {/* input */}
                <div style={{ padding: "10px 14px 14px", display: "flex", gap: 9, background: "rgba(15,14,23,0.8)", backdropFilter: "blur(14px)", borderTop: `1px solid ${T.line}` }}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
                    placeholder={`Message ${chatAgent.name}…`}
                    style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 100, padding: "13px 18px", color: T.text, fontSize: 14, outline: "none", fontFamily: font }} />
                  <motion.button whileTap={{ scale: 0.85 }} onClick={send} disabled={isTyping} style={{ width: 46, height: 46, borderRadius: "50%", background: T.grad, border: "none", color: "white", fontSize: 17, cursor: "pointer" }}>↑</motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* report sheet */}
        <AnimatePresence>
          {reportMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReportMsg(null)} style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end" }}>
              <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 240 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#1a1626", borderRadius: "24px 24px 0 0", padding: "20px 18px 26px", border: `1px solid ${T.line}` }}>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Report this message</div>
                <div style={{ color: T.sub, fontSize: 12.5, marginBottom: 14, fontStyle: "italic" }}>"{reportMsg.text.slice(0, 90)}…"</div>
                {[["wrong", "It's wrong or made up"], ["harmful", "It's harmful"], ["uncomfortable", "It made me uncomfortable"]].map(([k, label]) => (
                  <button key={k} onClick={() => sendReport(k)} style={{ width: "100%", textAlign: "left", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 14, padding: "13px 16px", borderRadius: 14, marginBottom: 8, cursor: "pointer", fontFamily: font }}>{label}</button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* results sheet */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setResults(null)} style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end" }}>
              <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 440 }} transition={{ type: "spring", stiffness: 280, damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "82%", overflowY: "auto", background: "#1a1626", borderRadius: "24px 24px 0 0", padding: "22px 20px 30px", border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 22, fontWeight: 900, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{results.personalityType}</div>
                <div style={{ color: T.sub, fontSize: 13.5, lineHeight: 1.6, marginTop: 6 }}>{results.summary}</div>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 14, margin: "16px 0 8px" }}>Career matches</div>
                {(results.careers || []).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, marginBottom: 7 }}>
                    <div><div style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{c.title}</div><div style={{ color: T.sub, fontSize: 11.5 }}>{c.why}</div></div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: i === 0 ? "#4ade80" : T.sub }}>{c.match}%</div>
                  </div>
                ))}
                {results.tonyNote && <div style={{ color: T.text, fontSize: 13, fontStyle: "italic", marginTop: 12, lineHeight: 1.6, borderLeft: `2px solid ${T.violet}`, paddingLeft: 12 }}>"{results.tonyNote}"</div>}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.bg}; }
      ::-webkit-scrollbar { width: 0; }
      em { font-style: italic; opacity: 0.85; }
      input::placeholder { color: ${T.sub}; }
    `}</style>
  </>);
}
