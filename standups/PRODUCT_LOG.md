# Rico — Product Log (the company brain)

> This is the single source of truth for the autonomous product team. Every daily
> standup run MUST read this file first, then update it last. Without it, each run
> restarts from scratch. Keep it tight and current.

**CEO:** Muzaffar (mohammadmuzaffarali165@gmail.com)
**Repo:** C:\Users\muzaf\Downloads\asktony  ·  **Live:** https://hitony.vercel.app
**Mission for this team:** Build Rico into a product impressive and differentiated
enough to raise from an investor. Optimize for: (1) a unique, defensible wedge,
(2) a metric story (retention + outcomes), (3) a demo that makes an investor lean in.

---

## 0. Autonomy guardrails (NEVER cross without CEO approval)
- ✅ Free to do: ideate, write code on branches, run builds/tests, open PRs, analyze data, draft copy/creative.
- 🔒 Requires CEO one-click approval (queue in the standup under "Needs your approval"):
  - Deploying to production (`vercel --prod` / alias).
  - Spending any money (paid API credits, ads, tools).
  - Any external/public communication (social posts, outreach, emails to third parties).
- 🛑 Hard rules: honest framing only (no fabricated testimonials/metrics — use "Rico beta user");
  friendship-only, AI clearly labeled; never print secrets; protect named beta testers' privacy.

---

## 1. North Star & investor goals
- **North Star metric:** D7 retention ≥ 18% (Aug 2026 cohort). Companion apps live or die on retention.
- **Supporting goals (Q3 2026):** 500 registered users · ≥60% activation (first real conversation in 24h) · ≥3% free→paid after Stripe.
- **Investor narrative we are building toward:** "Companion apps churn because novelty fades.
  Rico fuses emotional retention (proactive friends + living memory) with tangible life outcomes
  (career wins) for the 60M+ international students & diaspora no incumbent serves in-language.
  We retain like a companion app AND monetize like a career tool."

## 2. The Product Bet (our unique wedge — 3 compounding differentiators)
1. **Proactive presence** — Rico's friends reach out FIRST ("how'd your exam go?", "interview tomorrow — want to practice?").
   Reactive chatbots wait; relationships initiate. This is the strongest retention lever and the clearest "this is alive" demo moment.
2. **Living memory graph** — friends remember across time and reference shared history. The longer you use Rico,
   the higher the switching cost. Retention compounds = the moat.
3. **Outcome engine** — Tony converts engagement into measurable life outcomes (resume → ATS → interviews → offers).
   Monetization + "this app changed my life" testimonial flywheel. No companion app has this.

## 3. Roadmap (Now / Next / Later)
**NOW (current focus):**
- [x] Flagship #1 (v1): **Proactive Presence** — "Rico texts you first." Memory-grounded check-in card
      at the top of Chats; the friend you last talked to greets you first, referencing your real history.
      Code complete + build/runtime verified. ⏳ Awaiting CEO deploy approval. (Owner: Forge)

**NEXT:**
- [ ] Living memory surfacing — friends reference past conversations naturally; a visible "what Rico remembers about you" panel.
- [ ] Instrumentation: D1/D7/D30 cohort dashboard + activation event (dependency for the whole metric story).
- [ ] Investor demo script + 2-min product walkthrough video.

**LATER:**
- [ ] Outcome engine v2: track interviews/offers attributed to Tony; surface as user "wins."
- [ ] Cultural/"home" layer: festivals, dialects, diaspora-specific moments.
- [ ] Plan gating + Stripe (separate backlog item, CEO drives credentials).

## 4. In progress (carries across days)
- Flagship #1 v2 ideas (NEXT): proactive VOICE-note check-ins (ElevenLabs), and a notification/push
  so Rico reaches out even when the app is closed (true "texts you first"). Also: a "what Rico
  remembers about you" panel to make the living-memory moat visible.

## 5. Done log (most recent first)
- 2026-06-28 — Flagship #1 v1 shipped to working tree: `pages/api/checkin.js` (memory-grounded
  proactive opener via Haiku, 18h cache on meta row), `components/ProactiveCheckin.js` (dismissible
  card), wired into Chats tab in `pages/index.js`. `next build` passes; runtime smoke on /api/checkin
  returns clean. Awaiting deploy approval. (Forge)
- 2026-06-28 — Day 0: team chartered, product bet + roadmap defined, daily standup scheduled. (Atlas)

## 6. Open approvals awaiting CEO
- [1] Deploy Flagship #1 to production (`npx vercel --prod --yes` + `vercel alias set <url> hitony.vercel.app`).
- NOTE FOR TEAM: repo `main` is far behind the working tree — most of the app is uncommitted and
  deploys happen from the working directory via Vercel, NOT via git. Do not assume `git` reflects
  production. Treat the working tree as source of truth until the CEO decides to reconcile git.

## 7. Idea backlog (raw, unprioritized)
- Streaks / "Rico missed you" re-engagement after lapse.
- Voice note check-ins (ElevenLabs) instead of text — higher emotional fidelity.
- Group "friend circle" that reacts among themselves to your news.
- Anonymous peer matching: connect two real lonely students via a Rico-mediated intro.
- "Homesick mode" — culturally specific comfort content in user's language.
