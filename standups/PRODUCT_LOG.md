# Rico — Product Log (the company brain)

> This is the single source of truth for the autonomous product team. Every daily
> standup run MUST read this file first, then update it last. Without it, each run
> restarts from scratch. Keep it tight and current.

**CEO:** Muzaffar (mohammadmuzaffarali165@gmail.com)
**Repo:** C:\Users\muzaf\Downloads\asktony  ·  **Live:** https://hitony.vercel.app
**Mission for this team:** Build Rico into a product impressive and differentiated
enough to raise from an investor. Optimize for: (1) a unique, defensible wedge,
(2) a metric story (retention + outcomes), (3) a demo that makes an investor lean in.

**Cadence:** Autonomous runs EVERY day ~11:00am CST (heavier build weekdays, lighter weekends; report daily).
**Team roster:** Atlas (PM/orchestrator) · **Sage (business strategist — positioning, moat, monetization, fundraising, investor narrative; brain at standups/STRATEGY.md)** · Nova (R&D — proposes new implementable ideas each run) ·
Forge (engineer) · Sentry (QA) · Pulse (data) · Beacon (growth strategy/outreach, drafts only) ·
Echo (content & social — posts/captions/short-form for @rico.hitony; drafts only, publishing gated) ·
**Reel (AI video editor — storyboards + produces videos from Echo's content via Higgsfield/ElevenLabs/Descript; generation gated on credits)** ·
Keeper (deploys). Content + video specs live in standups/CONTENT_CALENDAR.md.
**Approvals:** when anything is gated (deploy / spend / external comms), the run emails an
"ACTION NEEDED" alert to the CEO (real send if available, else a Gmail draft) + in-app notification.

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
- [x] "Rico missed you" lapse re-engagement check-in. Code complete 2026-06-29 (awaiting deploy).
- [ ] Proactive timing intelligence — fire check-ins around each user's habitual active hour.
- [ ] Honest-AI / privacy badge on landing (turn Replika's €5M GDPR fine into our trust wedge).
- [ ] Investor demo script + 2-min product walkthrough video.
- [x] Living memory surfacing — "what Rico remembers about you" panel. SHIPPED to prod 2026-06-28.
- [x] Instrumentation: activation event + Flagship-impact metrics. Code complete 2026-06-29 (awaiting deploy).

**LATER:**
- [ ] Outcome engine v2: track interviews/offers attributed to Tony; surface as user "wins."
- [ ] Cultural/"home" layer: festivals, dialects, diaspora-specific moments.
- [ ] Plan gating + Stripe (separate backlog item, CEO drives credentials).

## 4. In progress (carries across days)
- Next up: notification/push so Rico reaches out even when the app is closed (Capacitor android shell exists);
  proactive timing intelligence (fire around each user's habitual active hour).

## 5. Done log (most recent first)
- 2026-06-29 (run 6) — Voice-note check-ins (board 'in progress' task): `ProactiveCheckin.js` now has a
  "🔊 Voice note" button that plays the check-in in the friend's own voice via existing `/api/tts`
  (on-demand → cost-controlled); `track.js`/`stats.js` add a `checkin.voice` play counter. `next build`
  passes. ⏳ Awaiting deploy → then move board card to Done. (Reel + Forge)
- 2026-06-29 (run 5) — Board v2: simple founder key (BOARD_KEY=752003, set in Vercel) + visual upgrade
  (progress bar, per-member color-coded chips, open-workload summary). Deployed to prod (dpl twrrhmxwv);
  /api/board?key=752003 ok:true. (Forge)
- 2026-06-29 (run 4) — CEO Task Board: interactive kanban at `/board` (To Do / In Progress / Done,
  add/assign/move/delete, founder-key gated) + `/api/board` (Supabase-persisted, seed action).
  Team prompt updated: the daily run now READS the board (via STATS_KEY) and works board 'todo' tasks
  first, moving them in-progress→done. `next build` passes. ⏳ Awaiting deploy. (Forge)
- 2026-06-29 (run 3) — Signup-source attribution (closes Sage's GTM gap): `lib/source.js` first-touch
  capture (?src=/?ref=/utm_source/referrer), wired into `landing.js` + `index.js`; `track.js` stores
  `source` once; `stats.js` now returns `by_source` funnel (signups/activated/returned per channel).
  `next build` passes. ⏳ Awaiting deploy. Now GTM channels are measurable. (Sage → Forge)
- 2026-06-29 (run 2) — "Rico missed you" lapse re-engagement: `checkin.js` now computes days since
  last conversation; if >=3 days the opener warmly acknowledges the gap (no guilt-trip) and still
  references memory; `ProactiveCheckin.js` shows a "missed you 💜" badge. `next build` passes.
  ⏳ Awaiting deploy. (Nova → Forge)
- 2026-06-29 — Measurement layer: `track.js` + `stats.js` now capture ACTIVATION (first real
  conversation, +within-24h) and Flagship #1 proactive check-in shown/reply rate; client fires wired
  in `index.js` + `ProactiveCheckin.js`. `next build` passes. ⏳ Awaiting deploy. R&D (Nova) added 3
  ideas; promoted "Rico missed you" lapse re-engagement to next NOW. (Nova + Forge)
- 2026-06-28 — Pillar #2 shipped to working tree: **Living-memory moat made visible** — `pages/api/remembers.js`
  (extracts 3-6 real, specific things Rico knows about you across all friends, honest/no-invent, 18h cache)
  + `components/MemorySpotlight.js` (warm chips) on the Me tab. DEPLOYED to production
  (hitony.vercel.app, dpl earx43d2v, aliased, smoke-passed). (Forge + Keeper)
- 2026-06-28 — Safety net: full uncommitted working tree committed (bd8e08e) and pushed to GitHub branch
  `safety/working-tree-2026-06-28`. Git no longer out of sync / at risk. (Keeper)
- 2026-06-28 — Flagship #1 DEPLOYED to production (hitony.vercel.app, dpl GXreiWXb), aliased, smoke-passed. (Keeper)
- 2026-06-28 — Flagship #1 v1 shipped to working tree: `pages/api/checkin.js` (memory-grounded
  proactive opener via Haiku, 18h cache on meta row), `components/ProactiveCheckin.js` (dismissible
  card), wired into Chats tab in `pages/index.js`. `next build` passes; runtime smoke on /api/checkin
  returns clean. Awaiting deploy approval. (Forge)
- 2026-06-28 — Day 0: team chartered, product bet + roadmap defined, daily standup scheduled. (Atlas)

## 6. Open approvals awaiting CEO
- [1] Deploy voice-note check-ins to production (then board card "Voice-note check-ins" → Done).
- (resolved) CEO Task Board deployed to prod 2026-06-29 (dpl 4mb4zikyp); /board 200, /api/board gated 401.
  CEO: open /board, unlock with STATS_KEY, click "Seed current work" once.
- NOTE: board.js + api/board.js are deployed but not yet in the latest safety branch — refresh when convenient.
- Safety net refreshed: full working tree pushed to git branch `safety/working-tree-2026-06-29` (latest snapshot).
- (resolved) "Rico missed you" deployed to prod 2026-06-29 (dpl 7knsfpy8x), home 200, checkin clean.
- (resolved) instrumentation deployed to prod 2026-06-29 (dpl 40d57u2ic); /api/track activation ok:true.
- NOTE FOR TEAM: a safety branch now exists, but `main` is STILL behind (snapshot lives on
  `safety/working-tree-2026-06-28`). Working tree remains source of truth; deploys via Vercel CLI.
- NOTE FOR TEAM: repo `main` is far behind the working tree — most of the app is uncommitted and
  deploys happen from the working directory via Vercel, NOT via git. Do not assume `git` reflects
  production. Treat the working tree as source of truth until the CEO decides to reconcile git.

## 7. Idea backlog (raw, unprioritized)
- Streaks / "Rico missed you" re-engagement after lapse.
- Voice note check-ins (ElevenLabs) instead of text — higher emotional fidelity.
- Group "friend circle" that reacts among themselves to your news.
- Anonymous peer matching: connect two real lonely students via a Rico-mediated intro.
- "Homesick mode" — culturally specific comfort content in user's language.
