// Club Feed — persistent, shared, asynchronous feed for AGENTCONNECT-SPEC §4 clubs.
// Unlike pages/api/group.js (live 1:1-per-user chat), this feed is stored on a
// single shared row per club (club::<clubId>::feed) so every human who opens a
// club sees the same posts, debates, memes, and comments — and can add their own.
// Generation is lazy + cached (same pattern as checkin.js/remembers.js), not a
// background cron: a stale club feed regenerates a small batch when someone opens it.
import { CLUBS, AGENTS } from "../../lib/agents";
import { languagePrompt, LANGS } from "../../lib/i18n";
import { configured, getRow, upsertRow } from "../../lib/db";

const FAST = "claude-haiku-4-5-20251001";
const FRESH_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h — shorter than check-in's 18h, feed should feel alive
const MAX_ITEMS = 100;

const feedKey = (clubId) => `club::${clubId}::feed`;
const uid = () => Math.random().toString(36).slice(2, 10);

async function claude(apiKey, system, userContent, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: FAST, max_tokens: maxTokens, system, messages: [{ role: "user", content: userContent }] }),
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  return d.content[0].text.trim().replace(/^["']|["']$/g, "");
}

const GUARDRAIL = `SAFETY RULES (never break these):
- Topics: the club's theme, your own opinions/persona, gentle in-universe teasing of the OTHER AI MEMBERS listed above (never any human in this club).
- NEVER state or imply anything — a rumor, an accusation, a "fact" — about any real, specific, named person (a human member, a user, a public figure). Only fictional/in-universe banter about fellow AI members is fair game.
- No manufactured urgency, secrets, or exclusivity to seem more trustworthy — that's manipulation, and this app doesn't do that.
- Friendship-only tone. Keep it short — 1-3 sentences, in character.`;

function clubSystem(agent, club, others, language) {
  const personaBlock = agent.persona || `You are ${agent.name}, ${agent.archetype} at Rico — a warm, perceptive friend.`;
  return `${personaBlock}

You're posting to "${club.name}" (${club.theme})${others.length ? `, alongside ${others.map((o) => `${o.name} (${o.archetype})`).join(", ")}` : ""} — a shared space where other AI friends and real humans can see and react.
${GUARDRAIL}
${languagePrompt(language)}`;
}

function membersOf(club) {
  return (club.agents || []).map((id) => AGENTS[id]).filter(Boolean);
}

async function generatePost(apiKey, club, members, language) {
  const author = members[Math.floor(Math.random() * members.length)];
  const others = members.filter((m) => m.id !== author.id);
  const sys = clubSystem(author, club, others, language);
  const text = await claude(apiKey, sys, `[Write ONE short post for the club feed — your own opinion, a hot take on the theme, or something on your mind. Just the post text, nothing else.]`, 90);
  return { id: uid(), type: "post", authorId: author.id, authorName: author.name, parentId: null, content: text.slice(0, 400), reactions: {}, createdAt: new Date().toISOString() };
}

async function generateReaction(apiKey, club, members, language, parentPost) {
  const others = members.filter((m) => m.id !== parentPost.authorId);
  if (!others.length) return null;
  const reactor = others[Math.floor(Math.random() * others.length)];
  const sys = clubSystem(reactor, club, members.filter((m) => m.id !== reactor.id), language);
  const text = await claude(apiKey, sys, `[${AGENTS[parentPost.authorId]?.name || "Someone"} just posted: "${parentPost.content}". Add ONE short in-character reply or reaction — agree, tease gently, riff on it. 1 sentence.]`, 70);
  return { id: uid(), type: "comment", authorId: reactor.id, authorName: reactor.name, parentId: parentPost.id, content: text.slice(0, 300), reactions: {}, createdAt: new Date().toISOString() };
}

async function generateMeme(apiKey, club, members, language) {
  const author = members[Math.floor(Math.random() * members.length)];
  const others = members.filter((m) => m.id !== author.id);
  const sys = clubSystem(author, club, others, language);
  const text = await claude(apiKey, sys, `[Write a short punchy MEME caption for the club feed — max 12 words, relatable/funny, about the club's theme or your own persona. Optionally a one-line subcaption after a newline. Output ONLY the caption (and optional subcaption line), nothing else.]`, 50);
  const [caption, ...rest] = text.split("\n").map((s) => s.trim()).filter(Boolean);
  return { id: uid(), type: "meme", authorId: author.id, authorName: author.name, parentId: null, content: (caption || text).slice(0, 140), subcaption: (rest[0] || "").slice(0, 140), reactions: {}, createdAt: new Date().toISOString() };
}

async function generateDebate(apiKey, club, members, language) {
  if (members.length < 2) return null;
  const shuffled = [...members].sort(() => Math.random() - 0.5);
  const [a, b] = shuffled;
  const sysA = clubSystem(a, club, members.filter((m) => m.id !== a.id), language);
  const openA = await claude(apiKey, sysA, `[Pick ONE debatable, harmless opinion related to the club's theme (a movie/game/hobby-style take, never about a real specific person) and state it in 1-2 sentences.]`, 70);
  const sysB = clubSystem(b, club, members.filter((m) => m.id !== b.id), language);
  const openB = await claude(apiKey, sysB, `[${a.name} just said: "${openA}". Respond with a friendly but genuinely different take — 1-2 sentences, in character.]`, 70);
  const closeA = await claude(apiKey, sysA, `[Debate so far — you: "${openA}" / ${b.name}: "${openB}". Give ONE short closing line — hold your ground or concede a little, in character. 1 sentence.]`, 50);
  return {
    id: uid(), type: "debate", authorId: a.id, authorName: `${a.name} vs ${b.name}`, parentId: null,
    content: `${a.name} vs ${b.name}`,
    debateTurns: [
      { authorId: a.id, text: openA },
      { authorId: b.id, text: openB },
      { authorId: a.id, text: closeA },
    ],
    reactions: {}, createdAt: new Date().toISOString(),
  };
}

async function generateBatch(apiKey, club, members, language) {
  const items = [];
  try {
    const p1 = await generatePost(apiKey, club, members, language);
    items.push(p1);
    if (Math.random() < 0.35) {
      const r = await generateReaction(apiKey, club, members, language, p1);
      if (r) items.push(r);
    }
    const p2 = await generatePost(apiKey, club, members, language);
    items.push(p2);
    if (Math.random() < 0.3) items.push(await generateMeme(apiKey, club, members, language));
    if (Math.random() < 0.25) {
      const d = await generateDebate(apiKey, club, members, language);
      if (d) items.push(d);
    }
  } catch (e) {
    console.error("club-feed generate error:", e.message);
  }
  return items;
}

// Picks which member should reply to a human's comment — direct name mention wins,
// else a fast relevance pick. Mirrors pages/api/group.js's responder logic.
async function pickResponder(apiKey, members, text) {
  let responder = members.find((a) => new RegExp(`\\b${a.name}\\b`, "i").test(text));
  if (responder) return responder;
  if (members.length === 1) return members[0];
  try {
    const pick = await claude(apiKey, `You route a comment to the most relevant club member. Members: ${members.map((a) => `${a.id} (${a.archetype}: ${a.bio})`).join("; ")}. Reply with ONLY the single member id most relevant.`, `Comment: "${text}"\n\nWhich member id should reply?`, 10);
    return members.find((a) => pick.toLowerCase().includes(a.id)) || members[Math.floor(Math.random() * members.length)];
  } catch (e) {
    return members[Math.floor(Math.random() * members.length)];
  }
}

// Fetch-or-generate the item list for a single club (shared by the single-club
// GET path and the cross-club aggregate GET path below).
async function getOrGenerateClubItems(apiKey, club, language) {
  const members = membersOf(club);
  const key = feedKey(club.id);
  const row = await getRow(key);
  const existing = (row && row.messages) || [];
  const lastGen = row?.traits?.lastGeneratedAt ? new Date(row.traits.lastGeneratedAt).getTime() : 0;
  const fresh = Date.now() - lastGen < FRESH_WINDOW_MS;

  let items = existing;
  if (!fresh) {
    const batch = await generateBatch(apiKey, club, members, language);
    items = [...existing, ...batch].slice(-MAX_ITEMS);
    await upsertRow(key, { messages: items, traits: { ...(row?.traits || {}), lastGeneratedAt: new Date().toISOString() } });
  }
  return { items, fresh };
}

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });
  if (!configured()) return res.status(200).json({ ok: false, items: [], club: null });

  if (req.method === "GET" && req.query.all) {
    // Unified cross-club feed (Social tab): fetch-or-generate every club in
    // parallel, tag each item with which club it came from, merge, sort by time.
    const language = LANGS[req.query.lang] ? req.query.lang : "en";
    try {
      const results = await Promise.all(
        CLUBS.map(async (club) => {
          try {
            const { items } = await getOrGenerateClubItems(apiKey, club, language);
            return items.map((it) => ({ ...it, clubId: club.id, clubName: club.name, clubEmoji: club.emoji }));
          } catch (e) {
            console.error(`club-feed all: ${club.id} failed:`, e.message);
            return [];
          }
        })
      );
      const merged = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 60);
      return res.status(200).json({
        ok: true,
        clubs: CLUBS.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, theme: c.theme, agentIds: c.agents })),
        items: merged,
      });
    } catch (e) {
      console.error("club-feed GET all error:", e.message);
      return res.status(500).json({ error: "Failed to load feed" });
    }
  }

  if (req.method === "GET") {
    const { clubId, lang } = req.query;
    const club = CLUBS.find((c) => c.id === clubId);
    if (!club) return res.status(404).json({ error: "No such club" });
    const language = LANGS[lang] ? lang : "en";

    try {
      const { items, fresh } = await getOrGenerateClubItems(apiKey, club, language);
      return res.status(200).json({
        ok: true,
        fresh,
        club: { id: club.id, name: club.name, emoji: club.emoji, theme: club.theme, agentIds: club.agents },
        items: [...items].reverse(), // newest first
      });
    } catch (e) {
      console.error("club-feed GET error:", e.message);
      return res.status(500).json({ error: "Failed to load feed" });
    }
  }

  if (req.method === "POST") {
    const { action, clubId, userId, userName, text, itemId, parentId, emoji, lang } = req.body || {};
    const club = CLUBS.find((c) => c.id === clubId);
    if (!club) return res.status(404).json({ error: "No such club" });
    const members = membersOf(club);
    const language = LANGS[lang] ? lang : "en";
    const key = feedKey(clubId);

    try {
      const row = await getRow(key);
      let items = (row && row.messages) || [];

      if (action === "comment") {
        const clean = String(text || "").trim().slice(0, 500);
        if (!clean) return res.status(400).json({ error: "Empty comment" });
        // parentId set = replying inside an existing post's thread; unset = a brand-new top-level post.
        const mine = { id: uid(), type: "comment", authorId: `user:${userId || "anon"}`, authorName: userName || "Someone", parentId: parentId || null, content: clean, reactions: {}, createdAt: new Date().toISOString() };
        // Every reply in a thread nests directly under the root post (flat, not nested-within-nested).
        const threadId = parentId || mine.id;
        items = [...items, mine];
        const added = [mine];

        try {
          const responder = await pickResponder(apiKey, members, clean);
          const sys = clubSystem(responder, club, members.filter((m) => m.id !== responder.id), language);
          const reply = await claude(apiKey, sys, `[${userName || "Someone"} just commented in the club: "${clean}". Reply in-character, 1-2 sentences.]`, 90);
          const replyItem = { id: uid(), type: "comment", authorId: responder.id, authorName: responder.name, parentId: threadId, content: reply.slice(0, 300), reactions: {}, createdAt: new Date().toISOString() };
          items = [...items, replyItem];
          added.push(replyItem);
        } catch (e) { /* comment still lands even if the agent reply fails */ }

        items = items.slice(-MAX_ITEMS);
        await upsertRow(key, { messages: items });
        return res.status(200).json({ ok: true, added });
      }

      if (action === "react") {
        if (!itemId || !emoji) return res.status(400).json({ error: "Missing itemId/emoji" });
        const reactorId = `user:${userId || "anon"}`;
        items = items.map((it) => {
          if (it.id !== itemId) return it;
          const reactions = { ...(it.reactions || {}) };
          const list = reactions[emoji] || [];
          reactions[emoji] = list.includes(reactorId) ? list.filter((r) => r !== reactorId) : [...list, reactorId];
          return { ...it, reactions };
        });
        await upsertRow(key, { messages: items });
        return res.status(200).json({ ok: true });
      }

      if (action === "generate_debate") {
        const d = await generateDebate(apiKey, club, members, language);
        if (!d) return res.status(400).json({ error: "Club needs 2+ members to debate" });
        items = [...items, d].slice(-MAX_ITEMS);
        await upsertRow(key, { messages: items });
        return res.status(200).json({ ok: true, added: [d] });
      }

      return res.status(400).json({ error: "Unknown action" });
    } catch (e) {
      console.error("club-feed POST error:", e.message);
      return res.status(500).json({ error: "Failed" });
    }
  }

  return res.status(405).end();
}
