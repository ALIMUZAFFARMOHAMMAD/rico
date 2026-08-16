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
import SocialFeed from "../components/SocialFeed";
import { captureSource, getSource } from "../lib/source";
import { CONSENT_VERSION } from "../lib/consent";
import Onboarding from "../components/Onboarding";
import Intro from "../components/Intro";

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

// Downscale + re-encode any photo (incl. iPhone HEIC) to a small JPEG so it's
// under the upload limit and in a format the vision model can read.
function resizeImage(file, max = 768, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;
    // Some browsers (Android/in-app webviews) can't decode HEIC and fire NEITHER
    // onload nor onerror — the promise would hang forever. Guard with a timeout.
    const finish = (fn, arg) => {
      if (settled) return; settled = true;
      clearTimeout(timer);
      try { URL.revokeObjectURL(url); } catch (e) {}
      fn(arg);
    };
    const timer = setTimeout(() => finish(reject, new Error("timeout")), 12000);
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) return finish(reject, new Error("empty"));
      const scale = Math.min(1, max / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      try { finish(resolve, canvas.toDataURL("image/jpeg", quality)); } catch (e) { finish(reject, e); }
    };
    img.onerror = () => finish(reject, new Error("decode"));
    img.src = url;
  });
}

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
          <TonyCharacter size={235} look={agent.look || {}} float="none" animated={false} pose="down" expr="😊" emote={topCard ? em : "none"} />
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
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState("");
  const photoInputRef = useRef(null);
  async function onPhotoPicked(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setAvatarBusy(true); setAvatarErr("");
    const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || "");
    try {
      // iPhone HEIC/HEIF can't be decoded by <img> — convert to JPEG in-browser first.
      let src = file;
      if (heic) {
        try {
          const heic2any = (await import("heic2any")).default;
          const conv = heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          const out = await Promise.race([conv, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000))]);
          src = Array.isArray(out) ? out[0] : out;
        } catch (err) {
          setAvatarErr("Couldn't convert that iPhone photo — try a JPG or a screenshot.");
          return;
        }
      }
      let dataUrl;
      try { dataUrl = await resizeImage(src); }
      catch (err) {
        setAvatarErr(err?.message === "timeout"
          ? "That photo couldn't be read — try a JPG/PNG or a screenshot."
          : "Couldn't read that image — try a clear JPG or PNG selfie.");
        return;
      }
      // Guard the upload too, so a stalled request can never spin forever.
      const ctrl = new AbortController();
      const killer = setTimeout(() => ctrl.abort(), 45000);
      try {
        const r = await fetch("/api/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, image: dataUrl, mime: "image/jpeg" }), signal: ctrl.signal });
        const d = await r.json();
        if (d.look) { await refreshMyTwin(); } else setAvatarErr(d.error || "Couldn't read that photo — try a clearer one.");
      } catch (err) {
        setAvatarErr(err?.name === "AbortError" ? "That took too long — check your connection and try again." : "Upload failed — try again.");
      } finally { clearTimeout(killer); }
    } finally { setAvatarBusy(false); }
  }
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
  const [lastDir, setLastDir] = useState("left");
  const [chatEmote, setChatEmote] = useState("none");
  const [introPlayed, setIntroPlayed] = useState(false);
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

  // first-touch attribution (also runs for visitors who land directly on the app)
  useEffect(() => { captureSource(); }, []);

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
  const reactTo = useCallback((expr) => {
    const e = ["😄", "😆", "🎉", "😁"].includes(expr) ? "laugh"
      : ["🤍", "❤️", "💙", "🥰"].includes(expr) ? "dance"
      : ["💡", "🤝", "👍", "✨"].includes(expr) ? "nod"
      : ["😳", "🙈", "😅"].includes(expr) ? "shy"
      : "none";
    if (e !== "none") { setChatEmote(e); setTimeout(() => setChatEmote("none"), 2800); }
  }, []);
  const visibleDeck = deck.filter(a => !passed.includes(a.id));
  const card = visibleDeck[0];
  const cardNext = visibleDeck[1];
  useEffect(() => { if (visibleDeck.length === 0 && passed.length > 0) setPassed([]); }, [visibleDeck.length, passed.length]);

  function decideCard(dir) {
    if (!card) return;
    setLastDir(dir);
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
        const { text } = parse(d.raw || d.text);
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

  async function send(textArg) {
    const msg = (typeof textArg === "string" ? textArg : input).trim();
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
      if (data?.expr) reactTo(data.expr);
      cacheLast(chatAgent.id, text);
      const fh = [...nh, { role: "assistant", content: d.raw || d.text }];
      setHistory(fh); histRef.current = fh;
      const nt = data ? { O: data.O, C: data.C, E: data.E, A: data.A, N: data.N } : traits;
      if (data) { setTraits(nt); if (data.riasec) setRiasec(data.riasec); }
      const nc = msgCount + 2; setMsgCount(nc);
      if (isSignedIn) fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agent: chatAgent.id, messages: fh, traits: nt, riasec: data?.riasec || riasec, msgCount: nc }) }).catch(() => {});
      // Activation (North Star leading indicator): first real conversation = 6+ messages. Fire once.
      if (isSignedIn && userId && nc >= 6) {
        try {
          const ak = `rico_act_${userId}`;
          if (!localStorage.getItem(ak)) {
            localStorage.setItem(ak, "1");
            fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, event: "activation" }) }).catch(() => {});
          }
        } catch (e) {}
      }
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
      if (d.twin) setMyTwin(d.twin);
      else { setTwinError(d.error || "Failed"); if (typeof d.progress === "number") setTwinReady({ ready: false, progress: d.progress, have: d.have, need: d.need }); }
    } catch (e) { setTwinError("Failed — try again"); }
    setTwinBusy(false);
  }

  const tier = msgCount >= 40 ? "Close friend" : msgCount >= 10 ? "Friend" : "New friend";

  if (!isLoaded) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <Head><title>rico</title></Head>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo /></motion.div>
    </div>
  );

  // Logged-out visitors are redirected to the public marketing page (/landing) by the
  // effect above — render a minimal brand loader while that redirect happens.
  if (!isSignedIn) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <Head><title>rico — your people, always</title></Head>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo /></motion.div>
    </div>
  );

  // Brand intro plays first thing after sign-in (also covers data loading).
  if (isSignedIn && !introPlayed) return (<><Head><title>rico</title></Head><Intro onDone={() => setIntroPlayed(true)} /></>);

  if (!ready) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: font }}>
      <Head><title>rico</title></Head>
      <TonyCharacter size={150} look={{ hoodie: "#8b5cf6", hoodieD: "#7146d1" }} float="none" animated={false} emote="shuffle" />
      <div style={{ color: T.sub, fontSize: 12.5, fontWeight: 500 }}>Rico is shuffling the deck for you…</div>
    </div>
  );

  return (<>
    <Head>
      <title>rico — your people, always</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <meta name="theme-color" content="#0f0e17" />    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <Aurora />
      {needsConsent && isSignedIn && <ConsentGate userId={userId} onAccept={() => setNeedsConsent(false)} />}
      {!needsConsent && needsTour && isSignedIn && <Onboarding onDone={finishTour} />}
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
                {card && <SwipeCard key={card.id} agent={card} topCard={true} onDecide={decideCard} exitDir={lastDir} />}
              </AnimatePresence>
              {!card && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
                  <TonyCharacter size={150} look={{ hoodie: "#ff5e7e", hoodieD: "#d94768" }} float="none" animated={false} emote="walk" />
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>You've met everyone (for now)</div>
                  <div style={{ color: T.sub, fontSize: 13, maxWidth: 260 }}>Rico is off finding new friends — they'll show up soon. Go talk to yours!</div>
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
            <div style={{ display: "flex", gap: 9, margin: "6px 0 14px" }}>
              <a href="/groups" style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, textDecoration: "none", background: `linear-gradient(140deg,${T.violet}22,${T.pink}14)`, border: `1px solid ${T.line}`, borderRadius: 16, padding: "12px 13px" }}>
                <span style={{ fontSize: 20 }}>👥</span>
                <span><span style={{ display: "block", color: T.text, fontWeight: 700, fontSize: 13 }}>Group chat</span><span style={{ color: T.sub, fontSize: 10.5 }}>Friends in one room</span></span>
              </a>
              <a href="/classroom" style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, textDecoration: "none", background: `linear-gradient(140deg,${T.pink}1c,${T.violet}22)`, border: `1px solid ${T.line}`, borderRadius: 16, padding: "12px 13px" }}>
                <span style={{ fontSize: 20 }}>🎓</span>
                <span><span style={{ display: "block", color: T.text, fontWeight: 700, fontSize: 13 }}>AI Tutor</span><span style={{ color: T.sub, fontSize: 10.5 }}>Teach a friend</span></span>
              </a>
            </div>
            <a href="/translate" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", background: `linear-gradient(140deg,${T.teal || "#2dd4bf"}1e,${T.violet}1e)`, border: `1px solid ${T.line}`, borderRadius: 16, padding: "12px 13px", marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>🌐</span>
              <span style={{ flex: 1 }}><span style={{ display: "block", color: T.text, fontWeight: 700, fontSize: 13 }}>Live Translate</span><span style={{ color: T.sub, fontSize: 10.5 }}>Real-time interpreter — talk to anyone in another language</span></span>
              <span style={{ color: T.sub, fontSize: 16 }}>→</span>
            </a>
            {isSignedIn && userId && (
              <ProactiveCheckin
                userId={userId}
                lang={langRef.current}
                T={T}
                font={font}
                onOpen={(id) => { const a = lookup(id); if (a) openChat(a); }}
              />
            )}
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

        {/* ===== SOCIAL — unified cross-club feed ===== */}
        {tab === "social" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 0", display: "flex", flexDirection: "column" }}>
            {isSignedIn && userId ? (
              <SocialFeed userId={userId} userName={userName} lang={langRef.current} T={T} font={font} />
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
              {myTwin ? (<>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                  <Avatar agent={myTwin} size={48} ring />
                  <div>
                    <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{myTwin.name} <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>· live in the deck</span></div>
                    <div style={{ color: T.sub, fontSize: 12 }}>{myTwin.bio || myTwin.tagline}</div>
                  </div>
                </div>
                <button onClick={() => setShowVoiceRec(true)} style={{ width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", background: myTwin.voiceCloned ? `linear-gradient(135deg,${T.violet}33,${T.pink}22)` : T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13, padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontFamily: font }}>
                  <span>🎙 Twin's voice</span>
                  <span style={{ color: myTwin.voiceCloned ? "#4ade80" : T.sub, fontSize: 12.5, fontWeight: 700 }}>{myTwin.voiceCloned ? "Your real voice ✓" : "Clone my voice →"}</span>
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoPicked} style={{ display: "none" }} />
                <button onClick={() => photoInputRef.current?.click()} disabled={avatarBusy} style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13, padding: "11px 14px", borderRadius: 14, cursor: "pointer", fontFamily: font }}>
                  <span>📸 Twin's look</span>
                  <span style={{ color: T.sub, fontSize: 12.5, fontWeight: 700 }}>{avatarBusy ? "Reading your photo…" : "Make it from my photo →"}</span>
                </button>
                {avatarErr && <div style={{ color: T.pink, fontSize: 11.5, fontWeight: 600, marginTop: 6 }}>{avatarErr}</div>}
                <div style={{ color: T.sub, fontSize: 10.5, marginTop: 6, lineHeight: 1.45 }}>Your photo is read once to design a cartoon avatar that looks like you — it's never stored.</div>
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
              ["📖", "How Rico works", <button key="hr" onClick={() => setNeedsTour(true)} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Take the tour →</button>],
              ["📄", "Terms & Privacy", <span key="tp" style={{ fontSize: 13.5 }}><a href="/terms" style={{ color: T.sub, textDecoration: "none" }}>Terms</a> <span style={{ color: T.line }}>·</span> <a href="/privacy" style={{ color: T.sub, textDecoration: "none" }}>Privacy</a></span>],
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
        <div style={{ display: "flex", borderTop: `1px solid ${T.line}`, background: "rgba(15,14,23,0.82)", backdropFilter: "blur(16px)", padding: "8px 10px 12px", position: "relative", zIndex: 5 }}>
          {[["discover", "✨", "Discover"], ["chats", "💬", "Chats"], ["social", "🌐", "Social"], ["me", "🧭", "You"]].map(([k, icon, label]) => (
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
                <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>New friend! 🎉</div>
                <div style={{ color: T.sub, fontSize: 13.5, marginTop: 4 }}>{splash.name} is already typing your first message…</div>
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }} style={{ display: "flex", justifyContent: "center", margin: "22px 0" }}>
                  <Avatar agent={splash} size={130} ring emote="celebrate" />
                </motion.div>
                <button onClick={() => { const a = splash; setSplash(null); setTab("chats"); openChat(a); }} style={{ width: "100%", background: T.grad, border: "none", color: "white", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Say hi</button>
                <button onClick={() => setSplash(null)} style={{ width: "100%", marginTop: 10, background: "transparent", border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Keep exploring</button>
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
                  <Avatar agent={chatAgent} size={40} ring emote={chatEmote} />
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
                {/* career tools — discover résumé / ATS / tailor without hunting */}
                {chatAgent.id === "tony" && (
                  <div style={{ display: "flex", gap: 7, padding: "0 14px 4px", overflowX: "auto", alignItems: "center" }}>
                    <span style={{ color: T.sub, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>🧰 Career tools:</span>
                    {!hasResume
                      ? <button onClick={() => { setResumeMsg(""); setShowResume(true); }} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 11.5, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font, flexShrink: 0, whiteSpace: "nowrap" }}>📄 Share résumé → ATS &amp; tailoring</button>
                      : <>
                          <button onClick={() => { setAtsErr(""); setShowAts(true); }} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 11.5, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font, flexShrink: 0, whiteSpace: "nowrap" }}>🎯 ATS score</button>
                          <button onClick={() => { setTailorErr(""); setShowTailor(true); }} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 11.5, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font, flexShrink: 0, whiteSpace: "nowrap" }}>✍️ Tailor to a job</button>
                          <button onClick={() => { setResumeMsg(""); setShowResume(true); }} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.sub, fontWeight: 700, fontSize: 11.5, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font, flexShrink: 0, whiteSpace: "nowrap" }}>📄 Update</button>
                        </>}
                  </div>
                )}
                {/* input */}
                <div style={{ padding: "10px 14px 14px", display: "flex", gap: 9, alignItems: "center", background: "rgba(15,14,23,0.8)", backdropFilter: "blur(14px)", borderTop: `1px solid ${T.line}` }}>
                  {chatAgent.id === "tony" && <button onClick={() => { setResumeMsg(""); setShowResume(true); }} disabled={isTyping} aria-label="Share your résumé" title="Share your résumé with Tony" style={{ width: 46, height: 46, borderRadius: "50%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 17, cursor: "pointer", flexShrink: 0 }}>📄</button>}
                  <button onClick={() => setShowGames(true)} disabled={isTyping} aria-label="Play a game" title="Play a game" style={{ width: 46, height: 46, borderRadius: "50%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>🎮</button>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
                    placeholder={`Message ${chatAgent.name}…`}
                    style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 100, padding: "13px 18px", color: T.text, fontSize: 14, outline: "none", fontFamily: font }} />
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => send()} disabled={isTyping} style={{ width: 46, height: 46, borderRadius: "50%", background: T.grad, border: "none", color: "white", fontSize: 17, cursor: "pointer", flexShrink: 0 }}>↑</motion.button>
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

        {/* games picker */}
        <AnimatePresence>
          {showGames && chatAgent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGames(false)} style={{ position: "absolute", inset: 0, zIndex: 45, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end" }}>
              <motion.div initial={{ y: 360 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#1a1626", borderRadius: "24px 24px 0 0", padding: "20px 18px 26px", border: `1px solid ${T.line}` }}>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 16, marginBottom: 2 }}>🎮 Play a game with {chatAgent.name}</div>
                <div style={{ color: T.sub, fontSize: 12.5, marginBottom: 14 }}>Pick one — or just ask {chatAgent.name} for any game you like.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  {GAMES.map(g => (
                    <button key={g.key} onClick={() => startGame(g)} style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 600, fontSize: 13, padding: "12px 13px", borderRadius: 14, cursor: "pointer", fontFamily: font }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{g.icon}</span><span style={{ flex: 1 }}>{g.label}</span>{g.board && <span style={{ fontSize: 8.5, color: T.violet, fontWeight: 700, border: `1px solid ${T.line}`, borderRadius: 5, padding: "2px 4px" }}>BOARD</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
