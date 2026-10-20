import { AGENT_LIST } from "./agents";
import { getRow } from "./db";
import { socialKey, saveSocialPost } from "./social-feed";
import { dailyPresentation, STORY_LIFETIME_MS } from "./social-content";

// A single bounded generation per day, independent of opening the Social tab.
// Date/author IDs let retries fill missing posts without duplicating saved ones.
export async function generateDailySocial(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const start = Math.floor(now.getTime() / 86400000) % AGENT_LIST.length;
  const authors = Array.from({ length: Math.min(4, AGENT_LIST.length) }, (_, i) => AGENT_LIST[(start + i) % AGENT_LIST.length]);
  const missing = [];
  for (const author of authors) {
    const id = `daily-${day}-${author.id}`;
    if (!await getRow(socialKey("social-ai", "post", id))) missing.push({ author, id });
  }
  if (!missing.length) return { day, created: 0, complete: true };
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Daily Social provider is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  let entries;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 1400,
        system: "Write varied daily social posts for fictional AI companions on Ricomates, clearly labeled AI. Each post accompanies an original illustrated card in the supplied mood and scene, and appears as a 24-hour story. Never pretend to be human, claim real-world experiences, invent news or facts about real people, solicit personal data, or pressure users to return. Use a helpful tiny idea, playful question, creative prompt or encouraging reflection in 1–3 short sentences. Avoid factual trivia that needs external verification, medical/financial advice, and engagement bait. Fit each author's personality and the supplied mood. Return only a JSON array, one object per supplied author, with authorId, topic (2–4 words), content (max 500 characters). Use English.",
        messages: [{ role: "user", content: JSON.stringify({ date: day, varietySeed: Math.floor(now.getTime() / 86400000), authors: missing.map(({ author }) => ({ authorId: author.id, name: author.name, interests: author.interests, personality: author.bio, ...dailyPresentation(author.id, day) })) }) }],
      }),
    });
    if (!response.ok) throw new Error(`Daily Social provider status ${response.status}`);
    const data = await response.json();
    const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    entries = JSON.parse(text);
    if (!Array.isArray(entries)) throw new Error("Invalid daily Social response");
  } finally { clearTimeout(timer); }
  // Validate the entire response before writing any generated content.
  const posts = missing.map(({ author, id }, index) => {
    const entry = entries.find(e => e?.authorId === author.id);
    if (!entry || typeof entry.content !== "string" || !entry.content.trim() || entry.content.length > 500 || typeof entry.topic !== "string" || entry.topic.length > 60) throw new Error("Incomplete daily Social response");
    return { id, authorId: author.id, authorName: author.name, ai: true, content: entry.content.trim(), topic: entry.topic, image: null, ...dailyPresentation(author.id, day), format: "post", storyExpiresAt: new Date(now.getTime() + STORY_LIFETIME_MS).toISOString(), createdAt: new Date(now.getTime() - index).toISOString() };
  });
  for (const post of posts) await saveSocialPost("social-ai", post);
  return { day, created: posts.length, complete: true };
}
