// AI Tutor / Classroom — ROLE REVERSAL: YOU teach, AI characters are your students.
// Courses: enroll multiple students, teach them, run "Combined Studies" (they study
// together), set weekly exams, and graduate them with a certificate.
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useUser } from "@clerk/nextjs";
import { AGENT_LIST, getAgent } from "../lib/agents";
import TonyCharacter from "../components/TonyCharacter";
import Certificate from "../components/Certificate";
import Whiteboard from "../components/Whiteboard";
import { getStoredPref, getDetectedLang } from "../lib/i18n";

// strip heavy base64 (whiteboard images) before sending/persisting message history
const strip = (arr) => (arr || []).map(({ image, ...m }) => m);
// guess a coding language from the subject so we can deep-link the playground
const CODE_LANGS = [["python", "🐍 Python", /python|pandas|numpy|django|flask|pytorch/], ["javascript", "🟨 JavaScript", /javascript|\bjs\b|react|node|typescript|\bts\b/], ["java", "☕ Java", /\bjava\b/], ["cpp", "➕ C++", /c\+\+|cpp/], ["c", "🔵 C", /\bc lang|\bc programming|\bin c\b/], ["csharp", "🟦 C#", /c#|csharp|\.net/], ["go", "🐹 Go", /\bgo\b|golang/], ["rust", "🦀 Rust", /\brust\b/], ["ruby", "💎 Ruby", /\bruby\b|rails/], ["php", "🐘 PHP", /\bphp\b/], ["mysql", "🗄 SQL", /\bsql\b|database|query/], ["html", "🌐 HTML/CSS", /html|css|web ?dev|frontend/]];
const guessLang = (subj) => { const s = (subj || "").toLowerCase(); const hit = CODE_LANGS.find(([, , re]) => re.test(s)); return hit ? hit[0] : null; };
const playgroundUrl = (lang) => `https://onecompiler.com/${lang || ""}`;

const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.06)", panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6", green: "#4ade80", gold: "#f5c84b" };
const font = "'Inter',system-ui,-apple-system,sans-serif";
const DURATIONS = [1, 2, 4, 6, 8];
const GRAD = 85;

function Ring({ value, size = 52 }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c * (1 - (value || 0) / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={value >= 70 ? T.green : value >= 35 ? T.violet : T.pink} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" style={{ transform: "rotate(90deg)", transformOrigin: "center", fill: T.text, fontSize: 13, fontWeight: 800, fontFamily: font }}>{Math.round(value || 0)}</text>
    </svg>
  );
}
const chip = (disabled) => ({ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: disabled ? "#6b6880" : "#cfc9e6", fontWeight: 700, fontSize: 12, padding: "8px 12px", borderRadius: 100, cursor: disabled ? "not-allowed" : "pointer", fontFamily: font });

export default function Classroom() {
  const { user, isLoaded, isSignedIn } = useUser();
  useEffect(() => { if (isLoaded && !isSignedIn) window.location.href = "/"; }, [isLoaded, isSignedIn]);
  const userId = user?.id || null;
  const userName = user?.firstName || user?.fullName?.split(" ")[0] || "";

  const [step, setStep] = useState("setup"); // setup | course
  const [subject, setSubject] = useState("");
  const [picked, setPicked] = useState([]); // student ids
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [resources, setResources] = useState("");
  const [course, setCourse] = useState(null); // {subject, students, durationWeeks, resources, concepts, lessons, exams, studentStats}
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle|thinking|speaking|listening|studying|examining
  const [lists, setLists] = useState({ courses: [], legacy: [] });
  const [share, setShare] = useState(null);
  const [exam, setExam] = useState(null);
  const [cert, setCert] = useState(null);
  const [showRes, setShowRes] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [codeLang, setCodeLang] = useState("python");
  const [err, setErr] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);

  const langRef = useRef("en");
  const voiceRef = useRef(false);
  const recRef = useRef(null);
  const audioRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => { const p = getStoredPref(); langRef.current = p === "auto" ? (getDetectedLang() || "en") : p; }, []);
  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight; }, [messages, phase]);
  useEffect(() => () => { try { recRef.current?.stop(); } catch (e) {} window.speechSynthesis?.cancel(); if (audioRef.current) audioRef.current.pause(); }, []);

  const refreshLists = useCallback(() => {
    if (!userId) return;
    fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "list", userId }) })
      .then(r => r.json()).then(d => setLists({ courses: d.courses || [], legacy: d.legacy || [] })).catch(() => {});
  }, [userId]);
  useEffect(() => { refreshLists(); }, [refreshLists]);

  const api = (body) => fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, teacher: userName, language: langRef.current, ...body }) }).then(r => r.json());

  const members = (course?.students || []).map(getAgent);
  const avgMastery = course ? Math.round(Object.values(course.studentStats || {}).reduce((s, v) => s + (v?.mastery || 0), 0) / Math.max(1, course.students.length)) : 0;
  const examsDone = course?.exams?.length || 0;
  const eligibleGrads = course ? course.students.filter(id => (course.studentStats[id]?.mastery || 0) >= GRAD && !course.studentStats[id]?.graduated) : [];

  const speak = useCallback(async (text, agentId) => {
    window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: langRef.current, agentId }) });
      if (r.ok) { const url = URL.createObjectURL(await r.blob()); const a = new Audio(url); audioRef.current = a;
        await new Promise(res => { a.onended = res; a.onerror = res; a.play().catch(res); setTimeout(res, text.length * 92 + 3200); }); URL.revokeObjectURL(url); audioRef.current = null; return; }
    } catch (e) {}
    await new Promise(res => { const u = new SpeechSynthesisUtterance(text); u.rate = 0.96; u.onend = res; u.onerror = res; window.speechSynthesis.speak(u); setTimeout(res, text.length * 80 + 2200); });
  }, []);

  // ---- start / resume a course ----
  const startCourse = async (subj, ids, dur, res, resume) => {
    if (!ids.length || !subj.trim()) return;
    setBusy(true); setErr("");
    try {
      const d = await api({ mode: "course_create", subject: subj.trim(), students: ids, durationWeeks: dur, resources: res });
      if (d.course) {
        setCourse(d.course); setSubject(d.course.subject); setResources(d.course.resources || "");
        setMessages(d.course.messages || []); setStep("course"); setPhase("idle");
      } else setErr("Couldn't open the course.");
    } catch (e) { setErr("Couldn't open the course."); }
    setBusy(false);
  };

  // ---- teach the class ----
  const teach = useCallback(async (text) => {
    const t = (text || "").trim(); if (!t || busy || !course) return;
    setErr(""); const next = [...messages, { role: "teacher", text: t }];
    setMessages(next); setInput(""); setBusy(true); setPhase("thinking");
    try {
      const d = await api({ mode: "teach", subject: course.subject, students: course.students, messages: strip(next) });
      if (d.replies) {
        setMessages(m => [...m, ...d.replies.map(r => ({ role: "student", from: r.from, text: r.text }))]);
        setCourse(c => ({ ...c, studentStats: d.studentStats || c.studentStats, concepts: d.concepts || c.concepts, lessons: d.lessons ?? c.lessons }));
        if (voiceRef.current) { setPhase("speaking"); for (const r of d.replies) await speak(r.text, r.from); }
      } else setErr("Lesson didn't go through — try again.");
    } catch (e) { setErr("Connection hiccup — try again."); }
    setBusy(false); setPhase("idle");
    if (voiceRef.current) setTimeout(() => listenRef.current?.(), 350);
  }, [messages, busy, course, speak]); // eslint-disable-line

  // teach by whiteboard sketch (sent to the vision model so the student "sees" it)
  const teachImage = useCallback(async (dataUrl) => {
    if (busy || !course) return; setShowBoard(false); setErr("");
    const next = [...messages, { role: "teacher", text: "🖊 Whiteboard sketch", image: dataUrl }];
    setMessages(next); setBusy(true); setPhase("thinking");
    try {
      const d = await api({ mode: "teach", subject: course.subject, students: course.students, messages: strip(next), image: dataUrl });
      if (d.replies) {
        setMessages(m => [...m, ...d.replies.map(r => ({ role: "student", from: r.from, text: r.text }))]);
        setCourse(c => ({ ...c, studentStats: d.studentStats || c.studentStats, concepts: d.concepts || c.concepts, lessons: d.lessons ?? c.lessons }));
        if (voiceRef.current) { setPhase("speaking"); for (const r of d.replies) await speak(r.text, r.from); }
      } else setErr("The sketch didn't go through — try again.");
    } catch (e) { setErr("Connection hiccup — try again."); }
    setBusy(false); setPhase("idle");
  }, [messages, busy, course, speak]); // eslint-disable-line

  // teach a code snippet to the class
  const teachCode = () => { const code = codeText.trim(); if (!code) return; setShowCode(false); setCodeText("");
    teach("Here's some code for you to learn — read it carefully:\n```" + codeLang + "\n" + code + "\n```"); };

  // ---- combined studies (students study together) ----
  const studyHall = async () => {
    if (busy || !course) return; setBusy(true); setErr(""); setPhase("studying");
    const doubt = input.trim();
    const next = doubt ? [...messages, { role: "teacher", text: doubt }] : messages;
    if (doubt) { setMessages(next); setInput(""); }
    try {
      const d = await api({ mode: "study", subject: course.subject, students: course.students, messages: strip(next), doubt });
      if (d.replies?.length) {
        for (const r of d.replies) {
          setMessages(m => [...m, { role: "student", from: r.from, text: r.text, study: true }]);
          if (voiceRef.current) { setPhase("speaking"); await speak(r.text, r.from); }
          else await new Promise(rs => setTimeout(rs, 650));
        }
        if (d.studentStats) setCourse(c => ({ ...c, studentStats: d.studentStats }));
      }
    } catch (e) { setErr("Study session glitched — try again."); }
    setBusy(false); setPhase("idle");
  };

  // ---- weekly exam ----
  const runExam = async () => {
    if (busy || !course) return; setBusy(true); setErr(""); setPhase("examining");
    try {
      const d = await api({ mode: "exam", subject: course.subject, students: course.students, week: examsDone + 1 });
      if (d.results?.length) {
        setExam({ week: d.week, questions: d.questions || [], results: d.results });
        setCourse(c => ({ ...c, studentStats: d.studentStats || c.studentStats, exams: [...(c.exams || []), { week: d.week, results: d.results, avg: Math.round(d.results.reduce((s, r) => s + r.score, 0) / Math.max(1, d.results.length)) }] }));
        const avg = Math.round(d.results.reduce((s, r) => s + r.score, 0) / Math.max(1, d.results.length));
        setMessages(m => [...m, { role: "system", text: `📝 Week ${d.week} exam — class average ${avg}%` }]);
      } else setErr("Exam couldn't be set — try again.");
    } catch (e) { setErr("Exam couldn't be set — try again."); }
    setBusy(false); setPhase("idle");
  };

  const recap = async () => { if (busy || !course) return; setBusy(true); setPhase("thinking");
    try { const d = await api({ mode: "recap", subject: course.subject, students: course.students });
      if (d.replies?.[0]) { setMessages(m => [...m, { role: "student", from: d.replies[0].from, text: d.replies[0].text }]); if (voiceRef.current) { setPhase("speaking"); await speak(d.replies[0].text, d.replies[0].from); } }
    } catch (e) {} setBusy(false); setPhase("idle"); };

  const makeGuide = async () => { if (busy || !course) return; setBusy(true);
    try { const d = await api({ mode: "share", subject: course.subject, students: course.students }); setShare({ title: d.title || course.subject, guide: d.guide || "" }); } catch (e) { setErr("Couldn't build the guide."); } setBusy(false); };

  const graduate = async (agentId) => { setBusy(true);
    try { const d = await api({ mode: "certify", subject: course.subject, students: [agentId] });
      if (d.ok && d.cert) { setCert(d.cert); setCourse(c => ({ ...c, studentStats: { ...c.studentStats, [agentId]: { ...(c.studentStats[agentId] || {}), graduated: true } } })); }
      else setErr(`${getAgent(agentId).name} needs ${d.needed || GRAD}% mastery to graduate (now ${d.mastery || 0}%). Keep teaching!`);
    } catch (e) {} setBusy(false); };

  const saveResources = async () => { if (!course) return; setShowRes(false);
    try { await api({ mode: "course_create", subject: course.subject, students: course.students, durationWeeks: course.durationWeeks, resources }); setCourse(c => ({ ...c, resources })); } catch (e) {} };

  // ---- voice teaching ----
  const listen = useCallback(() => {
    if (!voiceRef.current) return;
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setErr("Voice teaching needs Chrome or Edge — you can still type."); setVoiceOn(false); voiceRef.current = false; return; }
    const rec = new SR(); rec.continuous = false; rec.interimResults = true; rec.lang = langRef.current === "ar" ? "ar-SA" : "en-US";
    let final = "";
    rec.onresult = e => { final = Array.from(e.results).map(r => r[0].transcript).join(""); setInput(final); };
    rec.onend = () => { setPhase("idle"); if (final.trim()) teach(final); };
    recRef.current = rec; try { rec.start(); setPhase("listening"); } catch (e) {}
  }, [teach]);
  const listenRef = useRef(listen); useEffect(() => { listenRef.current = listen; }, [listen]);
  const toggleVoice = () => { const v = !voiceRef.current; voiceRef.current = v; setVoiceOn(v);
    if (v) listen(); else { try { recRef.current?.stop(); } catch (e) {} window.speechSynthesis?.cancel(); if (audioRef.current) audioRef.current.pause(); setPhase("idle"); } };

  const exit = () => { window.speechSynthesis?.cancel(); if (audioRef.current) audioRef.current.pause(); try { recRef.current?.stop(); } catch (e) {} voiceRef.current = false;
    setStep("setup"); setCourse(null); setMessages([]); setSubject(""); setPicked([]); setResources(""); setVoiceOn(false); setPhase("idle"); refreshLists(); };

  const togglePick = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 4 ? [...p, id] : p);
  const phaseLabel = { idle: "", thinking: "Your student is thinking…", speaking: "Speaking…", listening: "🎙 Listening — teach away…", studying: "📚 The class is studying together…", examining: "📝 Setting & grading the exam…" }[phase];

  return (<>
    <Head>
      <title>AI Tutor — teach a class · rico</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
      <meta name="theme-color" content="#0f0e17" />    </Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 460, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>

        {step === "setup" ? (
          /* ===================== SETUP ===================== */
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 20 }}>←</a>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 20 }}>🎓 AI Tutor</div>
            </div>
            <div style={{ color: T.sub, fontSize: 13.5, lineHeight: 1.5, margin: "8px 0 18px" }}>
              <b style={{ color: T.text }}>You're the teacher.</b> Enroll a class of friends, teach them a subject, let them study together, set exams, and graduate them. (Teaching is the best way to learn it yourself.)
            </div>

            {(lists.courses.length > 0 || lists.legacy.length > 0) && (<>
              <div style={{ color: T.sub, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>CONTINUE A COURSE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
                {lists.courses.map((s, i) => (
                  <button key={"c" + i} onClick={() => startCourse(s.subject, s.students, s.durationWeeks, undefined, true)} style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: "10px 12px", cursor: "pointer", fontFamily: font }}>
                    <div style={{ display: "flex", flexShrink: 0 }}>{s.students.slice(0, 4).map((id, j) => { const a = getAgent(id); return (
                      <div key={id} style={{ width: 34, height: 34, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center", marginLeft: j ? -10 : 0, border: `2px solid ${T.bg}` }}><div style={{ marginTop: 1 }}><TonyCharacter size={52} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>); })}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{s.subject}</div>
                      <div style={{ color: T.sub, fontSize: 11.5, marginTop: 2 }}>{s.students.length} student{s.students.length === 1 ? "" : "s"} · {s.lessons} lesson{s.lessons === 1 ? "" : "s"} · {s.examsDone}/{s.durationWeeks} exams</div>
                    </div>
                    <div style={{ color: T.violet, fontSize: 13, fontWeight: 700 }}>→</div>
                  </button>
                ))}
                {lists.legacy.map((s, i) => { const a = getAgent(s.agentId); return (
                  <button key={"l" + i} onClick={() => startCourse(s.subject, [s.agentId], 4, undefined, true)} style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left", background: T.panel, border: `1px dashed ${T.line}`, borderRadius: 16, padding: "10px 12px", cursor: "pointer", fontFamily: font }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center", flexShrink: 0 }}><div style={{ marginTop: 1 }}><TonyCharacter size={52} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{a.name} · <span style={{ color: T.sub, fontWeight: 600 }}>{s.subject}</span></div><div style={{ color: T.sub, fontSize: 11.5, marginTop: 2 }}>earlier session · mastery {Math.round(s.mastery)}%</div></div>
                    <div style={{ color: T.violet, fontSize: 13, fontWeight: 700 }}>→</div>
                  </button>
                ); })}
              </div>
            </>)}

            <div style={{ color: T.sub, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>ENROLL YOUR STUDENTS <span style={{ color: T.violet }}>({picked.length}/4)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 20 }}>
              {AGENT_LIST.map(a => { const on = picked.includes(a.id); return (
                <button key={a.id} onClick={() => togglePick(a.id)} style={{ position: "relative", background: on ? T.grad : T.panel, border: `1.5px solid ${on ? "transparent" : T.line}`, borderRadius: 16, padding: "12px 6px", cursor: "pointer", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {on && <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "#fff", color: T.pink, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>}
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center" }}><div style={{ marginTop: 2 }}><TonyCharacter size={70} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>
                  <div style={{ color: on ? "#fff" : T.text, fontWeight: 700, fontSize: 12 }}>{a.name}</div>
                </button>
              ); })}
            </div>

            <div style={{ color: T.sub, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>SUBJECT</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Photosynthesis, Python loops, French verbs…" style={{ width: "100%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 14, padding: "13px 15px", borderRadius: 14, outline: "none", fontFamily: font, marginBottom: 16 }} />

            <div style={{ color: T.sub, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>COURSE DURATION <span style={{ color: T.sub, fontWeight: 500 }}>(= number of exam checkpoints)</span></div>
            <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setDurationWeeks(d)} style={{ background: durationWeeks === d ? T.grad : T.panel, border: `1px solid ${durationWeeks === d ? "transparent" : T.line}`, color: durationWeeks === d ? "#fff" : T.sub, fontWeight: 700, fontSize: 13, padding: "9px 15px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{d} wk{d === 1 ? "" : "s"}</button>
              ))}
            </div>

            <div style={{ color: T.sub, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>RESOURCES TO SHARE <span style={{ color: T.sub, fontWeight: 500 }}>(optional)</span></div>
            <textarea value={resources} onChange={e => setResources(e.target.value)} rows={2} placeholder="Paste links, a syllabus, key notes your class can refer to…" style={{ width: "100%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13, padding: "12px 14px", borderRadius: 14, outline: "none", fontFamily: font, resize: "none", marginBottom: 18 }} />

            <button disabled={!picked.length || !subject.trim() || busy} onClick={() => startCourse(subject, picked, durationWeeks, resources)} style={{ width: "100%", background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 16, padding: "15px 0", borderRadius: 100, cursor: (!picked.length || !subject.trim() || busy) ? "not-allowed" : "pointer", fontFamily: font, opacity: (!picked.length || !subject.trim() || busy) ? 0.5 : 1, boxShadow: "0 12px 36px rgba(255,94,126,0.35)" }}>
              {busy ? "Opening…" : `🎓 Start the course${picked.length ? ` (${picked.length})` : ""}`}
            </button>
            {err && <div style={{ color: T.pink, fontSize: 12, fontWeight: 600, textAlign: "center", marginTop: 12 }}>{err}</div>}
          </div>
        ) : (
          /* ===================== COURSE ===================== */
          <>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${T.line}` }}>
              <button onClick={exit} style={{ background: "transparent", border: "none", color: T.text, fontSize: 20, cursor: "pointer" }}>←</button>
              <button onClick={() => setShowRoster(true)} style={{ display: "flex", flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                {members.slice(0, 4).map((a, j) => (
                  <div key={a.id} style={{ width: 36, height: 36, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center", marginLeft: j ? -11 : 0, border: `2px solid ${T.bg}` }}><div style={{ marginTop: 1 }}><TonyCharacter size={54} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>
                ))}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{course.subject}</div>
                <div style={{ color: T.violet, fontSize: 11.5, fontWeight: 600 }}>{members.length} student{members.length === 1 ? "" : "s"} · Week {examsDone}/{course.durationWeeks}</div>
              </div>
              <Ring value={avgMastery} size={48} />
            </div>

            {/* concepts learned */}
            {course.concepts?.length > 0 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 14px", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ color: T.sub, fontSize: 10.5, fontWeight: 800, alignSelf: "center", flexShrink: 0 }}>LEARNED:</span>
                {course.concepts.slice(-14).map((c, i) => <span key={i} style={{ flexShrink: 0, background: "rgba(74,222,128,0.12)", border: `1px solid rgba(74,222,128,0.3)`, color: T.green, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, whiteSpace: "nowrap" }}>✓ {c}</span>)}
              </div>
            )}

            {/* graduation banner */}
            {eligibleGrads.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "rgba(245,200,75,0.1)", borderBottom: `1px solid rgba(245,200,75,0.25)` }}>
                <span style={{ fontSize: 16 }}>🎓</span>
                <span style={{ color: T.gold, fontSize: 12, fontWeight: 700, flex: 1 }}>{eligibleGrads.map(id => getAgent(id).name).join(", ")} {eligibleGrads.length === 1 ? "is" : "are"} ready to graduate!</span>
                {eligibleGrads.map(id => <button key={id} onClick={() => graduate(id)} disabled={busy} style={{ background: T.gold, border: "none", color: "#1a1530", fontWeight: 800, fontSize: 11, padding: "5px 10px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>🎓 {getAgent(id).name}</button>)}
              </div>
            )}

            {/* transcript */}
            <div ref={panelRef} style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: T.sub, fontSize: 13.5, lineHeight: 1.6, margin: "22px 16px" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
                  Start teaching your class about <b style={{ color: T.text }}>{course.subject}</b>. Explain a concept and they'll follow along, ask questions, and learn together.<br /><br />
                  <span style={{ color: T.violet }}>Tip:</span> after a few lessons, try <b style={{ color: T.text }}>📚 Study Hall</b> or set a <b style={{ color: T.text }}>📝 exam</b>.
                </div>
              )}
              {messages.map((m, i) => {
                if (m.role === "system") return <div key={i} style={{ textAlign: "center" }}><span style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", border: `1px solid ${T.line}`, color: T.sub, fontSize: 11.5, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>{m.text}</span></div>;
                const isT = m.role === "teacher"; const a = isT ? null : getAgent(m.from);
                return (
                  <div key={i} style={{ display: "flex", flexDirection: isT ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                    {!isT && <div style={{ width: 30, height: 30, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", flexShrink: 0, display: "flex", justifyContent: "center" }}><div style={{ marginTop: 1 }}><TonyCharacter size={48} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>}
                    <div style={{ maxWidth: "78%", background: isT ? T.grad : m.study ? "rgba(139,92,246,0.14)" : T.panel2, border: isT ? "none" : `1px solid ${m.study ? "rgba(139,92,246,0.35)" : T.line}`, borderRadius: isT ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: m.image ? 5 : "9px 13px" }}>
                      {m.image && <img src={m.image} alt="whiteboard sketch" style={{ width: "100%", maxWidth: 220, borderRadius: 11, display: "block", marginBottom: 4 }} />}
                      {!isT && <div style={{ color: m.study ? T.violet : T.violet, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, marginBottom: 2 }}>{a.name.toUpperCase()}{m.study ? " · STUDYING" : ""}</div>}
                      <div style={{ color: isT ? "#fff" : T.text, fontSize: 14, lineHeight: 1.5, fontWeight: isT ? 600 : 500, padding: m.image ? "0 8px 4px" : 0 }}>{m.text}</div>
                    </div>
                  </div>
                );
              })}
              {phaseLabel && <div style={{ color: T.sub, fontSize: 12, fontWeight: 600, fontStyle: "italic", paddingLeft: 4 }}>{phaseLabel}</div>}
            </div>

            {err && <div style={{ color: T.pink, fontSize: 12, fontWeight: 600, textAlign: "center", padding: "2px 16px 4px" }}>{err}</div>}

            {/* action row */}
            <div style={{ display: "flex", gap: 7, padding: "6px 12px 0", overflowX: "auto" }}>
              <button onClick={() => setShowBoard(true)} disabled={busy} style={{ ...chip(busy), flexShrink: 0 }}>🖊 Whiteboard</button>
              <button onClick={() => { setCodeLang(guessLang(course.subject) || "python"); setShowCode(true); }} disabled={busy} style={{ ...chip(busy), flexShrink: 0 }}>💻 Code</button>
              <button onClick={studyHall} disabled={busy || course.concepts.length === 0} style={{ ...chip(busy || course.concepts.length === 0), flexShrink: 0 }}>📚 Study Hall</button>
              <button onClick={runExam} disabled={busy || course.concepts.length === 0 || examsDone >= course.durationWeeks} style={{ ...chip(busy || course.concepts.length === 0 || examsDone >= course.durationWeeks), flexShrink: 0 }}>📝 Week {Math.min(examsDone + 1, course.durationWeeks)} exam</button>
              <button onClick={recap} disabled={busy || messages.length === 0} style={{ ...chip(busy || messages.length === 0), flexShrink: 0 }}>📊 Recap</button>
              <button onClick={makeGuide} disabled={busy || course.concepts.length === 0} style={{ ...chip(busy || course.concepts.length === 0), flexShrink: 0 }}>📋 Guide</button>
              <button onClick={() => setShowRes(true)} style={{ ...chip(false), flexShrink: 0 }}>📎 Resources</button>
            </div>

            {/* input */}
            <div style={{ display: "flex", gap: 9, alignItems: "flex-end", padding: "10px 12px 18px" }}>
              <button onClick={toggleVoice} title="Teach by voice" style={{ width: 48, height: 48, borderRadius: "50%", background: voiceOn ? T.violet : T.panel2, border: `1px solid ${T.line}`, fontSize: 19, cursor: "pointer", flexShrink: 0 }}>🎙</button>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={1} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); teach(input); } }}
                placeholder={phase === "listening" ? "Listening…" : "Teach your class something…"} disabled={busy}
                style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 14.5, padding: "13px 15px", borderRadius: 22, outline: "none", fontFamily: font, resize: "none", maxHeight: 120, opacity: busy ? 0.6 : 1 }} />
              <button onClick={() => teach(input)} disabled={!input.trim() || busy} style={{ width: 48, height: 48, borderRadius: "50%", background: T.grad, border: "none", color: "#fff", fontSize: 19, cursor: (!input.trim() || busy) ? "not-allowed" : "pointer", opacity: (!input.trim() || busy) ? 0.5 : 1, flexShrink: 0 }}>➤</button>
            </div>
          </>
        )}
      </div>
    </div>

    {/* roster / per-student mastery */}
    {showRoster && course && (
      <div onClick={() => setShowRoster(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,7,14,0.9)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: font }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#14121f", borderRadius: "22px 22px 0 0", padding: "18px 18px 28px", borderTop: `1px solid ${T.line}` }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Class roster</div>
          {members.map(a => { const ms = course.studentStats[a.id]?.mastery || 0; const grad = course.studentStats[a.id]?.graduated; return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center", flexShrink: 0 }}><div style={{ marginTop: 2 }}><TonyCharacter size={60} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: T.text, fontWeight: 700, fontSize: 13.5 }}>{a.name} {grad && <span style={{ color: T.gold }}>🎓</span>}</span><span style={{ color: T.sub, fontSize: 12 }}>{ms}%</span></div>
                <div style={{ height: 7, borderRadius: 100, background: T.panel2, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(3, ms)}%`, background: ms >= GRAD ? `linear-gradient(90deg,${T.gold},#ffd97a)` : T.grad, borderRadius: 100, transition: "width 0.5s" }} /></div>
              </div>
              {ms >= GRAD && !grad && <button onClick={() => { setShowRoster(false); graduate(a.id); }} style={{ background: T.gold, border: "none", color: "#1a1530", fontWeight: 800, fontSize: 11, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Graduate</button>}
            </div>
          ); })}
          <button onClick={() => setShowRoster(false)} style={{ width: "100%", marginTop: 6, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Close</button>
        </div>
      </div>
    )}

    {/* resources editor */}
    {showRes && course && (
      <div onClick={() => setShowRes(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,7,14,0.9)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: font }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "#14121f", border: `1px solid ${T.line}`, borderRadius: 22, padding: 18 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>📎 Course resources</div>
          <textarea value={resources} onChange={e => setResources(e.target.value)} rows={6} placeholder="Links, syllabus, key notes the class can refer to…" style={{ width: "100%", background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontSize: 13.5, padding: "12px 14px", borderRadius: 14, outline: "none", fontFamily: font, resize: "none", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={saveResources} style={{ flex: 1, background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Save & share</button>
            <button onClick={() => setShowRes(false)} style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Close</button>
          </div>
        </div>
      </div>
    )}

    {/* exam results */}
    {exam && (
      <div onClick={() => setExam(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,7,14,0.92)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: font }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "88vh", background: "#14121f", border: `1px solid ${T.line}`, borderRadius: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>📝 Week {exam.week} exam results</div>
            <div style={{ color: T.sub, fontSize: 12, marginTop: 2 }}>Class average {Math.round(exam.results.reduce((s, r) => s + r.score, 0) / Math.max(1, exam.results.length))}%</div>
          </div>
          <div style={{ padding: "12px 18px", overflowY: "auto" }}>
            {exam.questions.length > 0 && <div style={{ marginBottom: 14 }}>
              <div style={{ color: T.sub, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>QUESTIONS</div>
              {exam.questions.map((q, i) => <div key={i} style={{ color: T.text, fontSize: 12.5, lineHeight: 1.5, marginBottom: 5 }}>{i + 1}. {q}</div>)}
            </div>}
            <div style={{ color: T.sub, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>RESULTS</div>
            {exam.results.map((r, i) => { const a = getAgent(r.agentId); return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: a.look?.hoodie || "#ffe566", overflow: "hidden", display: "flex", justifyContent: "center", flexShrink: 0 }}><div style={{ marginTop: 1 }}><TonyCharacter size={54} look={a.look || {}} float="none" animated={false} pose="down" /></div></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{a.name}</span><span style={{ color: r.pass ? T.green : T.pink, fontWeight: 800, fontSize: 13 }}>{r.score}% {r.pass ? "✓" : "✗"}</span></div>
                  <div style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.4, marginTop: 2 }}>{r.feedback}</div>
                </div>
              </div>
            ); })}
          </div>
          <div style={{ padding: 14, borderTop: `1px solid ${T.line}` }}>
            <button onClick={() => setExam(null)} style={{ width: "100%", background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14.5, padding: "13px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Back to class</button>
          </div>
        </div>
      </div>
    )}

    {/* study guide */}
    {share && (
      <div onClick={() => setShare(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,7,14,0.9)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: font }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "86vh", background: "#14121f", border: `1px solid ${T.line}`, borderRadius: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 15 }}>📋 Study guide</div>
            <button onClick={() => setShare(null)} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, width: 30, height: 30, borderRadius: "50%", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ padding: "14px 18px", overflowY: "auto", color: T.text, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{share.guide}</div>
          <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.line}` }}>
            <div style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.5, marginBottom: 10 }}>Copy this into your real class, Zoom chat or study group. <span style={{ color: T.text }}>Your students can't join a live video call</span> — but everything they learned travels with you here.</div>
            <button onClick={() => { navigator.clipboard?.writeText(`# ${share.title}\n\n${share.guide}`); }} style={{ width: "100%", background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14.5, padding: "13px 0", borderRadius: 100, cursor: "pointer", fontFamily: font }}>📋 Copy study guide</button>
          </div>
        </div>
      </div>
    )}

    {showBoard && <Whiteboard onTeach={teachImage} onClose={() => setShowBoard(false)} busy={busy} />}

    {/* code playground panel */}
    {showCode && course && (
      <div onClick={() => setShowCode(false)} style={{ position: "fixed", inset: 0, zIndex: 205, background: "rgba(8,7,14,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: font }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#14121f", border: `1px solid ${T.line}`, borderRadius: 22, padding: 18, maxHeight: "92vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>💻 Code playground</div>
            <button onClick={() => setShowCode(false)} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, width: 30, height: 30, borderRadius: "50%", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ color: T.sub, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, marginBottom: 7 }}>LANGUAGE</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {CODE_LANGS.map(([id, label]) => (
              <button key={id} onClick={() => setCodeLang(id)} style={{ background: codeLang === id ? T.grad : T.panel2, border: `1px solid ${codeLang === id ? "transparent" : T.line}`, color: codeLang === id ? "#fff" : T.sub, fontWeight: 700, fontSize: 11.5, padding: "6px 11px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>{label}</button>
            ))}
          </div>
          <a href={playgroundUrl(codeLang)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg,#2563eb,#16a34a)", border: "none", color: "#fff", fontWeight: 800, fontSize: 14.5, padding: "13px 0", borderRadius: 14, textDecoration: "none", marginBottom: 16 }}>
            ↗ Open the {CODE_LANGS.find(([id]) => id === codeLang)?.[1] || "code"} playground
          </a>
          <div style={{ color: T.sub, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, marginBottom: 7 }}>OR TEACH A SNIPPET TO YOUR CLASS</div>
          <textarea value={codeText} onChange={e => setCodeText(e.target.value)} rows={7} spellCheck={false} placeholder={"# write code here to teach it to the class…"} style={{ width: "100%", background: "#0c0b15", border: `1px solid ${T.line}`, color: "#cfe8ff", fontSize: 13, padding: "12px 14px", borderRadius: 14, outline: "none", fontFamily: "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace", resize: "none", lineHeight: 1.6, whiteSpace: "pre", overflowX: "auto" }} />
          <button onClick={teachCode} disabled={!codeText.trim() || busy} style={{ width: "100%", marginTop: 12, background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 14.5, padding: "13px 0", borderRadius: 100, cursor: (!codeText.trim() || busy) ? "not-allowed" : "pointer", fontFamily: font, opacity: (!codeText.trim() || busy) ? 0.5 : 1 }}>🎓 Teach this code to the class</button>
          <div style={{ color: T.sub, fontSize: 10.5, textAlign: "center", marginTop: 9, lineHeight: 1.4 }}>The playground opens in a new tab so you can write & run code, then teach it here.</div>
        </div>
      </div>
    )}

    {cert && <Certificate cert={cert} onClose={() => setCert(null)} />}

    <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } html, body { background: ${T.bg}; }`}</style>
  </>);
}
