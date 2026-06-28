// AI Tutor — ROLE REVERSAL: the user is the teacher, AI characters are the students.
// Supports multi-student COURSES: a class of characters learns a subject together,
// studies together (Combined Studies), sits weekly exams set by the AI examiner, and
// graduates with a certificate. Zero-DDL: a course lives in one `::course::` row.
import { AGENTS, getAgent } from "../../lib/agents";
import { languagePrompt, LANGS } from "../../lib/i18n";
import { configured, getRow, upsertRow, getUserRows } from "../../lib/db";

const MODEL = "claude-sonnet-4-6";
const FAST = "claude-haiku-4-5-20251001";
const PASS = 60;        // exam pass mark
const GRADUATE = 85;    // mastery needed to graduate

const slug = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "general";
const courseKey = (userId, subjSlug) => `${userId}::course::${subjSlug}`;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

async function claude(apiKey, model, system, userContent, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userContent }] }),
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  return d.content[0].text.trim();
}
function parseJSON(text) {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.search(/[\[{]/); if (a > 0) t = t.slice(a);
  const lastObj = t.lastIndexOf("}"), lastArr = t.lastIndexOf("]");
  const b = Math.max(lastObj, lastArr); if (b >= 0) t = t.slice(0, b + 1);
  return JSON.parse(t);
}
const personaOf = (a) => a.persona || "You are a warm, curious friend at Rico.";
const nmeOf = (ids) => ids.filter(id => AGENTS[id]).map(id => AGENTS[id]);
const namesList = (members) => members.map(m => m.name).join(", ");
const transcript = (messages, teacher) =>
  (messages || []).filter(m => m.role !== "system").slice(-18).map(m => `${m.role === "teacher" ? (teacher || "Teacher") : (AGENTS[m.from]?.name || "Student")}: ${m.text}`).join("\n");

function loadCourse(row) {
  const t = (row && row.traits) || {};
  return {
    subject: t.subject || "",
    students: t.students || [],
    durationWeeks: t.durationWeeks || 4,
    resources: t.resources || "",
    concepts: t.concepts || [],
    lessons: t.lessons || 0,
    exams: t.exams || [],
    studentStats: t.studentStats || {},
    messages: (row && row.messages) || [],
    createdAt: t.createdAt || null,
  };
}
async function saveCourse(key, c, messages) {
  await upsertRow(key, {
    messages: (messages || c.messages).slice(-80),
    msg_count: (messages || c.messages).length,
    traits: {
      subject: c.subject, students: c.students, durationWeeks: c.durationWeeks, resources: c.resources,
      concepts: c.concepts.slice(0, 60), lessons: c.lessons, exams: c.exams.slice(-12),
      studentStats: c.studentStats, createdAt: c.createdAt || new Date().toISOString(),
    },
  });
}
const mergeConcepts = (base, add) => {
  const out = [...base];
  for (const c of (add || [])) { const cc = String(c).trim(); if (cc && !out.some(x => x.toLowerCase() === cc.toLowerCase())) out.push(cc); }
  return out;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  const { mode, userId, subject, students, durationWeeks, resources, teacher, language, messages, week, doubt, image } = req.body || {};
  const lang = LANGS[language] ? language : "en";
  const subjSlug = slug(subject);
  const key = userId && configured() ? courseKey(userId, subjSlug) : null;

  try {
    // -------- list courses + legacy single-student sessions --------
    if (mode === "list") {
      if (!userId || !configured()) return res.status(200).json({ courses: [], legacy: [] });
      const rows = await getUserRows(userId);
      const courses = rows.filter(r => /::course::/.test(r.user_id)).map(r => {
        const c = loadCourse(r);
        return { subjectSlug: r.user_id.split("::course::")[1], subject: c.subject, students: c.students, durationWeeks: c.durationWeeks, concepts: c.concepts, lessons: c.lessons, studentStats: c.studentStats, examsDone: c.exams.length, updatedAt: r.updated_at };
      }).filter(c => c.students.length);
      const legacy = rows.filter(r => /::tutor::/.test(r.user_id)).map(r => {
        const m = r.user_id.match(/::tutor::(.+?)::(.+)$/); const t = r.traits || {};
        return { agentId: m ? m[1] : null, subject: t.subject || "", mastery: t.mastery || 0, concepts: t.concepts || [], lessons: t.lessons || 0, updatedAt: r.updated_at };
      }).filter(s => s.agentId && AGENTS[s.agentId]);
      return res.status(200).json({ courses: courses.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)), legacy });
    }

    const ids = (students || []).filter(id => AGENTS[id]).slice(0, 4);

    // -------- create / open a course --------
    if (mode === "course_create") {
      if (!ids.length) return res.status(400).json({ error: "No students" });
      let c;
      if (key) { const row = await getRow(key); c = row ? loadCourse(row) : null; }
      if (!c) c = loadCourse(null);
      c.subject = subject; c.students = ids; c.durationWeeks = durationWeeks || c.durationWeeks || 4; c.resources = resources != null ? resources : c.resources;
      const stats = { ...c.studentStats };
      for (const id of ids) if (!stats[id]) stats[id] = { mastery: 0, graduated: false };
      c.studentStats = stats; c.createdAt = c.createdAt || new Date().toISOString();
      if (key) await saveCourse(key, c, c.messages);
      return res.status(200).json({ course: { subject: c.subject, subjectSlug: subjSlug, students: c.students, durationWeeks: c.durationWeeks, resources: c.resources, concepts: c.concepts, lessons: c.lessons, exams: c.exams, studentStats: c.studentStats, messages: c.messages } });
    }

    // load course for the remaining modes
    const row = key ? await getRow(key) : null;
    const c = row ? loadCourse(row) : { ...loadCourse(null), subject, students: ids, studentStats: Object.fromEntries(ids.map(id => [id, { mastery: 0, graduated: false }])) };
    const members = nmeOf(c.students.length ? c.students : ids);
    if (!members.length) return res.status(400).json({ error: "No students" });

    // -------- teaching turn (the whole class learns; 1-2 students voice it) --------
    if (mode === "teach") {
      const lastTeach = [...(messages || [])].reverse().find(m => m.role === "teacher");
      if (!lastTeach) return res.status(400).json({ error: "Nothing taught" });
      // primary responder: directly addressed name wins, else lowest-mastery student (they need it most)
      let primary = members.find(a => new RegExp(`\\b${a.name}\\b`, "i").test(lastTeach.text))
        || members.slice().sort((a, b) => (c.studentStats[a.id]?.mastery || 0) - (c.studentStats[b.id]?.mastery || 0))[0];
      const others = members.filter(m => m.id !== primary.id);
      const myMastery = c.studentStats[primary.id]?.mastery || 0;
      const img = (typeof image === "string") && image.match(/^data:(image\/\w+);base64,(.+)$/s);
      const sys = `${personaOf(primary)}

ROLE REVERSAL — YOU ARE A STUDENT, NOT THE EXPERT. ${teacher || "Your friend"} is teaching your class "${subject}". Classmates: ${namesList(others) || "(just you)"}. Stay in ${primary.name}'s voice, but be an eager learner.
- React naturally; ~every other turn ask ONE real clarifying question.
- Sometimes restate an idea in your own words so you can be corrected. It's OK to be a little unsure.${img ? "\n- Your teacher just drew something on the whiteboard — LOOK at the image and react to what they sketched." : ""}
- SHORT: 1-3 sentences. Never lecture back. Your current understanding ≈ ${myMastery}/100${c.concepts.length ? `. Class has learned: ${c.concepts.slice(0, 10).join(", ")}.` : "."}
${languagePrompt(lang)}
Respond ONLY with strict JSON: {"reply":"<${primary.name}, 1-3 sentences>","mastery":<new 0-100 understanding>,"newConcepts":["..."],"question":"<or empty>"}`;
      const promptText = `Lesson so far:\n${transcript(messages, teacher)}\n\n[${img ? "Look at the whiteboard sketch and respond" : "Respond"} as ${primary.name}. Strict JSON only.]`;
      const userContent = img
        ? [{ type: "text", text: promptText }, { type: "image", source: { type: "base64", media_type: img[1], data: img[2] } }]
        : promptText;
      const raw = await claude(apiKey, MODEL, sys, userContent, 480);
      let p; try { p = parseJSON(raw); } catch (e) { p = { reply: raw.slice(0, 320), mastery: myMastery + 3, newConcepts: [], question: "" }; }
      const replies = [{ from: primary.id, text: (p.reply || "Got it — go on!").toString() }];

      // apply learning: primary gains fully; classmates get a passive bump (they're in class)
      c.concepts = mergeConcepts(c.concepts, p.newConcepts);
      const stats = { ...c.studentStats };
      stats[primary.id] = { ...(stats[primary.id] || {}), mastery: clamp(Math.max(myMastery, parseInt(p.mastery, 10) || myMastery + 3)) };
      for (const o of others) stats[o.id] = { ...(stats[o.id] || {}), mastery: clamp((stats[o.id]?.mastery || 0) + 2) };

      // ~30% a classmate reacts / piggybacks a question
      if (others.length && Math.random() < 0.3) {
        const reactor = others[Math.floor(Math.random() * others.length)];
        try {
          const sys2 = `${personaOf(reactor)}\nYou are ${reactor.name}, a STUDENT in a class learning "${subject}" from ${teacher || "your friend"}. In ONE short sentence, react to the lesson or ${primary.name}'s point, or add a quick question. In character.\n${languagePrompt(lang)}`;
          const t2 = await claude(apiKey, FAST, sys2, `Lesson:\n${transcript(messages, teacher)}\n${primary.name}: ${replies[0].text}\n\n[One sentence as ${reactor.name}.]`, 70);
          replies.push({ from: reactor.id, text: t2 });
          stats[reactor.id] = { ...(stats[reactor.id] || {}), mastery: clamp((stats[reactor.id]?.mastery || 0) + 1) };
        } catch (e) {}
      }
      c.studentStats = stats; c.lessons += 1;
      const newMsgs = [...(messages || []), ...replies.map(r => ({ from: r.from, text: r.text, role: "student" }))];
      if (key) { try { await saveCourse(key, c, newMsgs); } catch (e) {} }
      return res.status(200).json({ replies, studentStats: c.studentStats, concepts: c.concepts, lessons: c.lessons });
    }

    // -------- Combined Studies: students study together --------
    if (mode === "study") {
      const doubtText = (typeof doubt === "string" && doubt.trim()) ? doubt.trim() : "";
      const sys = `You orchestrate a friendly STUDY GROUP of AI characters revising "${subject}" together. Members (use these exact ids): ${members.map(m => `${m.id} (${m.name}, ${m.archetype})`).join("; ")}.
They explain concepts to each other, quiz each other, and clarify doubts — each in their OWN voice and personality, warm and platonic. Keep each line 1-2 sentences.
Concepts they know: ${c.concepts.slice(0, 14).join(", ") || "the basics"}.
${doubtText ? `Their teacher ${teacher || ""} just raised: "${doubtText}". Make sure they help clarify THIS together.` : "Have them pick a concept and teach it to each other."}
${languagePrompt(lang)}
Return ONLY strict JSON array of 3-4 turns: [{"agentId":"<id>","text":"<1-2 sentences>"}, ...]. Different members, in character.`;
      const raw = await claude(apiKey, MODEL, sys, `[Generate the study-group exchange now. Strict JSON array.]`, 480);
      let arr; try { arr = parseJSON(raw); } catch (e) { arr = []; }
      const replies = (Array.isArray(arr) ? arr : []).filter(x => x && AGENTS[x.agentId]).slice(0, 4).map(x => ({ from: x.agentId, text: String(x.text || "").slice(0, 300) }));
      if (!replies.length) return res.status(200).json({ replies: [{ from: members[0].id, text: "Okay team — let's go over what we learned so far!" }] });
      // small bump for studying together
      const stats = { ...c.studentStats };
      for (const r of replies) stats[r.from] = { ...(stats[r.from] || {}), mastery: clamp((stats[r.from]?.mastery || 0) + 2) };
      c.studentStats = stats;
      const baseMsgs = (messages && messages.length) ? messages : (c.messages || []);
      const newMsgs = [...baseMsgs, ...replies.map(r => ({ from: r.from, text: r.text, role: "student", study: true }))];
      if (key) { try { await saveCourse(key, c, newMsgs); } catch (e) {} }
      return res.status(200).json({ replies, studentStats: c.studentStats });
    }

    // -------- weekly exam set & graded by the AI examiner --------
    if (mode === "exam") {
      const wk = week || (c.exams.length + 1);
      const sys = `You are a fair exam examiner. Subject: "${subject}". Concepts taught: ${c.concepts.slice(0, 18).join(", ") || "introductory material"}.
Students sitting the exam (id · current understanding /100): ${members.map(m => `${m.id} · ${c.studentStats[m.id]?.mastery || 0}`).join("; ")}.
Write 4 concise exam questions on the taught material. Then SIMULATE each student answering based on their understanding level (higher understanding → stronger answers; a low-level student may miss things). Grade each student 0-100 and give one short feedback line.
Return ONLY strict JSON: {"questions":["q1","q2","q3","q4"],"results":[{"agentId":"<id>","score":<0-100>,"feedback":"<short>"}]}`;
      const raw = await claude(apiKey, MODEL, sys, `[Set and grade Week ${wk} exam now. Strict JSON only.]`, 1100);
      let ex; try { ex = parseJSON(raw); } catch (e) { ex = { questions: [], results: [] }; }
      const results = (ex.results || []).filter(r => AGENTS[r.agentId]).map(r => {
        const score = clamp(parseInt(r.score, 10) || 0);
        return { agentId: r.agentId, score, pass: score >= PASS, feedback: String(r.feedback || "").slice(0, 160) };
      });
      if (!results.length) return res.status(200).json({ error: "exam_parse", results: [] }); // don't burn a week on a parse miss
      // nudge mastery toward exam score (exams consolidate learning) — never regress
      const stats = { ...c.studentStats };
      for (const r of results) { const cur = stats[r.agentId]?.mastery || 0; stats[r.agentId] = { ...(stats[r.agentId] || {}), mastery: clamp(Math.max(cur, Math.round(cur * 0.5 + r.score * 0.5) + 4)) }; }
      c.studentStats = stats;
      const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
      c.exams = [...c.exams, { week: wk, results, avg, at: new Date().toISOString() }];
      if (key) { try { await saveCourse(key, c, c.messages); } catch (e) {} }
      return res.status(200).json({ week: wk, questions: ex.questions || [], results, studentStats: c.studentStats, durationWeeks: c.durationWeeks });
    }

    // -------- student recaps what the class has learned --------
    if (mode === "recap") {
      const speaker = members.slice().sort((a, b) => (c.studentStats[b.id]?.mastery || 0) - (c.studentStats[a.id]?.mastery || 0))[0];
      const sys = `${personaOf(speaker)}\nYou are ${speaker.name}, a student whose class has been taught "${subject}" by ${teacher || "a friend"}. In your own voice, warmly recap what the class has learned, what clicked, and one thing you're still curious about. 3-5 sentences.\n${languagePrompt(lang)}`;
      const text = await claude(apiKey, MODEL, sys, `Lessons:\n${transcript(c.messages, teacher)}\n\nConcepts: ${c.concepts.join(", ") || "(early days)"}\n\n[Recap as ${speaker.name}.]`, 350);
      return res.status(200).json({ replies: [{ from: speaker.id, text }] });
    }

    // -------- shareable study guide --------
    if (mode === "share") {
      const guide = await claude(apiKey, MODEL, `You write clean study guides in GitHub-flavoured markdown.`,
        `Subject: "${subject}". Concepts: ${c.concepts.join(", ") || "intro"}.\nLessons:\n${transcript(c.messages, teacher)}\n\nWrite a tidy one-page study guide: 1-sentence overview, 4-8 key bullets, then 3 self-check questions. Tight.`, 700);
      return res.status(200).json({ title: subject, guide });
    }

    // -------- graduation certificate --------
    if (mode === "certify") {
      const agentId = (students && students[0]) || null;
      const a = getAgent(agentId);
      const mastery = c.studentStats[agentId]?.mastery || 0;
      const passedFinal = c.exams.some(e => e.week >= c.durationWeeks && (e.results.find(r => r.agentId === agentId)?.pass));
      if (mastery < GRADUATE && !passedFinal) return res.status(200).json({ ok: false, mastery, needed: GRADUATE });
      const grade = mastery >= 95 ? "A+" : mastery >= 90 ? "A" : mastery >= 85 ? "A−" : mastery >= 75 ? "B" : "Pass";
      // mark graduated
      c.studentStats = { ...c.studentStats, [agentId]: { ...(c.studentStats[agentId] || {}), graduated: true } };
      if (key) { try { await saveCourse(key, c, c.messages); } catch (e) {} }
      return res.status(200).json({ ok: true, cert: { student: a.name, agentId, subject, teacher: teacher || "Your teacher", grade, mastery, date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), highlights: c.concepts.slice(0, 6) } });
    }

    return res.status(400).json({ error: "Unknown mode" });
  } catch (e) {
    console.error("tutor error:", e.message);
    return res.status(500).json({ error: "Tutor failed" });
  }
}
