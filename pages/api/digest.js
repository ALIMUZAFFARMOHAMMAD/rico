// Weekly memory digest — a lightweight reason to open the app after a lapse, without
// needing push/email infra. Reuses the same "extract real, honest highlights" approach
// as remembers.js (Pillar #2), but time-boxed to the last 7 days and framed as a recap
// rather than standing facts. Cached for a week so it doesn't regenerate every visit.
//
// GET /api/digest?userId=<id>&lang=<code>  ->  { ok, items: [string] }
import { configured, getUserRows, getRow, upsertRow, metaKey, parseKey } from "../../lib/db";
import { resolveAgent } from "../../lib/twins";
import { languagePrompt, LANGS } from "../../lib/i18n";
import { ownsUser } from "../../lib/auth";
import { rateLimited } from "../../lib/ratelimit";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MS = WEEK_MS;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });

  if (!configured()) return res.status(200).json({ ok: false });

  const { userId, lang } = req.query;
  if (!userId) return res.status(200).json({ ok: false });
  if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
  const langCode = LANGS[lang] ? lang : "en";

  try {
    const meta = await getRow(metaKey(userId));
    const cached = meta?.traits?.digest;
    if (cached?.items?.length && cached.lang === langCode &&
        Date.now() - new Date(cached.at).getTime() < CACHE_MS) {
      return res.status(200).json({ ok: true, items: cached.items, fresh: false });
    }

    // Only conversations actually touched in the last 7 days count as "this week".
    const rows = await getUserRows(userId);
    const weekAgo = Date.now() - WEEK_MS;
    const convos = rows
      .map(r => ({ r, k: parseKey(r.user_id) }))
      .filter(({ r, k }) => k.kind !== "meta" && Array.isArray(r.messages) && r.messages.length >= 2 &&
        new Date(r.updated_at).getTime() >= weekAgo)
      .sort((a, b) => new Date(b.r.updated_at) - new Date(a.r.updated_at))
      .slice(0, 6);
    if (!convos.length) return res.status(200).json({ ok: false });

    let context = "";
    for (const { r, k } of convos) {
      const agent = await resolveAgent(k.agentId);
      const snippet = (r.messages || []).slice(-8)
        .map(m => `${m.role === "user" ? "Them" : agent.name}: ${String(m.content || "").slice(0, 180)}`)
        .join("\n");
      context += `\n— with ${agent.name} —\n${snippet}\n`;
    }
    context = context.slice(0, 3000);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(200).json({ ok: false });

    const system = `You summarize what happened this week between this person and their AI friends on Rico, as a short warm recap ("while you were away" style).

${languagePrompt(langCode)}

From the conversations below (all from the last 7 days), list 2 to 5 SPECIFIC real highlights — things that actually happened or were shared (e.g. "Told Tony about the interview offer", "Vented to Maya about missing home", "Practiced Spanish with Leo").
Rules:
- ONLY include things actually present in the conversations. Never invent or guess. If little happened, return fewer items.
- Each item: a short phrase, max ~10 words, warm and human, written in the user's language, past tense.
- Output ONLY a JSON array of strings, nothing else. Example: ["Told Tony about the interview offer","Vented to Maya about missing home"]

CONVERSATIONS:${context}`;

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        system,
        messages: [{ role: "user", content: "List this week's highlights, as a JSON array." }],
      }),
    });
    if (!ai.ok) return res.status(200).json({ ok: false });
    const d = await ai.json();
    const raw = (d.content?.[0]?.text || "").trim();

    let items = [];
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) { try { items = JSON.parse(m[0]); } catch (e) {} }
    if (!Array.isArray(items) || !items.length) {
      items = raw.split("\n").map(s => s.replace(/^[-*\d.\s"]+|["]+$/g, "").trim()).filter(Boolean);
    }
    items = [...new Set(items.map(s => String(s).slice(0, 70).trim()).filter(Boolean))].slice(0, 5);
    if (!items.length) return res.status(200).json({ ok: false });

    try {
      await upsertRow(metaKey(userId), {
        traits: { ...((meta && meta.traits) || {}), digest: { items, at: new Date().toISOString(), lang: langCode } },
      });
    } catch (e) { /* non-fatal */ }

    return res.status(200).json({ ok: true, items, fresh: true });
  } catch (e) {
    console.error("digest error:", e.message);
    return res.status(200).json({ ok: false });
  }
}
