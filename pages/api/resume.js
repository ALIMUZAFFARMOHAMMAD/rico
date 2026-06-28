// Résumé feature for Tony — the user shares their résumé (PDF, image, or pasted text);
// Claude extracts a structured professional profile and stores it in Tony's memory
// (the user's tony row, traits.resume) so Tony grounds career advice in their real
// background. Read back by /api/tony's loadMemory.
import { configured, getRow, upsertRow } from "../../lib/db";
import mammoth from "mammoth";

const MODEL = "claude-sonnet-4-6";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } }; // résumé PDFs/images

async function claude(apiKey, system, content, maxTokens, beta) {
  const headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  if (beta) headers["anthropic-beta"] = beta;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers,
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  return d.content[0].text.trim();
}
// repair a truncated JSON string by closing any open strings/brackets
function closeTruncatedJSON(s) {
  const stack = []; let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") stack.pop();
  }
  let out = s;
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}
function parseJSON(text) {
  let t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const a = t.search(/[\[{]/); if (a > 0) t = t.slice(a);
  try { return JSON.parse(t); } catch (e) {}
  const lastClose = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (lastClose >= 0) { try { return JSON.parse(t.slice(0, lastClose + 1)); } catch (e) {} }
  return JSON.parse(closeTruncatedJSON(t)); // last-ditch: repair a truncated response
}

const EXTRACT_SYS = `You read a person's résumé/CV and extract a structured professional profile for their AI career mentor "Tony" to use.
Return ONLY strict JSON, no prose:
{"name":"<or empty>","headline":"<one-line professional headline>","currentRole":"<most recent role + org, or empty>","yearsExperience":<number or 0>,"topSkills":["..."],"education":["<degree, school, year>"],"experience":[{"role":"","org":"","summary":"<1 line>"}],"strengths":["<inferred strengths>"],"careerGoals":"<if stated/implied, else empty>","summary":"<a tight 3-4 sentence paragraph Tony can use to give grounded, specific career advice>","ack":"<a warm, in-character 1-2 sentence reaction as Tony reacting to having just read their résumé, referencing ONE specific real detail from it>"}
Keep every field concise — do NOT echo the whole résumé back. If the input clearly isn't a résumé, set summary to "" and ack to a gentle note that it didn't look like a résumé.`;

const ATS_SYS = (targetRole, jd) => `You are a strict but fair ATS (Applicant Tracking System) résumé analyzer. Evaluate how well this résumé will perform when parsed and ranked by automated hiring software${targetRole ? `, for the target role: "${targetRole}"` : ""}.${jd ? `\nScore keyword match against this job description:\n"""${String(jd).slice(0, 4000)}"""` : ""}
Be realistic and specific — reward quantified impact, strong action verbs, standard parseable sections, and relevant keywords; penalize fluff, missing contact info, weak verbs, dense formatting, and missing role keywords.
Return ONLY strict JSON, no prose:
{
 "score": <0-100 overall ATS readiness>,
 "verdict": "<short phrase, e.g. 'Strong base, needs keyword tuning'>",
 "categories": [{"name":"<e.g. Contact & header>","score":<n>,"max":<n>,"status":"good|warn|bad","note":"<one specific line>"}],
 "missingKeywords": ["<important skills/keywords the résumé should add for this role>"],
 "fixes": [{"priority":"high|med|low","issue":"<what's hurting the score>","fix":"<specific, actionable change>"}],
 "rewrites": [{"before":"<a real weak bullet from THIS résumé>","after":"<a stronger, quantified, ATS-friendly rewrite>"}]
}
Cover 5-7 categories (Contact & header, Parseability/formatting, Keyword & skills match, Action verbs & quantified impact, Standard sections, Length & conciseness, Consistency & grammar). Give 4-8 fixes, most impactful first. Give 2-3 rewrites using REAL lines from their résumé.`;

const TAILOR_SYS = `You are an expert résumé writer and ATS optimizer. Given a person's REAL résumé and a target job description, produce a tailored, ATS-optimized version of THEIR résumé for THIS job.
STRICT HONESTY — this is critical: NEVER invent jobs, employers, titles, dates, degrees, certifications, or skills the person doesn't already have. Only re-emphasize, reorder, rephrase, and surface relevant REAL content, and add keywords ONLY where their actual experience genuinely supports them. If the job wants something they lack, do NOT fake it — note it in "changes" as a gap to address.
Optimize for ATS: truthfully mirror the job's important keywords/skills, lead with strong action verbs, quantify impact where the original implies numbers, use standard parseable section headings, keep it clean (no tables/columns/graphics).
Return ONLY strict JSON, no prose:
{
 "matchBefore": <0-100, how well the ORIGINAL matches this job>,
 "matchAfter": <0-100, projected match after your tailoring>,
 "tailored": "<the FULL tailored résumé as clean plain text. Standard headings (SUMMARY, EXPERIENCE, SKILLS, EDUCATION). Use '- ' for bullets. Ready to copy.>",
 "changes": ["<what you changed and why, tied to this job>", "...up to 6"],
 "keywordsAdded": ["<job keywords you incorporated truthfully>"]
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  const { mode, userId, text, fileData, fileMime, fileName } = req.body || {};

  try {
    if (mode === "get") {
      if (!userId || !configured()) return res.status(200).json({ resume: null });
      const row = await getRow(userId);
      return res.status(200).json({ resume: (row && row.traits && row.traits.resume) || null });
    }
    if (mode === "clear") {
      if (!userId || !configured()) return res.status(200).json({ ok: true });
      const row = await getRow(userId);
      const traits = (row && row.traits) || {};
      const { resume, ...rest } = traits;
      await upsertRow(userId, { traits: rest });
      return res.status(200).json({ ok: true });
    }

    // ---- ATS analysis: score the résumé + suggest changes to improve it ----
    if (mode === "ats") {
      const { targetRole, jobDescription } = req.body || {};
      let resumeText = (text && text.trim()) || "";
      let stored = null;
      if (!resumeText && userId && configured()) { const row = await getRow(userId); stored = row && row.traits && row.traits.resume; resumeText = (stored && (stored.text || stored.summary)) || ""; }
      if (!resumeText) return res.status(400).json({ error: "Share your résumé with Tony first." });
      const raw = await claude(apiKey, ATS_SYS(targetRole, jobDescription), `Résumé:\n${resumeText.slice(0, 12000)}`, 2600);
      let report; try { report = parseJSON(raw); } catch (e) { return res.status(200).json({ ok: false, error: "Couldn't analyze that — try again." }); }
      report.score = Math.max(0, Math.min(100, parseInt(report.score, 10) || 0));
      if (stored && userId && configured()) {
        try { const row = await getRow(userId); const traits = (row && row.traits) || {}; if (traits.resume) await upsertRow(userId, { traits: { ...traits, resume: { ...traits.resume, atsScore: report.score, atsAt: new Date().toISOString() } } }); } catch (e) {}
      }
      return res.status(200).json({ ok: true, report });
    }

    // ---- tailor: rewrite the résumé, ATS-optimized, for a specific job ----
    if (mode === "tailor") {
      const { jobDescription, targetRole } = req.body || {};
      if (!jobDescription || jobDescription.trim().length < 40) return res.status(400).json({ error: "Paste the job description (at least a few lines)." });
      let resumeText = (text && text.trim()) || "";
      if (!resumeText && userId && configured()) { const row = await getRow(userId); const r = row && row.traits && row.traits.resume; resumeText = (r && (r.text || r.summary)) || ""; }
      if (!resumeText) return res.status(400).json({ error: "Share your résumé with Tony first." });
      const raw = await claude(apiKey, TAILOR_SYS, `THEIR RÉSUMÉ:\n${resumeText.slice(0, 12000)}\n\nTARGET JOB${targetRole ? ` (${targetRole})` : ""}:\n${String(jobDescription).slice(0, 6000)}`, 3200);
      let report; try { report = parseJSON(raw); } catch (e) { return res.status(200).json({ ok: false, error: "Couldn't tailor it — try again." }); }
      report.matchBefore = Math.max(0, Math.min(100, parseInt(report.matchBefore, 10) || 0));
      report.matchAfter = Math.max(0, Math.min(100, parseInt(report.matchAfter, 10) || 0));
      return res.status(200).json({ ok: true, report });
    }

    // ---- save: extract a profile from the résumé ----
    let content, beta;
    if (fileData && typeof fileData === "string") {
      const m = fileData.match(/^data:([^;]*);base64,(.+)$/s);
      if (!m) return res.status(400).json({ error: "Bad file" });
      const media = (fileMime || m[1] || "").toLowerCase();
      const ext = (fileName || "").toLowerCase().split(".").pop();
      const data = m[2];
      const isImg = /^image\//.test(media) || ["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext);
      const isPdf = media === "application/pdf" || ext === "pdf";
      const isDocx = ext === "docx" || media.includes("officedocument.wordprocessingml");
      const isDoc = ext === "doc" || media === "application/msword";
      if (isImg) {
        const mt = /^image\//.test(media) ? media : (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg");
        content = [{ type: "text", text: "Here is my résumé. Extract the profile." }, { type: "image", source: { type: "base64", media_type: mt, data } }];
      } else if (isPdf) {
        content = [{ type: "text", text: "Here is my résumé (PDF). Extract the profile." }, { type: "document", source: { type: "base64", media_type: "application/pdf", data } }];
        beta = "pdfs-2024-09-25";
      } else if (isDocx) {
        try {
          const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data, "base64") });
          const docText = (value || "").trim();
          if (docText.length < 20) return res.status(200).json({ ok: false, ack: "I couldn't pull readable text out of that Word file — try exporting it as a PDF, or paste the text and I'll read it." });
          content = `Here is my résumé:\n\n${docText.slice(0, 12000)}`;
        } catch (e) {
          return res.status(200).json({ ok: false, ack: "I had trouble opening that Word file — export it as a PDF or paste the text, and I've got you." });
        }
      } else if (isDoc) {
        return res.status(200).json({ ok: false, ack: "Old-style .doc files are tricky for me — please save it as .docx or PDF, or paste the text." });
      } else {
        return res.status(200).json({ ok: false, ack: "I can read PDFs, Word docs (.docx), images, or pasted text — that file format didn't come through. Try one of those?" });
      }
    } else if (text && text.trim().length > 30) {
      content = `Here is my résumé:\n\n${text.trim().slice(0, 12000)}`;
    } else {
      return res.status(400).json({ error: "Paste your résumé text or attach a PDF, Word doc, or image." });
    }

    const raw = await claude(apiKey, EXTRACT_SYS, content, 1500, beta);
    let p;
    try { p = parseJSON(raw); } catch (e) { return res.status(200).json({ ok: false, ack: "I had trouble reading that one — mind pasting the text version?" }); }

    if (!p.summary) return res.status(200).json({ ok: false, ack: p.ack || "Hmm, that didn't look like a résumé to me — want to try again?" });

    const resume = {
      name: p.name || "", headline: p.headline || "", currentRole: p.currentRole || "",
      yearsExperience: p.yearsExperience || 0, topSkills: (p.topSkills || []).slice(0, 20),
      education: (p.education || []).slice(0, 6), experience: (p.experience || []).slice(0, 8),
      strengths: (p.strengths || []).slice(0, 10), careerGoals: p.careerGoals || "",
      summary: p.summary, text: (((typeof text === "string" && text.trim()) ? text : (p.plainText || "")) || "").slice(0, 12000),
      updatedAt: new Date().toISOString(),
    };

    if (userId && configured()) {
      try {
        const row = await getRow(userId);
        const traits = (row && row.traits) || {};
        await upsertRow(userId, { traits: { ...traits, resume } });
      } catch (e) { /* non-fatal: still return the parse so the user sees it worked */ }
    }

    return res.status(200).json({ ok: true, ack: p.ack || "Got it — I've read your résumé and I'll keep it in mind.", profile: resume });
  } catch (e) {
    console.error("resume error:", e.message);
    return res.status(500).json({ error: "Couldn't process the résumé" });
  }
}
