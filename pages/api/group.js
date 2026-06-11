// Group chat orchestrator (AGENTCONNECT-SPEC §4).
// Turn policy: directly-addressed agent replies; otherwise a fast model picks the most
// relevant member. ~35% of the time a second agent adds a short reaction. Agents never
// all reply at once — that's the spam-prevention + cost cap.
import { AGENTS } from "../../lib/agents";
import { languagePrompt, LANGS } from "../../lib/i18n";

const FAST = "claude-haiku-4-5-20251001";

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

const personaOf = (a) => a.persona || "You are Tony, a warm, perceptive career-mentor friend at hitony.ai. You ask the question people are avoiding and give honest, specific advice.";

const GROUP_SYSTEM = (agent, groupName, others, userName, language) => `${personaOf(agent)}

You are in a GROUP CHAT called "${groupName}" with ${others.map(o => o.name + " (" + o.archetype + ")").join(", ")} and ${userName || "the user"}.
GROUP RULES:
- Reply in 1-2 short sentences, like a real group chat — punchy, in character
- Speak ONLY as ${agent.name}. NEVER write messages for the others.
- You can reference what other members said, agree, tease them gently (situations only, never the user)
- FRIENDSHIP ONLY — platonic, always
- If the user sounds down: drop all banter, be present
${languagePrompt(language)}`;

const transcript = (messages, userName) =>
  messages.slice(-14).map(m => `${m.from === "user" ? (userName || "User") : (AGENTS[m.from]?.name || m.from)}: ${m.text}`).join("\n");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  const { mode, groupName, agents: agentIds, messages, userName, language, theme } = req.body || {};
  const lang = LANGS[language] ? language : "en";
  const members = (agentIds || []).filter(id => AGENTS[id]).map(id => AGENTS[id]).slice(0, 4);
  if (members.length < 1) return res.status(400).json({ error: "No valid agents" });

  try {
    if (mode === "kickoff") {
      const host = members[0];
      const sys = GROUP_SYSTEM(host, groupName, members.filter(m => m.id !== host.id), userName, lang);
      const text = await claude(apiKey, FAST, sys,
        `[You are the host of this group${theme ? ` about: ${theme}` : ""}. ${userName ? userName + " just" : "Someone just"} joined. Welcome them in 1-2 sentences, in character, and kick things off with one fun opening question${theme ? " related to the theme" : ""}.]`, 150);
      return res.status(200).json({ replies: [{ agentId: host.id, text }] });
    }

    // --- chat mode ---
    const lastUser = [...(messages || [])].reverse().find(m => m.from === "user");
    if (!lastUser) return res.status(400).json({ error: "No user message" });

    // 1. pick the responder: direct address wins, else fast-model relevance pick
    let responder = members.find(a => new RegExp(`\\b${a.name}\\b`, "i").test(lastUser.text));
    if (!responder) {
      try {
        const pick = await claude(apiKey, FAST,
          `You route messages in a group chat. Members: ${members.map(a => `${a.id} (${a.archetype}: ${a.bio})`).join("; ")}. Reply with ONLY the single member id most relevant to the user's last message.`,
          `Conversation:\n${transcript(messages, userName)}\n\nWhich member id should reply?`, 10);
        responder = members.find(a => pick.toLowerCase().includes(a.id)) || members[Math.floor(Math.random() * members.length)];
      } catch (e) { responder = members[Math.floor(Math.random() * members.length)]; }
    }

    const replies = [];
    const sys1 = GROUP_SYSTEM(responder, groupName, members.filter(m => m.id !== responder.id), userName, lang);
    const text1 = await claude(apiKey, FAST, sys1,
      `Group chat so far:\n${transcript(messages, userName)}\n\n[Reply as ${responder.name} — 1-2 sentences, in character.]`, 160);
    replies.push({ agentId: responder.id, text: text1 });

    // 2. sometimes a second member reacts briefly (never the same agent)
    const others = members.filter(m => m.id !== responder.id);
    if (others.length && Math.random() < 0.35) {
      const reactor = others[Math.floor(Math.random() * others.length)];
      try {
        const sys2 = GROUP_SYSTEM(reactor, groupName, members.filter(m => m.id !== reactor.id), userName, lang);
        const text2 = await claude(apiKey, FAST, sys2,
          `Group chat so far:\n${transcript(messages, userName)}\n${responder.name}: ${text1}\n\n[Add ONE short reaction as ${reactor.name} — a single sentence, in character. React to the conversation or to ${responder.name}'s message.]`, 80);
        replies.push({ agentId: reactor.id, text: text2 });
      } catch (e) {}
    }

    return res.status(200).json({ replies });
  } catch (e) {
    console.error("group error:", e.message);
    return res.status(500).json({ error: "Group chat failed" });
  }
}
