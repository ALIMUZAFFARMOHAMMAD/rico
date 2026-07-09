// Flagship #1 — "Rico texts you first": proactive, memory-grounded check-ins.
//
// When a returning user opens the app, the friend they last talked to greets them
// FIRST, referencing something specific from their shared history. Reactive chatbots
// wait to be spoken to; relationships reach out. This is Rico's core differentiator
// and the strongest retention lever (drives the D7 North Star).
//
// GET /api/checkin?userId=<id>&lang=<code>  ->  { ok, agentId, name, emoji, message, fresh }
import { configured, getUserRows, getRow, upsertRow, metaKey, parseKey } from "../../lib/db";
import { resolveAgent } from "../../lib/twins";
import { languagePrompt, LANGS } from "../../lib/i18n";
import { rateLimited } from "../../lib/ratelimit";

// Regenerate at most ~once per visit/day to keep cost down and the message stable.
const FRESH_WINDOW_MS = 18 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  if (!configured()) return res.status(200).json({ ok: false });

  const { userId, lang } = req.query;
  if (!userId) return res.status(200).json({ ok: false });
  const langCode = LANGS[lang] ? lang : "en";

  try {
    // 1) Serve a cached check-in if it's still fresh (throttle tokens + keep it stable).
    const meta = await getRow(metaKey(userId));
    const cached = meta?.traits?.proactive;
    if (cached?.text && cached.lang === langCode &&
        Date.now() - new Date(cached.at).getTime() < FRESH_WINDOW_MS) {
      return res.status(200).json({ ok: true, ...cached, message: cached.text, fresh: false });
    }

    // 2) Find the agent the user most recently had a real conversation with.
    const rows = await getUserRows(userId);
    const convos = rows
      .map(r => ({ r, k: parseKey(r.user_id) }))
      .filter(({ r, k }) => k.kind !== "meta" && Array.isArray(r.messages) && r.messages.length >= 2)
      .sort((a, b) => new Date(b.r.updated_at) - new Date(a.r.updated_at));
    if (!convos.length) return res.status(200).json({ ok: false });

    const { r: row, k } = convos[0];
    const agent = await resolveAgent(k.agentId);

    // Lapse signal: days since the user last actually had a conversation (not just opened
    // the app — track.js overwrites the open-stamp on load). Drives "Rico missed you".
    const daysAway = row.updated_at ? Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 864e5) : 0;
    const lapsed = daysAway >= 3;

    // 3) Build a compact memory snippet from the recent exchange.
    const recent = (row.messages || []).slice(-8)
      .map(m => `${m.role === "user" ? "Them" : agent.name}: ${String(m.content || "").slice(0, 200)}`)
      .join("\n").slice(0, 1400);

    // 4) Generate the proactive opener — short, warm, specific, in their language.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(200).json({ ok: false });
    const persona = (agent.persona || `You are ${agent.name}, ${agent.archetype || "a warm friend"} at Rico.`).slice(0, 900);
    const system = `${persona}

You are reaching out to your friend FIRST — they just opened the app and you want to check in, the way a real friend texts first. Do NOT wait to be spoken to.
${lapsed ? `IMPORTANT: it has been about ${daysAway} days since you two last talked. Warmly and gently acknowledge that it's been a little while and that you were thinking about them / missed them — never guilt-trip, never scold, never make them feel bad. Then tie it to something specific from your last conversation.` : ""}

${languagePrompt(langCode)}

Write ONE warm, natural opening message (max ~30 words) that:
- references something SPECIFIC and real from your recent conversation below (an event, feeling, plan, or detail they shared),
- sounds like a friend who genuinely remembered and was thinking about them,
- ends with a gentle question that invites them to reply.
No quotation marks. No preamble. Stay fully in your character's voice.

RECENT CONVERSATION (most recent last):
${recent}`;

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 90,
        system,
        messages: [{ role: "user", content: "Send your check-in message now." }],
      }),
    });
    if (!ai.ok) return res.status(200).json({ ok: false });
    const d = await ai.json();
    const message = (d.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "").slice(0, 300);
    if (!message) return res.status(200).json({ ok: false });

    const payload = {
      agentId: k.agentId, name: agent.name, emoji: agent.emoji || "💬",
      text: message, at: new Date().toISOString(), lang: langCode,
      lapsed, daysAway,
    };

    // 5) Cache on the meta row — merge traits so matches/reports columns are untouched.
    try {
      await upsertRow(metaKey(userId), { traits: { ...((meta && meta.traits) || {}), proactive: payload } });
    } catch (e) { /* non-fatal: still return the check-in */ }

    return res.status(200).json({ ok: true, ...payload, message, fresh: true });
  } catch (e) {
    console.error("checkin error:", e.message);
    return res.status(200).json({ ok: false });
  }
}
