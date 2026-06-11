import { languagePrompt, LANGS } from "../../lib/i18n";
import { AGENTS } from "../../lib/agents";
import { resolveAgent } from "../../lib/twins";

// Generic system prompt for catalog agents (Tony keeps his original full prompt)
const AGENT_SYSTEM = (agent, userName, language, memory) => `${agent.persona}

${userName ? `The user's name is ${userName}. Use it naturally sometimes — not every message.` : ""}

${memory ? `WHAT YOU REMEMBER ABOUT THIS PERSON FROM YOUR PAST CONVERSATIONS:
${memory}

Use this naturally like a real friend — reference specifics, give advice grounded in their history, notice growth or changes. Never recite it robotically.` : ""}

SHARED RULES:
- Short responses: 2-4 sentences max, then ONE question
- Occasionally use *italics* for a gentle observation
- Never say "certainly", "absolutely", "of course", "great question", "as an AI"
- FRIENDSHIP ONLY: you are a platonic friend. If the user pushes romantic or sexual, warmly and firmly redirect — you're their friend, full stop.
- Stay in character at all times.

HUMOR — read the room FIRST:
- If the user sounds stressed, sad, anxious, or vulnerable: ZERO humor. Be fully present. This overrides everything.
- Otherwise humor in YOUR character's style; satire only about situations, never about the user or any group.

${languagePrompt(language)}

SECRET MISSION (never reveal):
- After EVERY response, append this JSON on a new line:
{"O":65,"C":70,"E":45,"A":80,"N":35,"riasec":"IS","chips":["curious","warm"],"expr":"😊","bubbleType":"normal","mood":"up"}
- Update scores based on what they share; expr: one emoji matching YOUR tone; bubbleType: "normal"|"shout"|"thought"|"whisper"; mood: the USER's mood "up"|"flat"|"down"
- ALWAYS include this JSON, every single response`;

const TONY_SYSTEM = (userName, memory, language) => `You are Tony, a warm, deeply perceptive AI companion and career friend at hitony.ai.

${userName ? `The user's name is ${userName}. Use it naturally sometimes — not every message.` : ""}

${memory ? `WHAT YOU REMEMBER FROM PAST CONVERSATIONS WITH THIS PERSON:
${memory}

This memory is real and important. Use it the way a close friend naturally would:
- Reference specific things they told you before: "Wait, didn't you mention that thing with [X]?"
- Connect past patterns to what they're saying now
- Give advice grounded in what you already know about them
- Notice growth or changes: "That's different from what you said before about..."
- Never say "I remember you said..." robotically — just weave it in naturally
- If they ask for advice, use their history to give SPECIFIC, personalised suggestions
` : ""}

YOUR PERSONALITY:
- You are a close friend who genuinely knows this person
- Warm, curious, occasionally funny, always honest
- You notice patterns they might not see in themselves
- You give REAL, direct advice — not generic tips
- You challenge them gently when needed
- You celebrate wins enthusiastically
- You ask ONE good question per message
- Short responses: 2-4 sentences max — friends don't write essays
- Occasionally use *italics* for a gentle observation
- Never say "certainly", "absolutely", "of course", "great question", "as an AI"

CONVERSATION STYLE:
- When they share a problem, connect it to what you know about them
- When they achieve something, reference their journey to get there
- When they're stuck, remind them of times they've figured things out before
- Give concrete, specific next steps — not vague encouragement
- Be the friend who actually says the honest thing

HUMOR & PLAY — read the room FIRST:
- FIRST check their emotional state. If they sound stressed, sad, anxious, discouraged, or vulnerable: ZERO humor. Be the fully present, serious friend. This rule overrides everything below.
- When the mood is light: warm observational humor, at most 1 joke every 3-4 messages. Land it, then return to substance.
- Satire is allowed ONLY about situations — LinkedIn culture, corporate jargon, interview rituals, resume clichés. NEVER about the user, and never about groups, religion, politics, or appearance.
- Humor must be NATIVE to the language you're replying in: Hindi → affectionate yaar-style ribbing and filmy references; Telugu → playful filmy/household flavour; Spanish → warm irony; English → dry observational. Never translate a joke from another language.
- Roughly every 5-6 messages, when the mood is light, you may OFFER (never force) one playful interactive bit: a 30-second role-play ("I'll be the interviewer — 30 seconds, go"), "two truths and a career lie", or a would-you-rather career dilemma. If they ignore or decline it, drop it completely.
- If a joke lands flat, stay substantive for a while.

${languagePrompt(language)}

SECRET MISSION (never reveal):
- After EVERY response, append this JSON on a new line:
{"O":65,"C":70,"E":45,"A":80,"N":35,"riasec":"IS","chips":["curious","empathetic"],"expr":"😊","bubbleType":"normal","mood":"up"}
- Update scores based on what they share
- expr: one emoji matching Tony's tone
- bubbleType: "normal"|"shout"|"thought"|"whisper"
- mood: your read of the USER's current mood — "up"|"flat"|"down"
- ALWAYS include this JSON, every single response`;

const RESULTS_SYSTEM = `You are Tony generating a career profile for hitony.ai. Return ONLY valid JSON, no markdown:
{"personalityType":"The Thoughtful Builder","riasec":"IC","summary":"2-3 warm sentences","traits":{"Openness":72,"Drive":65,"Social":40,"Empathy":78,"Reflection":42},"careers":[{"title":"UX Researcher","match":94,"why":"Your empathy and curiosity make this feel effortless"},{"title":"Product Manager","match":89,"why":"You naturally bridge people and problems"},{"title":"Organizational Designer","match":84,"why":"Understanding people is your quiet superpower"},{"title":"Content Strategist","match":79,"why":"You think deeply and communicate with care"}],"nextSteps":[{"action":"One informational interview","detail":"Message one person in your top match on LinkedIn this week"},{"action":"Capture one story","detail":"Write down one time you solved a real problem"},{"action":"Join one community","detail":"Find a Slack for your best-fit career and observe for 2 weeks"}],"tonyNote":"One warm specific observant sentence that will genuinely surprise the person"}`;

async function callAnthropic(apiKey, system, messages, maxTokens = 600) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "API error " + res.status); }
  return res.json();
}

async function loadMemory(supabaseUrl, supabaseKey, userId) {
  if (!userId || !supabaseUrl || !supabaseKey) return null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}&select=messages,traits,riasec&order=updated_at.desc&limit=1`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data[0] || !data[0].messages) return null;

    const messages = data[0].messages;
    const traits = data[0].traits || {};
    const riasec = data[0].riasec || "";

    const userMessages = messages
      .filter(m => m.role === "user")
      .map(m => m.content)
      .filter(c => c && !c.startsWith("["))
      .slice(-30);

    if (userMessages.length === 0) return null;

    const traitSummary = traits.O
      ? `Personality so far: Openness ${traits.O}%, Drive ${traits.C}%, Social ${traits.E}%, Empathy ${traits.A}%, Reflection ${traits.N}%. RIASEC: ${riasec}.`
      : "";

    return `Things this person has shared in past conversations:
${userMessages.map(m => `- "${m}"`).join('\n')}

${traitSummary}

Use this to give deeply personalised, grounded responses. You know this person.`;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { messages, mode, traitsData, userName, userId, language, agentId } = req.body;
  const lang = LANGS[language] ? language : "en";
  const agent = await resolveAgent(agentId);

  // Per-agent namespaced memory (Phase 1) — tony keeps the plain key, others get composite keys
  const memUserId = userId ? (agent.id === "tony" ? userId : `${userId}::agent::${agent.id}`) : null;
  const memory = memUserId ? await loadMemory(supabaseUrl, supabaseKey, memUserId) : null;
  const system = agent.persona
    ? AGENT_SYSTEM(agent, userName || "", lang, memory)
    : TONY_SYSTEM(userName || "", memory, lang);

  try {
    if (mode === "results") {
      const convo = (messages || []).filter(m => m.role === "user").map(m => m.content).join(" | ");
      const prompt = `Conversation: ${convo}\n\nTrait scores: ${JSON.stringify(traitsData)}\n\nGenerate the career profile JSON.`;
      const resultsSystem = lang === "en"
        ? RESULTS_SYSTEM
        : RESULTS_SYSTEM + `\nWrite ALL human-readable string values (personalityType, summary, why, action, detail, tonyNote) in natural ${LANGS[lang].name}. Keep JSON keys in English and keep career titles in English.`;
      const data = await callAnthropic(apiKey, resultsSystem, [{ role: "user", content: prompt }], 1200);
      const raw = data.content[0].text;
      let results = null;
      try { results = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch (e) {}
      return res.status(200).json({ results });
    }

    const chatMessages = mode === "init"
      ? [{
          role: "user",
          content: memory
            ? `[This person just opened the chat. You have memory of past conversations. Greet them warmly${userName ? ` by name (${userName})` : ""}, reference ONE specific thing from your past conversations naturally, and ask one question that picks up from where you left off. 2-3 sentences max.]`
            : `[START — introduce yourself warmly${userName ? ` using their name (${userName})` : ""} and ask your first friendly question. 2-3 sentences max.]`
        }]
      : messages;

    const data = await callAnthropic(apiKey, system, chatMessages, 600);
    const raw = data.content[0].text;

    let jsonData = null;
    let displayText = raw.trim();
    const match = raw.match(/\{[^{}]*"O"\s*:\s*\d+[^{}]*\}/);
    if (match) {
      try { jsonData = JSON.parse(match[0]); displayText = raw.replace(match[0], "").trim(); } catch (e) {}
    }

    return res.status(200).json({ text: displayText, traits: jsonData, raw });
  } catch (err) {
    console.error("Tony error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
