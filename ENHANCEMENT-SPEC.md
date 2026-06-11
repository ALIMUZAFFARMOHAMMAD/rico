# HiTony Enhancement Spec — v1.0
**Product:** HiTony (hitony.vercel.app) · **Stack:** Next.js 14 (pages router) · Clerk · Supabase · Anthropic API (claude-sonnet-4-6) · Browser Web Speech API
**Date:** 2026-06-10 · **Owner:** Muzaffar Ali Mohammad
**Decisions locked:** Founder-voice cloning (Phase 2, paid) · Free-tier TTS for now · Language selector + auto-follow · Spec → review → build

---

## Feature 1: Multi-Language Support (i18n)

**Languages:** English (default), Hindi (hi), Telugu (te), Spanish (es)

### User stories
- As a Spanish-speaking user, I want HiTony's interface and Tony's replies in Spanish so I can communicate naturally.
- As a Hindi/Telugu speaker, I want to mix English with my language (Hinglish/Tenglish) and have Tony respond the way my friends text me.
- As a caller, I want Tony to *speak* in my language, not just write in it.

### Behavior model: "Selector + auto-follow"
1. User picks a language from the selector → UI chrome, system messages, and Tony's default reply language all switch.
2. If the user writes/speaks in a different language mid-conversation, Tony mirrors them — including code-mixed Hinglish/Tenglish ("kal interview hai yaar, I'm so nervous" → Tony replies in the same mix).
3. The selector choice persists (localStorage + Supabase `profiles.language`) and syncs across chat and call.

### Technical implementation
| Layer | Approach |
|---|---|
| UI strings | App has ~40 UI strings — a single `lib/strings.js` dictionary `{ en, hi, te, es }` + a `t(key)` helper. No i18n library needed at this size; revisit if strings exceed ~150. |
| AI chat replies | No translation layer. Add to `TONY_SYSTEM` in `pages/api/tony.js`: preferred language + "mirror the user's language and code-mixing." Claude handles hi/te/es natively. |
| AI call replies | Same prompt change in `pages/api/voice.js` SYSTEM. |
| Speech-to-text (call) | `webkitSpeechRecognition.lang` = `hi-IN` / `te-IN` / `es-ES` per selected language. |
| Text-to-speech (call) | `speechSynthesis.getVoices()` filtered by lang. **Reality check:** Hindi & Spanish voices are reliable on Chrome/Android; **Telugu browser voices are missing on many desktops.** Fallback chain: te-IN voice → hi-IN voice → on-screen text with a one-time notice "Telugu voice isn't available on this device — Tony will speak Hindi / show text." |
| Persistence | `language` column on the Supabase profile/conversations row; localStorage for logged-out visitors. |

### UX/UI
- Globe icon 🌐 in the header (both displays) → dropdown listing languages **in their own script**: English / हिन्दी / తెలుగు / Español. Never flags-only (flags ≠ languages).
- First-visit: auto-suggest from `navigator.language` with a dismissible chip ("¿Prefieres español?").
- During calls, the active speech language shows next to the mic state so users understand what the recognizer is listening for.
- Devanagari/Telugu scripts need ~10% larger line-height; use `Noto Sans` family fallbacks for script coverage.

### Success metrics
- ≥20% of new sign-ups select a non-English language within 30 days of launch.
- Session length for hi/te/es users within 10% of English users (parity = the experience isn't degraded).
- Call completion rate in Hindi/Spanish ≥ 80% of English call completion rate.
- <5% of users switch back to English after choosing another language (proxy for quality).

---

## Feature 2: Computer Display Mode

### User story
As a desktop user, I want a layout that uses my whole screen — more history, larger text, and side panels — instead of a phone mockup in the middle of my monitor.

### Technical implementation
- Single `displayMode` state (`"phone" | "computer"`) in `pages/index.js`; persisted to localStorage and Supabase.
- **Default by viewport:** ≥1024px → computer, otherwise phone. Manual toggle always overrides.
- Computer layout = CSS grid, 3 columns:
  - **Left rail (240px):** conversation history list, language selector, display toggle, settings.
  - **Center (fluid, max 760px):** the chat thread — same message components, larger type (16→17px), more visible history.
  - **Right rail (280px):** the "Tony knows you" panel — personality trait chips (the OCEAN data already tracked per message), memory highlights, career results card. This data already exists server-side; the desktop layout finally gives it a home.
- Voice call page: in computer mode, show live transcript beside the call orb (phone mode keeps the full-screen call feel).
- No new APIs; this is a pure front-end refactor. Extract shared message components first so both layouts render one source of truth.

### UX/UI
- Toggle: phone/monitor icon pair in the header, with the active mode highlighted. Label on hover: "Phone view / Desktop view."
- Both modes fully responsive — "phone mode" on desktop renders the centered phone frame (current behavior, it's charming; keep it as a choice).
- Keyboard support in computer mode: `Enter` send, `/` focus input, `Esc` end call.
- Accessibility: column landmarks (`nav`, `main`, `aside`), focus order left→center→right, all toggles reachable by keyboard.

### Success metrics
- ≥50% of desktop sessions use computer mode within 2 weeks.
- Desktop median messages/session up ≥25% vs. pre-launch.
- Desktop bounce rate down ≥15%.

---

## Feature 3: Real Human Voice (Founder Voice → Tony)

### Decision & honest constraint
Chosen direction: **your recorded voice becomes Tony's voice for all users.** Voice cloning requires a paid TTS API — there is no credible free option. So:

- **Phase 1 (now, free):** make browser TTS sound as good as it can. Voice-quality picker that prefers premium system voices (e.g., Google "Natural" voices on Chrome/Android, Microsoft Neural voices on Edge — Edge users get near-human quality for free). Tuned rate/pitch per language. This ships with i18n.
- **Phase 2 (when ready, ~$5/mo):** ElevenLabs Starter — instant voice clone from 1–2 minutes of clean audio, and its multilingual model speaks **Hindi, Telugu, and Spanish in your cloned voice**, which also fixes the Telugu TTS gap from Feature 1.

### User story
As a user on a call with Tony, I want to hear a warm human voice instead of a robotic one, so the call feels like talking to a real friend.

### Technical implementation (Phase 2 blueprint)
1. One-time founder setup: record 1–2 min of clean speech → create Instant Voice Clone in the ElevenLabs dashboard → store `voice_id` as a Vercel env var. No in-app upload flow needed since it's founder-only (per-user cloning stays out of scope — it would add consent, storage, and 10× cost).
2. New `pages/api/tts.js`: takes Tony's reply text + language, calls ElevenLabs `eleven_multilingual_v2`, streams audio back. Server-side only — API key never touches the client.
3. Call page: replace `speechSynthesis.speak()` with audio playback from `/api/tts`; keep browser TTS as automatic fallback on error/quota (the call never goes silent).
4. Cache common phrases (greetings) in Supabase storage to cut character usage ~20%.
5. Disclosure line on the call screen: "Tony's voice is AI-generated from a human recording."

### UX/UI
- Settings → Voice: "Classic (free)" vs "Tony's real voice ✨", with a 3-second preview button for each.
- Latency cover: TTS adds ~300–800ms vs instant browser speech — show the existing "Tony is thinking" orb pulse while audio loads.

### Success metrics
- Phase 1: call abandonment within first 60s drops ≥10% after voice tuning.
- Phase 2: ≥60% of callers choose the real voice; average call duration up ≥30%; repeat-call rate up ≥20%.
- Cost guardrail: stay within plan character quota with ≥20% headroom (alert at 80%).

---

## Feature 4: Enriched Conversational Dynamics

### User story
As a regular user, I want Tony to be funny and playful as well as wise, so conversations feel like a real friendship — and I want him to read the room and stay serious when I need him to be.

### Design principle: "Read the room first"
The single most important rule — humor is **gated by sentiment**, never random. Tony already tracks OCEAN scores and emotional tone per message; this feature finally uses that signal.

### Technical implementation
All prompt engineering in `TONY_SYSTEM` (`api/tony.js`) and `SYSTEM` (`api/voice.js`) — no new infrastructure:

1. **Humor engine (prompt rules):**
   - Light, observational humor at most ~1 in 4 messages; self-aware AI jokes allowed; teasing only about things the user has joked about themselves.
   - **Hard gate:** if the user expresses distress, failure, anxiety, or grief → zero humor, full present-friend mode. Humor only re-enters after the user's tone lifts.
   - Satire targets *situations* (corporate jargon, LinkedIn culture, interview rituals) — never the user, never groups, never politics/religion.
2. **Cultural calibration per language:** Hindi — Bollywood-flavored, yaar-style affectionate ribbing; Telugu — household/filmy references; Spanish — warm irony; explicit prompt instruction that wordplay must be *native* to the language, not translated English jokes.
3. **Interactive prompts:** extend the existing one-question-per-message pattern with rotating modes Tony can offer (never force): "Two Truths & a Career Lie," 60-second role-plays ("I'm the interviewer, you have 30 seconds — go"), "would you rather" career dilemmas. Triggered contextually (e.g., user mentions an upcoming interview → offer the role-play).
4. **Sentiment feedback loop:** append mood to the existing hidden JSON (`"mood":"up"|"flat"|"down"`); the existing chips/expr UI can subtly reflect it (bubbleType "shout" for celebration already exists — use it).
5. **A "vibe" setting (optional, default Auto):** Auto / Playful / Focused — one line in settings, maps to a single sentence swapped into the system prompt.

### Tone example (deliverable per constraints)
> **User:** I rewrote my LinkedIn headline again. Third time this week.
> **Tony:** Third time? At this point your headline has had more career changes than both of us combined 😄 Show me the latest one — and tell me honestly, are you writing it for recruiters or for the version of you that you're trying to become?

— joke lands on the *situation*, satire pokes LinkedIn culture not the user, and it pivots into a real open question. And if the same user had said "I rewrote it again and I still feel like a fraud," Tony's reply would carry zero jokes.

### Success metrics
- 7-day retention up ≥15%; messages/session up ≥20%.
- ≥30% acceptance rate when Tony offers an interactive scenario.
- Qualitative: in-app 👍/👎 on messages — humor-flagged messages must hold ≥90% positive; any single joke pattern below that gets cut from the prompt.
- Guardrail metric: zero increase in session-abandonment immediately following a humor message.

---

## Rollout plan

| Phase | Scope | Effort |
|---|---|---|
| **1** | i18n (UI + chat + call languages) + conversational dynamics — both are mostly prompt/front-end work and compound each other | ~1 build session |
| **2** | Computer display mode (front-end refactor) | ~1 build session |
| **3** | Founder voice clone via ElevenLabs (when budget approved) — also resolves Telugu TTS gap | ~½ session + $5/mo |

**Cross-cutting constraints honored:** everything in Phases 1–2 runs on the current free stack; core serious-conversation mode is protected by the sentiment gate; all humor rules are per-language culturally calibrated; accessibility requirements are listed per feature.
