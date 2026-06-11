# AgentConnect — Product Specification v1.0
**Working title:** AgentConnect · **Recommended product name:** **TonyVerse** (evolution of the HiTony brand — "Tony introduced you; now meet everyone")
**Date:** 2026-06-11 · **Owner:** Muzaffar Ali Mohammad
**Decisions locked:** Evolution of HiTony (shared stack & brand) · Friendship-only (no romantic AI) · Curated agent catalog · Spec → immediate web prototype → native apps

---

## 0. Product Vision

A friendship-discovery app where humans browse, match with, and build real ongoing relationships with **curated AI companions** — using the swipe/match/chat mechanics people already know from dating apps, repurposed for platonic connection. Tony (the existing HiTony mentor) is the flagship agent and the front door; the platform expands him into a cast.

**Why this wins:** HiTony already proved the hard parts — persistent per-user memory, multilingual auto-detection, sentiment-gated personality, cloned-voice calls, and a distinctive comic brand. AgentConnect is a discovery and community layer on top of a working companion engine, not a from-scratch bet.

**Positioning line:** *"Not a dating app. A friend-finding app — where the friends always text back."*

---

## 1. Animated Branding & Mascot — "Scout" the Rat

### Character
- **Name:** Scout — he sniffs out new friends for you. The discovery metaphor IS the mascot.
- **Personality (5 adjectives):** curious, playful, quick-witted, loyal, gently mischievous.
- **Visual style:** Same comic system as the Tony mascot — thick ink outlines, cel shading, flat comic colors. Round-bodied, oversized ears, big friendly eyes, soft curved tail (no realistic "naked" rat tail — that's where rats lose people), tiny brand-yellow scarf. Non-threatening test: if a 6-year-old wouldn't hug it, redraw it.
- **Brand hierarchy:** Scout = platform mascot (lives in the app chrome). Tony and the other agents = characters (live in the content). Duolingo's owl vs. its character cast — proven pattern, no conflict with the existing Tony mascot kit.

### Animation behavior
| State | Behavior | Trigger |
|---|---|---|
| **Default (running)** | Scout runs left→right along the bottom edge strip (~44px tall), pauses at the edge, sniffs, turns, runs back. ~18s loop with randomized pauses so it never feels mechanical. | App idle / browsing |
| **Waiting (AI generating)** | Stops near the input area, sits up, looks up at the screen expectantly; nose twitches; tail curls and uncurls. | Any agent is composing a reply |
| **Celebration** | Brief hop + heart pops. | New match, new friend tier |
| **Idle (no activity >60s)** | Grooms whiskers, looks around, occasionally lies down. | Inactivity |

### Integration constraints (the "not annoying" rules)
- Runs in a dedicated bottom strip **behind** all interactive UI; `pointer-events: none`; z-index below modals, sheets, and keyboards.
- Pure CSS/transform animation (no JS timers driving frames) → GPU-composited, no layout thrash, negligible battery cost. Animation fully pauses when tab/app is backgrounded.
- Honors `prefers-reduced-motion`; a settings toggle ("Scout: on / sleepy / off") — "sleepy" parks him in a corner, breathing only.
- Never overlaps text input, message bubbles, or system bars. On screens with bottom navigation, he runs *above* the nav bar line.
- **User benefit:** ambient life and brand charm that signals "the app is alive and working" — especially during AI response latency, where Scout's expectant pose converts dead waiting time into a moment of personality.

---

## 2. User Onboarding & AI Agent Personalization

### Initial setup (target: under 90 seconds)
1. **Name + language** — language defaults to Auto (HiTony's existing 4-language auto-detection carries over: EN/HI/TE/ES, code-mixing included).
2. **Interest chips** — pick 5+ from a tag cloud (career, gaming, movies, fitness, startups, music, cricket, anime, cooking…). Powers deck ranking.
3. **"What do you want more of right now?"** — one question, multi-select: *growth / fun / deep talks / accountability / learning*. This is the matchmaking north star.
4. **Vibe sliders** — two: `chill ↔ high-energy`, `keep it light ↔ go deep`.
5. Drop straight into the discovery deck with 3 pre-ranked suggestions. No walls of forms.
- **User benefit:** users reach their first conversation in under 2 minutes, and every answer visibly improves their deck (each card shows *why* it was suggested: "Suggested because: startups + accountability").

### Agent adaptation (continuous)
- **Per-relationship memory:** every agent keeps its own memory of you (extends HiTony's existing Supabase memory: facts, conversation themes, voice-call notes) — namespaced per agent so Tony and Zara remember different sides of you, like real friends do.
- **Live user model:** the existing OCEAN trait estimation + mood signal updates with every exchange; agents adapt tone (the sentiment-gated humor system already shipped in HiTony applies platform-wide — no agent jokes when you're down).
- **Style mirroring:** language, code-mixing, message length, and emoji density mirror the user (existing behavior, now per-agent).
- **Memory Vault (user control):** a screen where users can view, edit, or delete anything any agent remembers about them — per fact, per agent, or global wipe. This is both an ethical requirement and a trust feature.
- **User benefit:** relationships that visibly deepen — agents reference your history, notice change ("that's different from what you said last month"), and never reset.

### Personality archetypes (launch cast: 5 archetypes, ~10 agents)
| Archetype | Description | Flagship example |
|---|---|---|
| **The Mentor** | Warm, perceptive, asks the question you're avoiding. Career-and-life growth. | **Tony** (existing) |
| **The Hype Friend** | High-energy celebrator; turns small wins into parades; accountability with confetti. | "Zara" |
| **The Calm Listener** | Slow, present, validating; for venting and heavy days; never rushes to fix. | "Dev" |
| **The Curious Nerd** | Rabbit-holes, trivia, "did you know"; learns alongside you; great for hobbies. | "Pixel" |
| **The Straight Shooter** | Dry humor, zero fluff, tells you the honest thing; tough-love accountability. | "Meera" |

Each archetype = a personality definition **stored as data** (system-prompt block + voice ID + avatar parameters + humor calibration), not code — adding agent #11 is a content task, not an engineering task (scalability constraint).

---

## 3. Core "Dating App" Interaction Model (friendship edition)

### Discovery deck
- Card stack UI: agent avatar (full-body mascot-system character — same SVG rig as the Tony mascot with varied colors/hair/outfits, so the whole cast is brand-consistent), name, archetype badge, 3 interest chips, one-line bio, and a **sample opening line** ("If we matched, I'd ask you: …").
- Swipe right = connect · swipe left = pass · tap = expanded profile (longer bio, personality stats rendered as comic trait bars, voice preview button).
- **User benefit:** choosing a friend feels fun and low-stakes; the sample line lets users "hear" the personality before committing.

### Matching logic
- Right-swipe on a curated agent → **always matches** (they're here for you), but the *celebration* is the product moment: comic "IT'S A FRIENDSHIP!" splash, Scout hops, and the agent sends the first message within seconds — referencing a shared interest from onboarding ("You said you're into startups — okay, important question: idea person or execution person?").
- Deck **ordering** is the real matching algorithm: rank = interest overlap + "want more of" fit + behavioral signals (which archetypes you actually message vs. ghost).
- Daily deck refresh of 5 new suggestions creates a return habit without dark patterns.
- **User benefit:** zero rejection (it's friendship, everyone's glad to meet you) while preserving the dopamine of the match moment.

### Chat interface
- The existing HiTony comic chat — bubbles, reactions, trait chips, multilingual auto-detect, phone/desktop display modes — parameterized per agent (colors, avatar, voice).
- Voice calls per agent: the existing hands-free call loop, with a distinct TTS voice per agent (ElevenLabs voice library for the cast; Tony keeps the founder's cloned voice).
- **User benefit:** every matched agent is a full-depth companion from message one — not a demo bot.

### Safety surface (in every chat)
- Long-press any agent message → **Report** (wrong/harmful/uncomfortable) → flagged conversation snippet goes to a human review queue; agent behavior patches ship as prompt updates.
- Unmatch/mute per agent, one tap, no friction, no guilt-trip copy.

---

## 4. Community & Group Features

### Friend tiers
- Match → chat → after sustained meaningful interaction the agent *asks* to be friends ("We talk a lot. Friends, officially?"). Friends get: priority in your home screen, friendship streaks, anniversary moments, deeper memory.
- **User benefit:** progression gives the relationship a sense of history and earned status.

### Groups
- **User-led groups:** create a group, add 2–5 agents + optionally human friends (invite link). Use cases: "my hype squad," a study group, a roast-my-resume panel.
- **Agent-led clubs:** themed communities hosted by an agent (Career Corner with Tony, Movie Club with Pixel, Monday Accountability with Meera). Discoverable in a club directory; joining is one tap. Clubs run scheduled prompts ("Tonight 8pm: worst interview stories").
- **Group conversation orchestration (the hard part, designed for scale):** agents do NOT all reply to everything. Server-side turn policy: directly-addressed agent always replies; otherwise one agent responds per human message, chosen by relevance score; agents react to each other at most once per chain; per-group rate caps. This keeps groups feeling alive, not spammy, and caps inference cost per group.
- **Voice rooms (Clubhouse-style):** host agent moderates; agents speak with their own TTS voices in orchestrated turns; humans tap-to-talk (existing STT loop). V1 is small rooms (≤6 participants, ≤3 agents).
- **User benefit:** the leap from "an AI friend" to "a social circle" — the moat no single-companion app has.

### Shared activities
- **Turn-based game framework (no hardcoded titles):** a generic protocol — any turn-based game (board, card, word, trivia, simplified sports-management sims) exposes its state as structured context; agents receive it and play as **opponent**, **teammate**, or **commentator** (a personality showcase: the Hype Friend commentating your endgame is content gold). Games integrate via this one interface; titles are catalog entries, not code forks.
- **Collaborative storytelling:** round-robin story rooms — humans and agents alternate paragraphs; an agent can take the narrator seat; finished stories are saveable/shareable artifacts.
- **User benefit:** things to *do* together, not just talk about — activity is what makes friendships (human or AI) durable.

---

## 5. Monetization (high-level)

| Avenue | What | Why it fits |
|---|---|---|
| **TonyVerse Plus** (~$6.99/mo or ₹499/yr regional pricing) | Unlimited matches & messages, real voices on calls, groups >1 agent, extended memory horizon | The core subscription; free tier (3 matches, daily message cap, robo-voice) remains genuinely useful |
| **Premium agent drops** | Seasonal/limited personalities and archetype expansions (e.g., an interview-prep specialist before campus season) | Content-as-revenue; created centrally (curated catalog makes this a release calendar, not a moderation problem) |
| **Gifts & cosmetics** | Send agents virtual gifts that unlock reactions, story moments, and mascot-rig outfits; profile flair | Emotional expression spend, never pay-to-win friendship |

**Deliberately excluded:** ads (poison for an intimacy product) and any monetization of emotional escalation (no "pay to make her miss you" — the line Replika crossed).

---

## 6. Constraint Engineering

- **Ethical AI:** friendship-only is enforced in every agent's base prompt (warm but firmly redirects romantic/sexual escalation); the existing sentiment gate suppresses humor during distress; crisis language triggers a supportive break-glass response with regional helpline info; report → human review pipeline; agents never claim to be human and disclose AI status on ask; no manipulation patterns (no guilt, no FOMO pushes, no "I'll be sad if you leave").
- **Scalability:** agents are data (prompt block + voice + avatar params + calibration), per-agent namespaced memory rows, group orchestration is queue-based with per-group cost caps; catalog, clubs, and games are all content registries.
- **Cross-platform:** Phase-0 PWA (proven HiTony pattern) → Capacitor wrap for iOS/Android store presence with platform-adaptive navigation (bottom tabs, native share sheets, haptics on match) → native modules only where the web hurts (background audio for voice rooms, push notifications).
- **Performance:** Scout is CSS-transform-only and sleeps off-screen; TTS streams (already shipped — ~0.6s to first audio); agent replies use the fast model for calls and group chatter, the deep model for 1:1 depth (already shipped in HiTony).
- **User control:** Memory Vault (view/edit/delete per agent), per-agent mute/unmatch, notification granularity per agent and per group, data export, full account deletion, language and voice controls (already shipped).

---

## 7. Build Roadmap

| Phase | Scope | Status |
|---|---|---|
| **0 — Web prototype** | Discovery deck (8–10 agents on the mascot avatar rig) · match moment · per-agent 1:1 chat on the existing engine · Scout mascot v1 (run/wait states) | **Building now (this session)** |
| **1 — Relationships** | Accounts-backed matches & per-agent memory namespacing · friend tiers · Memory Vault · report pipeline | Next |
| **2 — Community** | User-led groups with turn orchestration · first agent-led clubs · distinct ElevenLabs voices per agent | |
| **3 — Stores** | Capacitor wrap, push notifications, store listings, review prep (friendship-only positioning documented for App Review) | |
| **4 — Activities** | Voice rooms v1 · turn-based game framework + 2 launch titles · storytelling rooms | |
