// Rico — meet, chat and call with AI friends (and AI twins of real people).
// Friendship-app layout: discover deck / chats / you (personality dashboard) tabs,
// framer-motion physics, aurora surface.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { AGENT_LIST, getAgent } from "../lib/agents";
import { detectLang, getStoredPref, storePref, getDetectedLang, storeDetectedLang, LANGS } from "../lib/i18n";
import TonyCharacter from "../components/TonyCharacter";
import Aurora from "../components/Aurora";
import TwinVoiceRecorder from "../components/TwinVoiceRecorder";
import ConsentGate from "../components/ConsentGate";
import GameBoard from "../components/GameBoard";
import Dashboard from "../components/Dashboard";
import ProactiveCheckin from "../components/ProactiveCheckin";
import MemorySpotlight from "../components/MemorySpotlight";
import WeeklyDigest from "../components/WeeklyDigest";
import SocialFeed from "../components/SocialFeed";
import DailyHome from "../components/DailyHome";
import SocialInbox from "../components/SocialInbox";
import GameLobby from "../components/GameLobby";
import ChatWorkspace from "../components/ChatWorkspace";
import { visibleMessages } from "../lib/conversation-view";
import { captureSource, getSource } from "../lib/source";
import { CONSENT_VERSION } from "../lib/consent";
import Onboarding from "../components/Onboarding";

import TwinLookEditor from "../components/TwinLookEditor";

const T = {
  bg: "#0f0e17",
  panel: "rgba(255,255,255,0.055)",
  panel2: "rgba(255,255,255,0.09)",
  line: "rgba(255,255,255,0.1)",
  text: "#f5f3ff",
  sub: "#a9a5c0",
  grad: "#d6365e", // solid CTA: white text on it passes WCAG AA
  pink: "#ff5e7e",
  violet: "#8b5cf6",
};

const font = "'DM Sans',system-ui,-apple-system,sans-serif";

function Avatar({ agent, size = 52, ring = false, emote = "none" }) {
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => { setImgOk(true); }, [agent?.avatar]);
  const showImg = !!agent?.avatar && imgOk;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", padding: ring ? 2.5 : 0, background: ring ? T.grad : "transparent", flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `linear-gradient(160deg,${agent?.look?.hoodie || "#ffe566"}33,#1d1930)`, border: `1px solid ${T.line}`, overflow: "hidden", display: "flex", justifyContent: "center" }}>
        {showImg ? (
          <img src={agent.avatar} alt="" onError={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        ) : (
          <div style={{ marginTop: size * 0.04 }}>
            <TonyCharacter size={size * 1.62} look={agent?.look || {}} float="none" animated={false} pose="down" emote={emote} />
          </div>
        )}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ animation: "rm-orbit 14s linear infinite" }}>
        <ellipse cx="13" cy="13" rx="11" ry="5.5" fill="none" stroke="url(#og)" strokeWidth="2" transform="rotate(-22 13 13)" />
        <circle cx="13" cy="13" r="3.4" fill="url(#og)" />
        <circle cx="22.4" cy="8.6" r="2" fill="#ff5e7e" />
        <defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff5e7e" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
      </svg>
      <span className="rm-display" style={{ fontWeight: 800, fontSize: 21, letterSpacing: -0.6, color: T.text }}>ricomates</span>
    </div>
  );
}

function SwipeCard({ agent, onDecide, topCard, exitDir = "left" }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-16, 16]);
  const likeOp = useTransform(x, [30, 130], [0, 1]);
  const nopeOp = useTransform(x, [-30, -130], [0, 1]);
  // lively entrance ("watching from the window"), then a fitting idle emote
  const [em, setEm] = useState(topCard ? "peek" : "none");
  useEffect(() => {
    if (!topCard) { setEm("none"); return; }
    setEm("peek");
    const fun = /Hype|Curious|Twin/.test(agent.archetype || "");
    const t = setTimeout(() => setEm(fun ? "dance" : "wave"), 950);
    const t2 = fun ? null : setTimeout(() => setEm("none"), 2600); // calm ones settle
    return () => { clearTimeout(t); if (t2) clearTimeout(t2); };
  }, [agent.id, topCard]); // eslint-disable-line react-hooks/exhaustive-deps -- archetype is stable per agent
  return (
    <motion.div
      drag={topCard ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.7}
      dragMomentum={false}
      style={{ x, rotate, position: "absolute", inset: 0, touchAction: "pan-y", cursor: topCard ? "grab" : "default" }}
      whileDrag={{ cursor: "grabbing" }}
      onDragEnd={(e, info) => {
        if (info.offset.x > 90 || info.velocity.x > 450) onDecide("right");
        else if (info.offset.x < -90 || info.velocity.x < -450) onDecide("left");
      }}
      initial={{ scale: 0.96, y: 10, opacity: 0.7 }}
      animate={{ scale: topCard ? 1 : 0.955, y: topCard ? 0 : 12, opacity: 1 }}
      exit={{ x: exitDir === "right" ? 460 : -460, opacity: 0, rotate: exitDir === "right" ? 18 : -18, transition: { duration: 0.34 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div style={{ height: "100%", borderRadius: 24, overflow: "hidden", background: "#1a1626", border: `1px solid ${T.line}`, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* portrait area */}
        <div style={{ flex: 1.35, background: `radial-gradient(120% 100% at 50% 0%, ${agent.look?.hoodie || "#ffe566"}40 0%, #161226 70%)`, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{ position: "absolute", width: 250, height: 250, top: 18, borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.22)", animation: "rm-orbit 18s linear infinite" }}><div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#fff", top: 20, left: 42 }} /></div>
          <div aria-hidden="true" style={{ position: "absolute", width: 330, height: 330, top: -22, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", animation: "rm-orbit-rev 30s linear infinite" }} />
          {agent.avatar ? <img src={agent.avatar} alt={`${agent.name}'s AI portrait`} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} /> : <TonyCharacter size={235} look={agent.look || {}} float="none" animated={false} pose="down" expr="😊" emote={topCard ? em : "none"} />}
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6 }}>
            <span style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: `1px solid ${T.line}`, color: T.text, fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 100 }}>
              {agent.isTwin ? "TWIN · echo of a real person" : `AI FRIEND · ${agent.archetype}`}
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
          <div className="rm-display" style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: -0.6 }}>{agent.name}</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 3, lineHeight: 1.45 }}>{agent.bio}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {(agent.interests || []).map(i => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: T.text, background: T.panel2, border: `1px solid ${T.line}`, padding: "4px 11px", borderRadius: 100 }}>{i}</span>)}
          </div>
          {agent.sample && <div style={{ marginTop: 11, fontSize: 13.5, color: T.text, background: "#262338", padding: "10px 13px", borderRadius: "16px 16px 16px 4px", lineHeight: 1.45 }}>“{agent.sample}”</div>}
        </div>
      </div>
    </motion.div>
  );
}

export default function Rico() {
  const { user, isLoaded, isSignedIn } = useUser();
  const userName = user?.firstName || user?.fullName?.split(" ")[0] || "";
  const userId = user?.id || null;

  const [tab, setTab] = useState("home");
  useEffect(() => { if (new URLSearchParams(window.location.search).has("socialPost")) setTab("social"); }, []);
  const [matches, setMatches] = useState(["tony"]);
  const [twins, setTwins] = useState([]);
  const [twinMap, setTwinMap] = useState({});
  const [splash, setSplash] = useState(null);


  // chat state
  const [chatAgent, setChatAgent] = useState(null);
  const [chatError, setChatError] = useState("");
  const [chatLoadError, setChatLoadError] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const chatTokenRef = useRef(0);
  const pendingSavesRef = useRef({});
  const matchStorageKey = 'rico_matches_' + userId;
  const [chatMem, setChatMem] = useState([]); // "<Name> remembers" chips: only real facts from this friend's chat
  const [messages, setMessages] = useState([]);
  const [, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [showGames, setShowGames] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");
  const submitResume = async (fileData, fileMime, fileName) => {
    if (resumeBusy) return;
    setResumeBusy(true); setResumeMsg("");
    try {
      const r = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "save", userId, userName, text: resumeText, fileData, fileMime, fileName }) });
      const d = await r.json();
      if (d.ok) { setShowResume(false); setResumeText(""); if (d.profile) setHasResume(d.profile); setMessages(p => [...p, { role: "agent", text: d.ack || "Got it — I've read your résumé and I'll keep it in mind. 📄", id: Date.now() }]); }
      else setResumeMsg(d.ack || d.error || "Couldn't read that — try pasting the text instead.");
    } catch (e) { setResumeMsg("Something went wrong — try again."); }
    setResumeBusy(false);
  };
  // résumé management + ATS
  const [hasResume, setHasResume] = useState(null); // stored profile or null
  const [showAts, setShowAts] = useState(false);
  const [atsBusy, setAtsBusy] = useState(false);
  const [atsReport, setAtsReport] = useState(null);
  const [atsTarget, setAtsTarget] = useState("");
  const [atsErr, setAtsErr] = useState("");
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "get", userId }) })
      .then(r => r.json()).then(d => setHasResume(d.resume || null)).catch(() => {});
  }, [isSignedIn, userId]);
  const runAts = async () => {
    if (atsBusy) return; setAtsBusy(true); setAtsErr(""); setAtsReport(null);
    try {
      const r = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "ats", userId, targetRole: atsTarget }) });
      const d = await r.json();
      if (d.ok && d.report) setAtsReport(d.report);
      else setAtsErr(d.error || "Couldn't analyze — try again.");
    } catch (e) { setAtsErr("Something went wrong — try again."); }
    setAtsBusy(false);
  };
  const removeResume = async () => {
    try { await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "clear", userId }) }); } catch (e) {}
    setHasResume(null); setAtsReport(null);
  };
  // tailor résumé to a job
  const [showTailor, setShowTailor] = useState(false);
  const [tailorJD, setTailorJD] = useState("");
  const [tailorBusy, setTailorBusy] = useState(false);
  const [tailorReport, setTailorReport] = useState(null);
  const [tailorErr, setTailorErr] = useState("");
  const [tailorCopied, setTailorCopied] = useState(false);
  const runTailor = async () => {
    if (tailorBusy || tailorJD.trim().length < 40) { setTailorErr("Paste the full job description first."); return; }
    setTailorBusy(true); setTailorErr(""); setTailorReport(null); setTailorCopied(false);
    try {
      const r = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "tailor", userId, jobDescription: tailorJD }) });
      const d = await r.json();
      if (d.ok && d.report) setTailorReport(d.report);
      else setTailorErr(d.error || "Couldn't tailor it — try again.");
    } catch (e) { setTailorErr("Something went wrong — try again."); }
    setTailorBusy(false);
  };
  const [boardGame, setBoardGame] = useState(null); // "chess" | "ttt" | null
  const GAMES = [
    { key: "chess", icon: "♟", label: "Chess", board: true },
    { key: "checkers", icon: "🔴", label: "Checkers", board: true },
    { key: "c4", icon: "🔵", label: "Connect 4", board: true },
    { key: "ttt", icon: "⭕", label: "Tic-Tac-Toe", board: true },
    { key: "ludo", icon: "🎲", label: "Ludo (4-player)", board: true },
    { key: "racing", icon: "🏎️", label: "Dice Dash race", board: true },
    { key: "uno", icon: "🎴", label: "Color Clash (cards)", board: true },
    { key: "20q", icon: "🔮", label: "20 Questions", kick: "Let's play 20 Questions! You think of a person, place or thing and I'll try to guess it in 20 yes/no questions. Ask me to start, or you guess mine — your call!" },
    { key: "wyr", icon: "⚖️", label: "Would You Rather", kick: "Let's play Would You Rather! Hit me with your first one, or start me off with a fun dilemma." },
    { key: "trivia", icon: "🧠", label: "Trivia", kick: "Let's play trivia! Pick a category (movies, sports, science, random…) and fire away, or start quizzing me." },
    { key: "hangman", icon: "🔤", label: "Hangman", kick: "Let's play Hangman! Think of a word and tell me the number of letters, and I'll guess — or I'll set one up for you." },
    { key: "story", icon: "📖", label: "Story Builder", kick: "Let's build a story together, one line each. I'll start: \"It was a stormy night when the lights suddenly went out…\" — your turn!" },
    { key: "riddles", icon: "❓", label: "Riddles", kick: "Hit me with a riddle, or want me to stump you with one first?" },
    { key: "rps", icon: "✊", label: "Rock Paper Scissors", kick: "Rock, Paper, Scissors — best of 3! On three… type your move: rock, paper or scissors. 🪨📄✂️" },
    { key: "2t1l", icon: "🎭", label: "Two Truths & a Lie", kick: "Two Truths and a Lie! Tell me three things about you and I'll guess the lie — or I'll go first." },
  ];
  const startGame = (g) => {
    setShowGames(false);
    if (isSignedIn && userId) fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "game", game: g.key }) }).catch(() => {});
    if (g.board) setBoardGame(g.key); else send(g.kick);
  };
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
  const [showVoiceRec, setShowVoiceRec] = useState(false);
  const [twinReady, setTwinReady] = useState(null); // {ready, progress, have, need}
  const [showLookEditor, setShowLookEditor] = useState(false);
  const [lookSaved, setLookSaved] = useState(false);
  const refreshMyTwin = useCallback(async () => {
    if (!userId) return;
    try { const mt = await fetch(`/api/twin?id=twin__${userId}`).then(r => r.json()); if (mt.twin) setMyTwin(mt.twin); } catch (e) {}
  }, [userId]);
  // re-check how well Rico knows the user whenever they open the Me tab without a twin yet
  useEffect(() => {
    if (tab !== "me" || !isSignedIn || myTwin || !userId) return;
    fetch(`/api/twin?readiness=${userId}`).then(r => r.json()).then(setTwinReady).catch(() => {});
  }, [tab, isSignedIn, myTwin, userId]);
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

  // SaaS front door: send logged-out visitors to the public marketing page; the
  // app at "/" is only for signed-in users.
  useEffect(() => { if (isLoaded && !isSignedIn) window.location.replace("/landing"); }, [isLoaded, isSignedIn]);

  useEffect(() => {
    chatTokenRef.current += 1;
    pendingSavesRef.current = {};
    setChatAgent(null); setMessages([]); setInput(""); setMatches(["tony"]); setMyTwin(null);
    return () => { chatTokenRef.current += 1; };
  }, [userId]);

  // Show the app immediately; account data fills in independently in the background.
  useEffect(() => {
    if (!isLoaded || !userId) return;
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let local = ["tony"];
    try { const m = JSON.parse(localStorage.getItem(matchStorageKey) || '["tony"]'); if (Array.isArray(m)) local = [...new Set(["tony", ...m])]; } catch (e) {}
    setMatches(local);
    const read = async url => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Profile unavailable");
      return response.json();
    };
    Promise.allSettled([
      read('/api/matches?userId=' + encodeURIComponent(userId)).then(data => {
        if (!alive) return;
        const server = data.matches || [];
        const merged = [...new Set(["tony", ...server, ...local])];
        setMatches(merged);
        try { localStorage.setItem(matchStorageKey, JSON.stringify(merged)); } catch (e) {}
        const missing = merged.filter(id => !server.includes(id));
        if (missing.length) fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agentIds: missing }), signal: controller.signal }).catch(() => {});
      }),
      read('/api/twin?exclude=' + encodeURIComponent(userId)).then(data => {
        if (!alive) return;
        setTwins(data.twins || []);
        setTwinMap(Object.fromEntries((data.twins || []).map(t => [t.id, t])));
      }),
      read('/api/twin?id=twin__' + encodeURIComponent(userId)).then(data => {
        if (alive && data.twin) setMyTwin(data.twin);
      }),
    ]);
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, [isLoaded, userId, matchStorageKey]);

  // resolve any matched twin ids we don't know yet (cross-device)
  useEffect(() => {
    matches.filter(id => id.startsWith("twin__") && !twinMap[id]).forEach(async id => {
      try {
        const d = await fetch(`/api/twin?id=${id}`).then(r => r.json());
        if (d.twin) setTwinMap(p => ({ ...p, [id]: d.twin }));
        else if (d.twin === null) setMatches(p => p.filter(x => x !== id)); // twin gone/renamed — never let lookup() fall back to Tony
      } catch (e) {}
    });
  }, [matches, twinMap]);

  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight; }, [messages, isTyping]);

  const deck = [...AGENT_LIST.filter(a => !matches.includes(a.id)), ...twins.filter(t => !matches.includes(t.id))];
  const [passed, setPassed] = useState([]);
  const [lastDir, setLastDir] = useState("left");


  const [needsConsent, setNeedsConsent] = useState(false);
  const [needsTour, setNeedsTour] = useState(false);
  // After sign-in, require agreement to Terms/Privacy/AI consent once, then a feature tour once.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) { setNeedsConsent(false); setNeedsTour(false); return; }
    try { setNeedsTour(localStorage.getItem(`rico_tour_${userId}`) !== "1"); } catch (e) { setNeedsTour(true); }
    let local = false;
    try { local = localStorage.getItem(`rico_consent_${userId}`) === CONSENT_VERSION; } catch (e) {}
    if (local) { setNeedsConsent(false); return; }
    fetch(`/api/consent?userId=${userId}`).then(r => r.json()).then(d => {
      if (d.accepted) { try { localStorage.setItem(`rico_consent_${userId}`, CONSENT_VERSION); } catch (e) {} setNeedsConsent(false); }
      else setNeedsConsent(true);
    }).catch(() => setNeedsConsent(true));
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!chatAgent || !isSignedIn || !userId) return;
    let alive = true;
    fetch(`/api/remembers?userId=${userId}&lang=${langRef.current}&agent=${encodeURIComponent(chatAgent.id)}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (alive && d?.ok) setChatMem((d.items || []).slice(0, 3)); }).catch(() => {});
    return () => { alive = false; };
  }, [chatAgent?.id, isSignedIn, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // first-touch attribution (also runs for visitors who land directly on the app)
  useEffect(() => { captureSource(); }, []);

  // one-time dev→production Clerk move: pull this person's old data across, then reload so
  // every panel refetches it (see pages/api/migrate.js). Once per user per browser.
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    const flag = `rico_migrated5_${userId}`; // v5: also repoints twin__<old> refs; v4: dev key fixed; v1–v3 ran with the wrong one
    try { if (localStorage.getItem(flag)) return; } catch (e) {}
    fetch("/api/migrate", { method: "POST" }).then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return;
      try { localStorage.setItem(flag, "1"); if (d.moved > 0) localStorage.removeItem(matchStorageKey); } catch (e) {} // stale local ids would re-add twin__<old>
      if (d.moved > 0) window.location.reload();
    }).catch(() => {});
  }, [isSignedIn, userId, matchStorageKey]);

  // retention tracking: stamp first/last-seen + active days once per session (+ signup source)
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, source: getSource() }) }).catch(() => {});
  }, [isSignedIn, userId]);
  const finishTour = (variant) => {
    try { localStorage.setItem(`rico_tour_${userId}`, "1"); } catch (e) {}
    setNeedsTour(false);
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "tour_done", variant: variant || "complete" }) }).catch(() => {});
  };
  const visibleDeck = deck.filter(a => !passed.includes(a.id));
  const card = visibleDeck[0];
  const cardNext = visibleDeck[1];
  useEffect(() => { if (visibleDeck.length === 0 && passed.length > 0) setPassed([]); }, [visibleDeck.length, passed.length]);
  // Matched with everyone → Discover disappears and we land on Chats. It comes back on its
  // own as soon as someone new (a new friend or a new community twin) joins the deck.
  const allMet = deck.length === 0;
  useEffect(() => { if (allMet && tab === "discover") setTab("chats"); }, [allMet, tab]);

  function decideCard(dir) {
    if (!card) return;
    setLastDir(dir);
    if (dir === "right") {
      const m = [...new Set([...matches, card.id])];
      setMatches(m);
      localStorage.setItem(matchStorageKey, JSON.stringify(m));
      if (isSignedIn) fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agentIds: [card.id] }) }).catch(() => {});
      setSplash(card);
    } else {
      setPassed(p => [...p, card.id]);
    }
  }

  // ---------- chat ----------
  const callAPI = useCallback(async (body) => {
    const res = await fetch("/api/tony", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: langRef.current, ...body }), signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error("API " + res.status);
    return res.json();
  }, []);

  const parse = (raw) => {
    let data = null, text = raw.trim();
    const m = raw.match(/\{[^{}]*"O"\s*:\s*\d+[^{}]*\}/);
    if (m) { try { data = JSON.parse(m[0]); text = raw.replace(m[0], "").trim(); } catch (e) {} }
    return { data, text };
  };

  const cacheLast = (agentId, text) => { try { localStorage.setItem(`orbit_last_${userId}_${agentId}`, text.slice(0, 64)); } catch (e) {} };

  async function saveChat(payload, token) {
    pendingSavesRef.current[payload.agent] = payload;
    if (token === chatTokenRef.current) setSaveState("saving");
    try {
      const response = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      if (pendingSavesRef.current[payload.agent] === payload) delete pendingSavesRef.current[payload.agent];
      if (token === chatTokenRef.current) { setSaveState("saved"); setChatError(""); }
    } catch (error) {
      if (token === chatTokenRef.current) { setSaveState("error"); setChatError("Your reply is here, but it hasn’t saved yet. Keep this page open and retry."); }
    }
  }

  async function openChat(agent) {
    const token = ++chatTokenRef.current;
    setChatAgent(agent); setChatMem([]); setMessages([]); setHistory([]); histRef.current = []; setMsgCount(0); setResults(null);
    setChatError(""); setChatLoadError(false); setSaveState("idle"); setIsTyping(true);
    let mem = pendingSavesRef.current[agent.id];
    try {
      if (!mem && isSignedIn) {
        const response = await fetch(`/api/conversation?userId=${encodeURIComponent(userId)}&agent=${encodeURIComponent(agent.id)}`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("load");
        mem = await response.json();
      }
      if (token !== chatTokenRef.current) return;
      if (mem?.messages?.length) {
        setHistory(mem.messages); histRef.current = mem.messages;
        setMessages(visibleMessages(mem.messages));
        setTraits(Object.fromEntries(["O", "C", "E", "A", "N"].map(key => [key, mem.traits?.[key] || 0])));
        setRiasec(mem.riasec || ""); setMsgCount(mem.msgCount || 0);
        setSaveState(pendingSavesRef.current[agent.id] ? "error" : "saved");
        if (pendingSavesRef.current[agent.id]) setChatError("This conversation has unsaved messages. Retry to keep them on your account.");
      } else {
        setTraits({ O: 0, C: 0, E: 0, A: 0, N: 0 }); setRiasec("");
        const response = await callAPI({ messages: [], mode: "init", userName, userId, agentId: agent.id });
        if (token !== chatTokenRef.current) return;
        const raw = response.raw || response.text;
        if (typeof raw !== "string" || !raw.trim()) throw new Error("reply");
        setMessages([{ role: "agent", text: parse(raw).text, id: Date.now() }]);
        const history = [{ role: "user", content: "[START]" }, { role: "assistant", content: raw }];
        setHistory(history); histRef.current = history;
      }
    } catch (error) {
      if (token === chatTokenRef.current) { setChatLoadError(true); setChatError("We couldn’t open this conversation. Retry before sending so your saved history stays together."); }
    } finally { if (token === chatTokenRef.current) setIsTyping(false); }
  }

  async function send(textArg) {
    const msg = (typeof textArg === "string" ? textArg : input).trim();
    if (!msg || isTyping || !chatAgent || chatLoadError || (saveState === "error" || saveState === "saving")) return;
    const token = chatTokenRef.current;
    const agent = chatAgent;
    const previousHistory = histRef.current;
    const previousMessages = messages;
    if (getStoredPref() === "auto") { const detected = detectLang(msg); if (detected && detected !== langRef.current) { langRef.current = detected; storeDetectedLang(detected); } }
    setInput(""); setChatError("");
    setMessages(previous => [...previous, { role: "user", text: msg, id: Date.now() }]);
    const nextHistory = [...previousHistory, { role: "user", content: msg }];
    setIsTyping(true);
    try {
      const response = await callAPI({ messages: nextHistory, mode: "chat", userName, userId, agentId: agent.id });
      if (token !== chatTokenRef.current) return;
      const raw = response.raw || response.text;
      if (typeof raw !== "string" || !raw.trim()) throw new Error();
      const { data, text } = parse(raw);
      setMessages(previous => [...previous, { role: "agent", text, id: Date.now() + 1 }]);

      cacheLast(agent.id, text);
      const fullHistory = [...nextHistory, { role: "assistant", content: raw }];
      setHistory(fullHistory); histRef.current = fullHistory;
      const scores = Object.fromEntries(["O", "C", "E", "A", "N"].map(key => [key, Number.isFinite(data?.[key]) ? Math.max(0, Math.min(100, data[key])) : traits[key] || 0]));
      setTraits(scores); if (data?.riasec) setRiasec(data.riasec);
      const count = msgCount + 2; setMsgCount(count);
      if (isSignedIn) await saveChat({ userId, agent: agent.id, messages: fullHistory, traits: scores, riasec: data?.riasec || riasec, msgCount: count }, token);
      if (isSignedIn && count >= 6) {
        try {
          const key = `rico_act_${userId}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, "1");
            fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "activation" }) }).catch(() => {});
          }
        } catch (error) {}
      }
    } catch (error) {
      if (token === chatTokenRef.current) { setMessages(previousMessages); setInput(msg); setChatError("Your message couldn’t be sent. It’s back in the box below—try again when you’re ready."); }
    } finally { if (token === chatTokenRef.current) setIsTyping(false); }
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
      if (d.twin) setMyTwin(d.twin);
      else { setTwinError(d.error || "Failed"); if (typeof d.progress === "number") setTwinReady({ ready: false, progress: d.progress, have: d.have, need: d.need }); }
    } catch (e) { setTwinError("Failed — try again"); }
    setTwinBusy(false);
  }



  if (!isLoaded) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <Head><title>ricomates</title></Head>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo /></motion.div>
    </div>
  );

  // Logged-out visitors are redirected to the public marketing page (/landing) by the
  // effect above — render a minimal brand loader while that redirect happens.
  if (!isSignedIn) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <Head><title>ricomates</title></Head>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo /></motion.div>
    </div>
  );

  return (<>
    <Head>
      <title>ricomates</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <meta name="theme-color" content="#0f0e17" />    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <Aurora />
      {needsConsent && isSignedIn && <ConsentGate userId={userId} onAccept={() => setNeedsConsent(false)} />}
      {!needsConsent && needsTour && isSignedIn && <Onboarding onDone={finishTour} />}
      {/* phone canvas */}
      <div className="rm-app-shell" data-home={tab === "home" && !chatAgent ? "true" : "false"} style={{ width: "100%", maxWidth: chatAgent ? 1360 : ["home", "chats"].includes(tab) ? 1120 : 640, height: "100dvh", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* top bar */}
        <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSignedIn ? <UserButton appearance={{ elements: { avatarBox: { width: 30, height: 30 } } }} />
              : <SignInButton mode="modal"><button style={{ background: T.grad, border: "none", color: "white", fontWeight: 700, fontSize: 12.5, padding: "7px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Sign in</button></SignInButton>}
          </div>
        </div>

        {/* ===== TODAY ===== */}
        {tab === "home" && (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <DailyHome
              userId={userId}
              userName={userName}
              friends={matches.map(lookup).filter(Boolean)}
              onChat={(id, draft = "") => {
                const agent = lookup(id);
                if (!agent) return;
                setInput(draft);
                if (!matches.includes(id)) {
                  const next = [...new Set([...matches, id])];
                  setMatches(next);
                  try { localStorage.setItem(matchStorageKey, JSON.stringify(next)); } catch (error) {}
                  fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agentIds: [id] }) }).catch(() => {});
                }
                openChat(agent);
              }}
              onDiscover={() => setTab(allMet ? "chats" : "discover")}
              onChats={() => setTab("chats")}
              onPlay={() => { setInput(""); openChat(lookup("tony")); setShowGames(true); }}
            />
          </div>
        )}

        {/* ===== DISCOVER ===== */}
        {tab === "discover" && (
          <div style={{ flex: 1, padding: "4px 18px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "2px 2px 14px" }}>
              <h1 className="rm-display" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, color: T.text }}>Meet your <span style={{ color: "#ff7b96" }}>next friend</span></h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, color: T.sub, fontSize: 13.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2dd4bf", animation: "rm-blink 2s ease-in-out infinite" }} />
                {deck.length} {deck.length === 1 ? "friend is" : "friends are"} waiting to meet you
              </div>
            </div>
            <div style={{ flex: 1, position: "relative", minHeight: 0, animation: "rm-floaty 6s ease-in-out infinite" }}>
              <AnimatePresence>
                {cardNext && <SwipeCard key={cardNext.id} agent={cardNext} topCard={false} onDecide={() => {}} />}
                {card && <SwipeCard key={card.id} agent={card} topCard={true} onDecide={decideCard} exitDir={lastDir} />}
              </AnimatePresence>
            </div>
            {card && (
              <div style={{ display: "flex", justifyContent: "center", gap: 22, paddingTop: 14 }}>
                <motion.button whileTap={{ scale: 0.82 }} onClick={() => decideCard("left")} aria-label="Pass" style={{ width: 58, height: 58, borderRadius: "50%", background: T.panel2, border: `1px solid ${T.line}`, color: "#ff5e7e", fontSize: 22, cursor: "pointer", backdropFilter: "blur(8px)" }}>✕</motion.button>
                <motion.button whileTap={{ scale: 0.82 }} onClick={() => decideCard("right")} aria-label="Connect" style={{ animation: "rm-pulse 1.8s ease-out infinite", width: 70, height: 70, borderRadius: "50%", background: T.grad, border: "none", color: "white", fontSize: 26, cursor: "pointer", boxShadow: "0 10px 30px rgba(255,94,126,0.45)" }}>♥</motion.button>
              </div>
            )}
          </div>
        )}

        {/* ===== CHATS ===== */}
        {tab === "chats" && <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <SocialInbox key={chatAgent ? "chat-open" : "inbox"} userId={userId} friends={matches.map(lookup).filter(Boolean)} onChat={agent => { setInput(""); openChat(agent); }} onDiscover={() => setTab(allMet ? "social" : "discover")} onProfile={() => setTab("me")} onPlay={() => { setInput(""); openChat(lookup("tony")); setShowGames(true); }}>
            <ProactiveCheckin userId={userId} lang={langRef.current} T={T} font={font} onOpen={id => openChat(lookup(id))} />
          </SocialInbox>
        </div>}

        {/* ===== SOCIAL — unified cross-club feed ===== */}
        {tab === "social" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 0", display: "flex", flexDirection: "column" }}>
            {isSignedIn && userId ? (
              <SocialFeed userId={userId} userName={userName} lang={langRef.current} T={T} font={font} onChat={id => { setInput(""); openChat(lookup(id)); }} />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>🌐</div>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 17 }}>See what your friends are up to</div>
                <div style={{ color: T.sub, fontSize: 13, marginTop: 6, maxWidth: 260 }}>Sign in to see your AI friends post, debate, and meme — and jump in yourself.</div>
              </div>
            )}
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

            {/* LIVING MEMORY — what your friends remember about you (the moat, made visible) */}
            {isSignedIn && userId && <MemorySpotlight userId={userId} lang={langRef.current} T={T} font={font} />}

            {/* WEEKLY DIGEST — "your week with Rico" recap, a lightweight re-engagement reason */}
            {isSignedIn && userId && <WeeklyDigest userId={userId} lang={langRef.current} T={T} font={font} />}

            {/* PERSONALITY DASHBOARD — your scores from chat, voice & games */}
            {isSignedIn && <Dashboard userId={userId} userName={userName} onOpenGroups={() => { window.location.href = "/groups"; }} />}

            {/* RÉSUMÉ — Tony's career grounding + ATS analyzer */}
            {isSignedIn && (
              <div style={{ borderRadius: 22, padding: 18, background: `linear-gradient(140deg,${T.violet}1e,${T.pink}12)`, border: `1px solid ${T.line}`, marginBottom: 14 }}>
                {hasResume ? (<>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 22 }}>📄</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>Tony knows your résumé ✓</div>
                      <div style={{ color: T.sub, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hasResume.headline || hasResume.currentRole || "Saved to your career chat"}</div>
                    </div>
                    {hasResume.atsScore != null && <div style={{ textAlign: "center", flexShrink: 0 }}><div style={{ fontWeight: 900, fontSize: 19, color: hasResume.atsScore >= 75 ? "#4ade80" : hasResume.atsScore >= 50 ? "#f5c84b" : T.pink }}>{hasResume.atsScore}</div><div style={{ color: T.sub, fontSize: 9, letterSpacing: 0.5 }}>ATS</div></div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={() => { setAtsErr(""); setShowAts(true); }} style={{ flex: 1, background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 13, padding: "11px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>🎯 ATS check</button>
                    <button onClick={() => { setResumeMsg(""); setShowResume(true); }} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 13, padding: "11px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Update</button>
                    <button onClick={removeResume} title="Remove résumé" style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.sub, fontWeight: 700, fontSize: 13, padding: "11px 14px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>🗑</button>
                  </div>
                  <button onClick={() => { setTailorErr(""); setShowTailor(true); }} style={{ width: "100%", marginTop: 8, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 13, padding: "11px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>✍️ Tailor my résumé to a job</button>
                </>) : (<>
                  <div style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>📄 Share your résumé with Tony</div>
                  <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5, marginTop: 5 }}>He'll ground his career advice in your real background — and run a free <b style={{ color: T.text }}>ATS score</b> with specific fixes to help you pass automated screeners.</div>
                  <button onClick={() => { setResumeMsg(""); setShowResume(true); }} style={{ width: "100%", marginTop: 12, background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>📄 Share résumé</button>
                </>)}
              </div>
            )}

            {/* TWIN */}
            <div style={{ borderRadius: 22, padding: 18, background: `linear-gradient(140deg,${T.violet}26,${T.pink}1a)`, border: `1px solid ${T.line}`, marginBottom: 14 }}>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>🪞 Your AI Twin</div>
              <a href="/twin-studio" style={{ display: "block", marginTop: 12, padding: "16px", borderRadius: 14, background: "linear-gradient(120deg,#d8fd8e,#bee9df)", color: "#17271e", fontWeight: 800, textDecoration: "none" }}>✳ Twin Studio <span style={{ float: "right" }}>Shape · rehearse · create →</span></a>
              <a href="/meetings" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "12px 14px", borderRadius: 14, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13, fontWeight: 700, textDecoration: "none" }}><span>✦ Meeting companion</span><span style={{ color: T.sub, fontSize: 12 }}>Prepare · notes · follow-ups →</span></a>
              {myTwin ? (<>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                  <Avatar agent={myTwin} size={48} ring />
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{myTwin.name} <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>· {myTwin.discoverable === false ? "private AI twin" : "shared AI twin"}</span></div>
                    <div style={{ color: T.sub, fontSize: 12 }}>{myTwin.bio || myTwin.tagline}</div>
                  </div>
                </div>
                <button onClick={() => setShowVoiceRec(true)} style={{ width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", background: myTwin.voiceCloned ? `linear-gradient(135deg,${T.violet}33,${T.pink}22)` : T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13, padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontFamily: font }}>
                  <span>🎙 Twin's voice</span>
                  <span style={{ color: myTwin.voiceCloned ? "#4ade80" : T.sub, fontSize: 12.5, fontWeight: 700 }}>{myTwin.voiceCloned ? "Your real voice ✓" : "Clone my voice →"}</span>
                </button>
                <button onClick={() => { setLookSaved(false); setShowLookEditor(true); }} style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13, padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontFamily: font }}>
                  <span>📸 Twin's look</span>
                  <span style={{ color: T.sub, fontSize: 12.5, fontWeight: 700 }}>Make it from my photo →</span>
                </button>
                {lookSaved && <div role="status" style={{ color: "#4ade80", fontSize: 12, marginTop: 8 }}>Your twin’s new look is saved ✓</div>}
                <div style={{ color: T.sub, fontSize: 10.5, marginTop: 6, lineHeight: 1.45 }}>Create a realistic AI portrait from your photo. Preview it before saving it to your twin.</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={createTwin} disabled={twinBusy} style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 12.5, padding: "9px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{twinBusy ? "Re-learning you…" : "Refresh twin"}</button>
                  <button onClick={async () => { await fetch("/api/twin", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }); setMyTwin(null); }} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 12.5, padding: "9px 16px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Retire</button>
                </div>
              </>) : (<>
                <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
                  Rico learns your character from your conversations and creates an AI version of you — your energy, your humor, your way of talking. Your twin joins the deck, and other people can match and talk with it.
                </div>
                {twinError && <div style={{ color: T.pink, fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{twinError}</div>}
                {!isSignedIn ? (
                  <button disabled style={{ marginTop: 12, width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 14, padding: "12px 0", borderRadius: 100, opacity: 0.5, fontFamily: font }}>Sign in to create your twin</button>
                ) : twinReady && !twinReady.ready ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ color: T.text, fontSize: 12.5, fontWeight: 600 }}>Rico is getting to know you</span>
                      <span style={{ color: T.sub, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round((twinReady.progress || 0) * 100)}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 100, background: T.panel2, overflow: "hidden" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((twinReady.progress || 0) * 100)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} style={{ height: "100%", background: T.grad, borderRadius: 100 }} />
                    </div>
                    <div style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.5, marginTop: 8 }}>
                      The fastest way? Just <b style={{ color: T.text }}>talk to Rico</b> — a voice chat teaches it your character quickly.
                    </div>
                    <a href="/voice?agent=tony&build=1" style={{ marginTop: 12, display: "block", textAlign: "center", textDecoration: "none", background: T.grad, color: "white", fontWeight: 800, fontSize: 14, padding: "13px 0", borderRadius: 100, fontFamily: font }}>🎙 Talk to Rico to build your twin</a>
                    <div style={{ color: T.sub, fontSize: 11, textAlign: "center", marginTop: 8 }}>🔒 Your twin unlocks automatically once Rico knows you</div>
                  </div>
                ) : (
                  <>
                    {twinReady && <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 600, marginTop: 12 }}>✓ Rico knows you well enough to build your twin.</div>}
                    <button onClick={createTwin} disabled={twinBusy} style={{ marginTop: 10, width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>
                      {twinBusy ? "Learning who you are…" : "Create my twin"}
                    </button>
                  </>
                )}
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
              ["🎓", "AI Tutor — teach a friend", <a key="t" href="/classroom" style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>Open →</a>],
              ["🌐", "Live Translate — talk across languages", <a key="lt" href="/translate" style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>Open →</a>],
              ["🧠", "Memory vault", <a key="m" href="/memory" style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>Open →</a>],
              ["✦", "Meeting companion", <a key="meet" href="/meetings" style={{ color: T.sub, textDecoration: "none", fontSize: 13.5 }}>Open →</a>],
              ["📖", "How Rico works", <button key="hr" onClick={() => setNeedsTour(true)} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Take the tour →</button>],
              ["📄", "Terms & Privacy", <span key="tp" style={{ fontSize: 13.5 }}><a href="/terms" style={{ color: T.sub, textDecoration: "none" }}>Terms</a> <span style={{ color: T.line }}>·</span> <a href="/privacy" style={{ color: T.sub, textDecoration: "none" }}>Privacy</a></span>],
              ["🗑️", "Delete account", <a key="da" href="/delete-account" style={{ color: "#f87171", textDecoration: "none", fontSize: 13.5 }}>Delete →</a>],
              ].map(([icon, label, control], i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{icon}&nbsp;&nbsp;{label}</div>
                  {control}
                </div>
              ))}
            </div>
            <div style={{ color: T.sub, fontSize: 11, textAlign: "center", lineHeight: 1.6 }}>💛 Rico — your people, always.<br />AI friends, honestly labeled. Friendship only.<br />Voices are licensed — never cloned without consent.</div>
          </div>
        )}

        {/* tab bar */}
        <div style={{ display: "flex", borderTop: `1px solid ${T.line}`, background: "rgba(15,14,23,0.82)", backdropFilter: "blur(16px)", padding: "8px 10px max(12px, env(safe-area-inset-bottom))", position: "relative", zIndex: 5, flexShrink: 0 }}>
          {[["home", "☀", "Today"], ["discover", "✨", "Discover"], ["chats", "💬", "Chats"], ["social", "🌐", "Social"], ["me", "🧭", "You"]].filter(([k]) => !(k === "discover" && allMet)).map(([k, icon, label]) => (
            <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", fontFamily: font, position: "relative", padding: "6px 0" }}>
              {tab === k && <motion.div layoutId="tab-pill" style={{ position: "absolute", inset: "0 18%", borderRadius: 100, background: T.panel2 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <div style={{ position: "relative", fontSize: 16 }}>{icon}</div>
              <div style={{ position: "relative", fontSize: 10.5, fontWeight: 700, color: tab === k ? T.text : T.sub, marginTop: 2 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* ===== MATCH SPLASH ===== */}
        <AnimatePresence>
          {splash && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(10,9,16,0.82)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 26, overflow: "hidden" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ position: "absolute", top: 0, left: `${(i * 37) % 100}%`, width: 6 + (i % 3) * 2, height: 10 + (i % 4) * 3, borderRadius: 2, background: ["#ff5e7e", "#a78bfa", "#2dd4bf", "#fbbf24", "#f5f3ff"][i % 5], animation: `rm-fall ${(4.5 + (i % 5) * 0.8).toFixed(1)}s linear ${(-((i * 0.53) % 6)).toFixed(2)}s infinite` }} />)}
              </div>
              <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 240, damping: 18 }} style={{ textAlign: "center", width: "100%" }}>
                <div style={{ color: "#c4b5fd", fontSize: 12.5, fontWeight: 700, letterSpacing: 2 }}>NEW FRIEND</div>
                <div className="rm-display" style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, color: T.text, marginTop: 6 }}>It’s a <span style={{ color: "#ff7b96" }}>match!</span></div>
                <div style={{ color: T.sub, fontSize: 13.5, marginTop: 4 }}>{splash.name} is already typing your first message…</div>
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }} style={{ display: "flex", justifyContent: "center", margin: "22px 0" }}>
                  <div style={{ position: "relative", padding: 26 }}>
                    <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px dashed rgba(167,139,250,0.55)", animation: "rm-orbit 9s linear infinite" }}><div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "#ff5e7e", top: 8, left: "50%" }} /></div>
                    <Avatar agent={splash} size={130} ring emote="celebrate" />
                  </div>
                </motion.div>
                <button onClick={() => { const a = splash; setSplash(null); setTab("chats"); openChat(a); }} style={{ width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font, boxShadow: "0 14px 34px rgba(214,54,94,0.45)" }}>Say hi to {splash.name}</button>
                <button onClick={() => setSplash(null)} style={{ width: "100%", marginTop: 10, background: "transparent", border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Keep exploring</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {chatAgent && <ChatWorkspace
          friend={chatAgent} friends={matches.map(lookup)} messages={messages} input={input}
          onInput={setInput} onSend={() => send()} onSelect={agent => { setInput(""); openChat(agent); }}
          onBack={() => { chatTokenRef.current += 1; setChatAgent(null); setIsTyping(false); }}
          onGames={() => setShowGames(true)} onResume={() => { setResumeMsg(""); setShowResume(true); }}
          onAts={() => { setAtsErr(""); setShowAts(true); }} onTailor={() => { setTailorErr(""); setShowTailor(true); }}
          hasResume={hasResume} onReveal={revealResults} canReveal={msgCount >= 6} revealing={loadingResults}
          onReport={setReportMsg} memories={chatMem} busy={isTyping} loadError={chatLoadError}
          error={chatError} saveState={saveState} panelRef={panelRef}
          onRetry={() => chatLoadError ? openChat(chatAgent) : pendingSavesRef.current[chatAgent.id] ? saveChat(pendingSavesRef.current[chatAgent.id], chatTokenRef.current) : setChatError("")}
        />}

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
                <div style={{ fontSize: 22, fontWeight: 900, color: "#ff7b96" }}>{results.personalityType}</div>
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

        {showGames && chatAgent && <GameLobby games={GAMES} friend={chatAgent} busy={isTyping || chatLoadError || saveState === "error" || saveState === "saving"} onStart={startGame} onClose={() => setShowGames(false)} />}

        {/* résumé sheet (Tony only) */}
        <AnimatePresence>
          {showResume && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !resumeBusy && setShowResume(false)} style={{ position: "absolute", inset: 0, zIndex: 46, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end" }}>
              <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 440 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#1a1626", borderRadius: "24px 24px 0 0", padding: "20px 18px 26px", border: `1px solid ${T.line}` }}>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 16, marginBottom: 3 }}>📄 Share your résumé with Tony</div>
                <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5, marginBottom: 14 }}>Paste your résumé text below — Tony reads it and grounds his career advice (ATS score, tailoring) in your real background. <span style={{ color: T.sub }}>Stays private to your chat with Tony.</span></div>

                <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={9} autoFocus placeholder="Paste your résumé here…" disabled={resumeBusy} style={{ width: "100%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13.5, padding: "12px 14px", borderRadius: 14, outline: "none", fontFamily: font, resize: "none", lineHeight: 1.5 }} />
                {resumeMsg && <div style={{ color: T.pink, fontSize: 12, fontWeight: 600, marginTop: 8 }}>{resumeMsg}</div>}
                <button onClick={() => submitResume(null, null)} disabled={resumeBusy || resumeText.trim().length < 30} style={{ width: "100%", marginTop: 12, background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14.5, padding: "13px 0", borderRadius: 100, cursor: (resumeBusy || resumeText.trim().length < 30) ? "not-allowed" : "pointer", fontFamily: font, opacity: (resumeBusy || resumeText.trim().length < 30) ? 0.5 : 1 }}>{resumeBusy ? "Reading…" : "📄 Share résumé"}</button>
                <div style={{ color: T.sub, fontSize: 11, textAlign: "center", marginTop: 9, lineHeight: 1.4 }}>Tip: open your résumé, select all (Ctrl/Cmd+A), copy, and paste it here.</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ATS analysis sheet */}
        <AnimatePresence>
          {showAts && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !atsBusy && setShowAts(false)} style={{ position: "absolute", inset: 0, zIndex: 46, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end" }}>
              <motion.div initial={{ y: 440 }} animate={{ y: 0 }} exit={{ y: 480 }} transition={{ type: "spring", stiffness: 280, damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "88%", overflowY: "auto", background: "#1a1626", borderRadius: "24px 24px 0 0", padding: "20px 18px 30px", border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ color: T.text, fontWeight: 800, fontSize: 17 }}>🎯 ATS résumé check</div>
                  <button onClick={() => setShowAts(false)} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, width: 30, height: 30, borderRadius: "50%", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ color: T.sub, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>How your résumé scores against automated applicant-tracking screeners — with specific fixes.</div>

                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input value={atsTarget} onChange={e => setAtsTarget(e.target.value)} placeholder="Target role (optional) — e.g. Product Manager" style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13, padding: "11px 14px", borderRadius: 100, outline: "none", fontFamily: font }} />
                  <button onClick={runAts} disabled={atsBusy} style={{ background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 13, padding: "0 18px", borderRadius: 100, cursor: atsBusy ? "wait" : "pointer", fontFamily: font, opacity: atsBusy ? 0.6 : 1 }}>{atsBusy ? "…" : atsReport ? "Re-run" : "Analyze"}</button>
                </div>
                {atsErr && <div style={{ color: T.pink, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>{atsErr}</div>}
                {atsBusy && <div style={{ color: T.sub, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Tony is scanning your résumé like an ATS would…</div>}

                {atsReport && !atsBusy && (<>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
                    <div style={{ width: 70, height: 70, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `conic-gradient(${atsReport.score >= 75 ? "#4ade80" : atsReport.score >= 50 ? "#f5c84b" : "#ff5e7e"} ${atsReport.score * 3.6}deg, rgba(255,255,255,0.1) 0deg)` }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1a1626", display: "flex", alignItems: "center", justifyContent: "center", color: T.text, fontWeight: 900, fontSize: 20 }}>{atsReport.score}</div>
                    </div>
                    <div><div style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>{atsReport.score >= 75 ? "ATS-ready" : atsReport.score >= 50 ? "Getting there" : "Needs work"}</div><div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.4, marginTop: 2 }}>{atsReport.verdict}</div></div>
                  </div>

                  {(atsReport.categories || []).map((c, i) => { const col = c.status === "good" ? "#4ade80" : c.status === "warn" ? "#f5c84b" : "#ff5e7e"; return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                      <div style={{ color: col, fontSize: 14, flexShrink: 0 }}>{c.status === "good" ? "✓" : c.status === "warn" ? "•" : "✕"}</div>
                      <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.text, fontSize: 13, fontWeight: 700 }}>{c.name}</span>{c.max ? <span style={{ color: col, fontSize: 12, fontWeight: 700 }}>{c.score}/{c.max}</span> : null}</div><div style={{ color: T.sub, fontSize: 12, lineHeight: 1.45, marginTop: 1 }}>{c.note}</div></div>
                    </div>
                  ); })}

                  {(atsReport.missingKeywords || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 7 }}>Add these keywords</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{atsReport.missingKeywords.map((k, i) => <span key={i} style={{ background: `${T.violet}22`, border: `1px solid ${T.line}`, color: T.violet, fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>+ {k}</span>)}</div>
                    </div>
                  )}

                  {(atsReport.fixes || []).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Fixes to raise your score</div>
                      {atsReport.fixes.map((f, i) => { const pc = f.priority === "high" ? "#ff5e7e" : f.priority === "med" ? "#f5c84b" : "#9b97b0"; return (
                        <div key={i} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: "11px 13px", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}><span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.5, color: "#1a1626", background: pc, padding: "2px 6px", borderRadius: 5, textTransform: "uppercase" }}>{f.priority}</span><span style={{ color: T.text, fontSize: 12.5, fontWeight: 700 }}>{f.issue}</span></div>
                          <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5 }}>{f.fix}</div>
                        </div>
                      ); })}
                    </div>
                  )}

                  {(atsReport.rewrites || []).length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Bullet rewrites</div>
                      {atsReport.rewrites.map((rw, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ color: T.sub, fontSize: 12, lineHeight: 1.45, textDecoration: "line-through", opacity: 0.7 }}>{rw.before}</div>
                          <div style={{ color: "#4ade80", fontSize: 12.5, lineHeight: 1.5, marginTop: 3 }}>→ {rw.after}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>)}

                {!atsReport && !atsBusy && !atsErr && (
                  <div style={{ color: T.sub, fontSize: 13, textAlign: "center", padding: "16px 10px", lineHeight: 1.5 }}>Add a target role (optional) and tap <b style={{ color: T.text }}>Analyze</b> to get your ATS score and fixes.</div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* tailor-to-a-job sheet */}
        <AnimatePresence>
          {showTailor && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !tailorBusy && setShowTailor(false)} style={{ position: "absolute", inset: 0, zIndex: 46, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end" }}>
              <motion.div initial={{ y: 440 }} animate={{ y: 0 }} exit={{ y: 480 }} transition={{ type: "spring", stiffness: 280, damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "90%", overflowY: "auto", background: "#1a1626", borderRadius: "24px 24px 0 0", padding: "20px 18px 30px", border: `1px solid ${T.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ color: T.text, fontWeight: 800, fontSize: 17 }}>✍️ Tailor to a job</div>
                  <button onClick={() => setShowTailor(false)} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, width: 30, height: 30, borderRadius: "50%", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ color: T.sub, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>Paste a job posting — Tony rewrites your résumé to match it and pass ATS. <span style={{ color: T.text }}>It only reframes your real experience — never invents anything.</span></div>

                <textarea value={tailorJD} onChange={e => setTailorJD(e.target.value)} rows={5} placeholder="Paste the full job description here…" disabled={tailorBusy} style={{ width: "100%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13, padding: "12px 14px", borderRadius: 14, outline: "none", fontFamily: font, resize: "none", lineHeight: 1.5, marginBottom: 10 }} />
                <button onClick={runTailor} disabled={tailorBusy} style={{ width: "100%", background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14, padding: "13px 0", borderRadius: 100, cursor: tailorBusy ? "wait" : "pointer", fontFamily: font, opacity: tailorBusy ? 0.6 : 1 }}>{tailorBusy ? "Tailoring…" : tailorReport ? "Re-tailor" : "✨ Tailor my résumé"}</button>
                {tailorErr && <div style={{ color: T.pink, fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>{tailorErr}</div>}
                {tailorBusy && <div style={{ color: T.sub, fontSize: 13, textAlign: "center", padding: "18px 0" }}>Tony is rewriting your résumé for this role…</div>}

                {tailorReport && !tailorBusy && (<>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "16px 0 14px" }}>
                    <div style={{ textAlign: "center" }}><div style={{ color: T.sub, fontWeight: 900, fontSize: 22 }}>{tailorReport.matchBefore}%</div><div style={{ color: T.sub, fontSize: 10 }}>BEFORE</div></div>
                    <div style={{ color: T.violet, fontSize: 20 }}>→</div>
                    <div style={{ textAlign: "center" }}><div style={{ color: "#4ade80", fontWeight: 900, fontSize: 26 }}>{tailorReport.matchAfter}%</div><div style={{ color: T.sub, fontSize: 10 }}>AFTER</div></div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ color: T.text, fontWeight: 800, fontSize: 13 }}>Your tailored résumé</div>
                    <button onClick={() => { navigator.clipboard?.writeText(tailorReport.tailored || ""); setTailorCopied(true); setTimeout(() => setTailorCopied(false), 2000); }} style={{ background: tailorCopied ? "#4ade80" : T.panel2, border: `1px solid ${T.line}`, color: tailorCopied ? "#1a1626" : T.text, fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{tailorCopied ? "✓ Copied" : "📋 Copy"}</button>
                  </div>
                  <div style={{ background: "#0c0b15", border: `1px solid ${T.line}`, borderRadius: 14, padding: "13px 14px", maxHeight: 280, overflowY: "auto", color: "#dcd7ec", fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'SFMono-Regular',Consolas,Menlo,monospace" }}>{tailorReport.tailored}</div>

                  {(tailorReport.keywordsAdded || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 7 }}>Keywords woven in</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{tailorReport.keywordsAdded.map((k, i) => <span key={i} style={{ background: "rgba(74,222,128,0.12)", border: `1px solid rgba(74,222,128,0.3)`, color: "#4ade80", fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>✓ {k}</span>)}</div>
                    </div>
                  )}
                  {(tailorReport.changes || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ color: T.text, fontWeight: 800, fontSize: 13, marginBottom: 7 }}>What Tony changed</div>
                      {tailorReport.changes.map((c, i) => <div key={i} style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.5, marginBottom: 5, paddingLeft: 14, position: "relative" }}><span style={{ position: "absolute", left: 0, color: T.violet }}>•</span>{c}</div>)}
                    </div>
                  )}
                  <div style={{ color: T.sub, fontSize: 10.5, textAlign: "center", marginTop: 14, lineHeight: 1.4 }}>Always proofread before sending — and make sure every line is true to your real experience.</div>
                </>)}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* twin voice recorder */}
        {showLookEditor && myTwin && <TwinLookEditor key={userId} userId={userId} twin={myTwin} onClose={() => setShowLookEditor(false)} onSaved={avatar => {
          setMyTwin(previous => ({ ...previous, avatar }));
          setTwinMap(previous => ({ ...previous, [myTwin.id]: { ...myTwin, avatar } }));
          setTwins(previous => previous.map(twin => twin.id === myTwin.id ? { ...twin, avatar } : twin));
          setChatAgent(previous => previous?.id === myTwin.id ? { ...previous, avatar } : previous);
          setLookSaved(true);
        }} />}
        {showVoiceRec && myTwin && (
          <TwinVoiceRecorder userId={userId} userName={userName} cloned={!!myTwin.voiceCloned} onClose={() => setShowVoiceRec(false)} onDone={refreshMyTwin} />
        )}
      </div>
      {boardGame && <GameBoard game={boardGame} agent={chatAgent} onClose={() => setBoardGame(null)} />}
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

