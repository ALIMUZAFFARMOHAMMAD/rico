// Club Feed / Character Profiles — persistent, shared, asynchronous social content
// (AGENTCONNECT-SPEC §4, extended). Two kinds of "space" share the same storage,
// generation, and API shape:
//   - a declared CLUB (e.g. "movie-club"): 2 agents co-post/react/debate together.
//   - an individual character PROFILE ("profile-<agentId>"): each of the ~12 Rico
//     characters has their OWN feed, posting in their own voice/interests — any
//     OTHER character in the whole roster can react/comment/debate on it, so it
//     feels like one shared platform (Instagram-style: everyone has an account,
//     everyone can interact with everyone), not siloed 2-person hangouts.
// Unlike pages/api/group.js (live 1:1-per-user chat), this is stored on a single
// shared row per space (club::<spaceId>::feed) so every human who opens it sees
// the same posts/debates/memes/comments — and can add their own. Generation is
// lazy + cached (same pattern as checkin.js/remembers.js): on-demand when a space
// goes stale, not a background cron — keeps this free when nobody's looking.
import { randomUUID } from "crypto";
import { CLUBS, AGENTS, AGENT_LIST } from "../../lib/agents";
import { languagePrompt, LANGS } from "../../lib/i18n";
import { configured, getRow, upsertRow } from "../../lib/db";

const FAST = "claude-haiku-4-5-20251001";
const FRESH_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h — shorter than check-in's 18h, feed should feel alive
const MAX_ITEMS = 100;

const feedKey = (spaceId) => `club::${spaceId}::feed`;
const uid = () => randomUUID();

async function claude(apiKey, system, userContent, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: FAST, max_tokens: maxTokens, system, messages: [{ role: "user", content: userContent }] }),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  return d.content[0].text.trim().replace(/^["']|["']$/g, "");
}

const GUARDRAIL = `SAFETY RULES (never break these):
- Topics: your own opinions/persona/interests, gentle in-universe teasing of OTHER AI FRIENDS (never any human).
- NEVER state or imply anything — a rumor, an accusation, a "fact" — about any real, specific, named person (a human, a user, a public figure). Only fictional/in-universe banter about fellow AI friends is fair game.
- No manufactured urgency, secrets, or exclusivity to seem more trustworthy — that's manipulation, and this app doesn't do that.
- Friendship-only tone. Keep it short — 1-3 sentences, in character.`;

function spaceSystem(agent, space, others, language) {
  const personaBlock = agent.persona || `You are ${agent.name}, ${agent.archetype} at Rico — a warm, perceptive friend.`;
  return `${personaBlock}

You're posting to "${space.name}" (${space.theme})${others.length ? `, alongside ${others.map((o) => `${o.name} (${o.archetype})`).join(", ")}` : ""} — a shared space where other AI friends and real humans can see and react.
${GUARDRAIL}
${languagePrompt(language)}`;
}

function membersOf(club) {
  return (club.agents || []).map((id) => AGENTS[id]).filter(Boolean);
}

// Resolves a spaceId into { space, members, reactorPool, responderPool }:
//   - a real club: members === reactorPool === responderPool (the club's own roster).
//   - "profile-<agentId>": members = [that one character] (they're the only author);
//     reactorPool = every OTHER character (anyone can react/debate on their post);
//     responderPool = the whole roster (anyone, including the owner, may reply to a comment).
function resolveSpace(spaceId) {
  const club = CLUBS.find((c) => c.id === spaceId);
  if (club) {
    const members = membersOf(club);
    return { space: club, members, reactorPool: members, responderPool: members };
  }
  if (spaceId && spaceId.startsWith("profile-")) {
    const agentId = spaceId.slice("profile-".length);
    const agent = AGENTS[agentId];
    if (!agent) return null;
    const space = { id: spaceId, name: agent.name, emoji: agent.emoji, theme: (agent.interests || []).join(", ") || agent.bio, agents: [agentId] };
    return { space, members: [agent], reactorPool: AGENT_LIST.filter((a) => a.id !== agentId), responderPool: AGENT_LIST };
  }
  return null;
}

async function generatePost(apiKey, space, members, language) {
  const author = members[Math.floor(Math.random() * members.length)];
  const others = members.filter((m) => m.id !== author.id);
  const sys = spaceSystem(author, space, others, language);
  const text = await claude(apiKey, sys, `[Write ONE short post for your feed — your own opinion, a hot take related to your interests, or something on your mind. Just the post text, nothing else.]`, 90);
  return { id: uid(), type: "post", authorId: author.id, authorName: author.name, parentId: null, content: text.slice(0, 400), reactions: {}, createdAt: new Date().toISOString() };
}

async function generateReaction(apiKey, space, reactorPool, language, parentPost) {
  const others = reactorPool.filter((m) => m.id !== parentPost.authorId);
  if (!others.length) return null;
  const reactor = others[Math.floor(Math.random() * others.length)];
  const sys = spaceSystem(reactor, space, others.filter((m) => m.id !== reactor.id), language);
  const text = await claude(apiKey, sys, `[${AGENTS[parentPost.authorId]?.name || "Someone"} just posted: "${parentPost.content}". Add ONE short in-character reply or reaction — agree, tease gently, riff on it. 1 sentence.]`, 70);
  return { id: uid(), type: "comment", authorId: reactor.id, authorName: reactor.name, parentId: parentPost.id, content: text.slice(0, 300), reactions: {}, createdAt: new Date().toISOString() };
}

async function generateMeme(apiKey, space, members, language) {
  const author = members[Math.floor(Math.random() * members.length)];
  const others = members.filter((m) => m.id !== author.id);
  const sys = spaceSystem(author, space, others, language);
  const text = await claude(apiKey, sys, `[Write a short punchy MEME caption for your feed — max 12 words, relatable/funny, about your interests or your own persona. Optionally a one-line subcaption after a newline. Output ONLY the caption (and optional subcaption line), nothing else.]`, 50);
  const [caption, ...rest] = text.split("\n").map((s) => s.trim()).filter(Boolean);
  return { id: uid(), type: "meme", authorId: author.id, authorName: author.name, parentId: null, content: (caption || text).slice(0, 140), subcaption: (rest[0] || "").slice(0, 140), reactions: {}, createdAt: new Date().toISOString() };
}

async function generateDebate(apiKey, space, reactorPool, language, fixedAuthor) {
  const pool = fixedAuthor ? [fixedAuthor, ...reactorPool.filter((m) => m.id !== fixedAuthor.id)] : reactorPool;
  if (pool.length < 2) return null;
  const a = fixedAuthor || pool[Math.floor(Math.random() * pool.length)];
  const b = pool.filter((m) => m.id !== a.id)[Math.floor(Math.random() * (pool.length - 1))];
  const sysA = spaceSystem(a, space, pool.filter((m) => m.id !== a.id), language);
  const openA = await claude(apiKey, sysA, `[Pick ONE debatable, harmless opinion related to your interests (a movie/game/hobby-style take, never about a real specific person) and state it in 1-2 sentences.]`, 70);
  const sysB = spaceSystem(b, space, pool.filter((m) => m.id !== b.id), language);
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

async function generateBatch(apiKey, space, members, reactorPool, language) {
  const items = [];
  try {
    const p1 = await generatePost(apiKey, space, members, language);
    items.push(p1);
    if (Math.random() < 0.35) {
      const r = await generateReaction(apiKey, space, reactorPool, language, p1);
      if (r) items.push(r);
    }
    const p2 = await generatePost(apiKey, space, members, language);
    items.push(p2);
    if (Math.random() < 0.3) items.push(await generateMeme(apiKey, space, members, language));
    if (Math.random() < 0.25) {
      // For a profile (members.length === 1), the owner is one side of the debate;
      // for a real club, any two members from the reactor pool debate each other.
      const d = await generateDebate(apiKey, space, reactorPool, language, members.length === 1 ? members[0] : null);
      if (d) items.push(d);
    }
  } catch (e) {
    console.error("club-feed generate error:", e.message);
  }
  return items;
}

// Picks who should reply to a human's comment — direct name mention wins, else a
// fast relevance pick. Mirrors pages/api/group.js's responder logic.
async function pickResponder(apiKey, pool, text) {
  let responder = pool.find((a) => new RegExp(`\\b${a.name}\\b`, "i").test(text));
  if (responder) return responder;
  if (pool.length === 1) return pool[0];
  try {
    const pick = await claude(apiKey, `You route a comment to the most relevant person. People: ${pool.map((a) => `${a.id} (${a.archetype}: ${a.bio})`).join("; ")}. Reply with ONLY the single person's id most relevant.`, `Comment: "${text}"\n\nWhich id should reply?`, 10);
    return pool.find((a) => pick.toLowerCase().includes(a.id)) || pool[Math.floor(Math.random() * pool.length)];
  } catch (e) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// Fetch-or-generate the item list for a single space (shared by the single-space
// GET path and the unified-feed aggregate GET path below).
async function getOrGenerateSpaceItems(apiKey, resolved, language) {
  const { space, members, reactorPool } = resolved;
  const key = feedKey(space.id);
  const row = await getRow(key);
  const existing = (row && row.messages) || [];
  const lastGen = row?.traits?.lastGeneratedAt ? new Date(row.traits.lastGeneratedAt).getTime() : 0;
  const fresh = Date.now() - lastGen < FRESH_WINDOW_MS;

  let items = existing;
  if (!fresh) {
    const batch = await generateBatch(apiKey, space, members, reactorPool, language);
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
    // Unified Social feed: every character's own profile, fetch-or-generated in
    // parallel, tagged with who posted it, merged + sorted by time.
    const language = LANGS[req.query.lang] ? req.query.lang : "en";
    try {
      const results = await Promise.all(
        AGENT_LIST.map(async (agent) => {
          const resolved = resolveSpace(`profile-${agent.id}`);
          if (!resolved) return [];
          try {
            const { items } = await getOrGenerateSpaceItems(apiKey, resolved, language);
            return items.map((it) => ({ ...it, clubId: resolved.space.id, clubName: agent.archetype, clubEmoji: agent.emoji }));
          } catch (e) {
            console.error(`club-feed all: profile-${agent.id} failed:`, e.message);
            return [];
          }
        })
      );
      const merged = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 60);
      return res.status(200).json({
        ok: true,
        profiles: AGENT_LIST.map((a) => ({ id: `profile-${a.id}`, name: a.name, emoji: a.emoji, archetype: a.archetype })),
        items: merged,
      });
    } catch (e) {
      console.error("club-feed GET all error:", e.message);
      return res.status(500).json({ error: "Failed to load feed" });
    }
  }

  if (req.method === "GET" && req.query.peek) {
    // Cheap activity check for the Groups list nudge — reads the cached row only,
    // never calls generateBatch, so browsing the list never spends an LLM call.
    const resolved = resolveSpace(req.query.clubId);
    if (!resolved) return res.status(404).json({ error: "No such club" });
    const row = await getRow(feedKey(resolved.space.id));
    const items = (row && row.messages) || [];
    const latest = items.length ? items[items.length - 1].createdAt : null;
    return res.status(200).json({ ok: true, count: items.length, latest });
  }

  if (req.method === "GET") {
    const { clubId, lang } = req.query;
    const resolved = resolveSpace(clubId);
    if (!resolved) return res.status(404).json({ error: "No such club" });
    const language = LANGS[lang] ? lang : "en";

    try {
      const { items, fresh } = await getOrGenerateSpaceItems(apiKey, resolved, language);
      return res.status(200).json({
        ok: true,
        fresh,
        club: { id: resolved.space.id, name: resolved.space.name, emoji: resolved.space.emoji, theme: resolved.space.theme, agentIds: resolved.space.agents },
        items: [...items].reverse(), // newest first
      });
    } catch (e) {
      console.error("club-feed GET error:", e.message);
      return res.status(500).json({ error: "Failed to load feed" });
    }
  }

  if (req.method === "POST") {
    const { action, clubId, userId, userName, text, itemId, parentId, emoji, lang } = req.body || {};
    const resolved = resolveSpace(clubId);
    if (!resolved) return res.status(404).json({ error: "No such club" });
    const { space, reactorPool, responderPool } = resolved;
    const language = LANGS[lang] ? lang : "en";
    const key = feedKey(space.id);

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
          const responder = await pickResponder(apiKey, responderPool, clean);
          const sys = spaceSystem(responder, space, responderPool.filter((m) => m.id !== responder.id), language);
          const reply = await claude(apiKey, sys, `[${userName || "Someone"} just commented: "${clean}". Reply in-character, 1-2 sentences.]`, 90);
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
        const fixedAuthor = resolved.members.length === 1 ? resolved.members[0] : null;
        const d = await generateDebate(apiKey, space, reactorPool, language, fixedAuthor);
        if (!d) return res.status(400).json({ error: "Needs 2+ people to debate" });
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
