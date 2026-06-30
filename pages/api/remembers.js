// Living-memory moat, made visible — "What your friends remember about you".
//
// Pillar #2 of the product bet: the longer you use Rico, the more it knows you, and
// the higher the switching cost. This surfaces concrete, real things Rico remembers
// across all your friends so the relationship feels tangible (a strong demo moment).
// Honest by design: only surfaces details actually present in your conversations.
//
// GET /api/remembers?userId=<id>&lang=<code>  ->  { ok, items: [string] }
import { configured, getUserRows, getRow, upsertRow, metaKey, parseKey } from "../../lib/db";
import { resolveAgent } from "../../lib/twins";
import { languagePrompt, LANGS } from "../../lib/i18n";

const FRESH_WINDOW_MS = 18 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!configured()) return res.status(200).json({ ok: false });

  const { userId, lang } = req.query;
  if (!userId) return res.status(200).json({ ok: false });
  const langCode = LANGS[lang] ? lang : "en";

  try {
    // 1) Serve cached highlights if still fresh.
    const meta = await getRow(metaKey(userId));
    const cached = meta?.traits?.remembers;
    if (cached?.items?.length && cached.lang === langCode &&
        Date.now() - new Date(cached.at).getTime() < FRESH_WINDOW_MS) {
      return res.status(200).json({ ok: true, items: cached.items, fresh: false });
    }

    // 2) Gather context across every friend the user has talked to.
    const rows = await getUserRows(userId);
    const convos = rows
      .map(r => ({ r, k: parseKey(r.user_id) }))
      .filter(({ r, k }) => k.kind !== "meta" && Array.isArray(r.messages) && r.messages.length >= 2)
      .sort((a, b) => new Date(b.r.updated_at) - new Date(a.r.updated_at))
      .slice(0, 6);
    if (!convos.length) return res.status(200).json({ ok: false });

    let context = "";
    for (const { r, k } of convos) {
      const agent = await resolveAgent(k.agentId);
      const snippet = (r.messages || []).slice(-6)
        .map(m => `${m.role === "user" ? "Them" : agent.name}: ${String(m.content || "").slice(0, 180)}`)
        .join("\n");
      context += `\n— with ${agent.name} —\n${snippet}\n`;
      // include résumé headline if Tony has it
      const hl = r.traits?.resume?.headline || r.traits?.resume?.currentRole;
      if (hl) context += `(${agent.name} knows their résumé: ${String(hl).slice(0, 120)})\n`;
    }
    context = context.slice(0, 2800);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(200).json({ ok: false });

    const system = `You extract what Rico's AI friends genuinely know about this user, to show them warmly that they're remembered.

${languagePrompt(langCode)}

From the conversations below, list 3 to 6 SPECIFIC, real things Rico remembers about this person — concrete facts, plans, situations, preferences, or feelings they actually shared (e.g. "Preparing for the GRE in August", "Misses home and family", "Supports Arsenal", "Wants a product role").
Rules:
- ONLY include things actually present in the conversations. Never invent or guess. If little is known, return fewer items.
- Each item: a short phrase, max ~8 words, warm and human, written in the user's language.
- Output ONLY a JSON array of strings, nothing else. Example: ["Preparing for the GRE","Misses family back home"]

CONVERSATIONS:${context}`;

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        system,
        messages: [{ role: "user", content: "List what Rico remembers, as a JSON array." }],
      }),
    });
    if (!ai.ok) return res.status(200).json({ ok: false });
    const d = await ai.json();
    const raw = (d.content?.[0]?.text || "").trim();

    // Robust parse: pull the first [...] block, else split lines.
    let items = [];
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) { try { items = JSON.parse(m[0]); } catch (e) {} }
    if (!Array.isArray(items) || !items.length) {
      items = raw.split("\n").map(s => s.replace(/^[-*\d.\s"]+|["]+$/g, "").trim()).filter(Boolean);
    }
    items = [...new Set(items.map(s => String(s).slice(0, 60).trim()).filter(Boolean))].slice(0, 6);
    if (!items.length) return res.status(200).json({ ok: false });

    // 3) Cache on the meta row (merge traits so other meta data is untouched).
    try {
      await upsertRow(metaKey(userId), {
        traits: { ...((meta && meta.traits) || {}), remembers: { items, at: new Date().toISOString(), lang: langCode } },
      });
    } catch (e) { /* non-fatal */ }

    return res.status(200).json({ ok: true, items, fresh: true });
  } catch (e) {
    console.error("remembers error:", e.message);
    return res.status(200).json({ ok: false });
  }
}
