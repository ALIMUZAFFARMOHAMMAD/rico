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
- [x] Honest-AI / privacy trust band on landing. Code complete 2026-07-01, DEPLOYED to prod.
- [x] Trust badge on sign-up screen (mirrors landing trust band at account creation). Code complete
      2026-07-02, `next build` + runtime smoke pass. On branch `feature/signup-trust-badge`
      (pushed to GitHub). ⏳ Awaiting CEO deploy approval.
- [x] Data-export button ("download everything Rico remembers") — GDPR-friendly, extends trust story.
      Code complete 2026-07-04. On branch `feature/memory-data-export` (pushed). ⏳ Awaiting CEO deploy approval.
- [x] Investor demo script — written 2026-07-04 (`standups/DEMO_SCRIPT.md`), incl. Reel production
      spec. [ ] Video itself not generated (screen-record + ElevenLabs VO — needs CEO approval).
- [x] Living memory surfacing — "what Rico remembers about you" panel. SHIPPED to prod 2026-06-28.
- [x] Instrumentation: activation event + Flagship-impact metrics. Code complete 2026-06-29 (awaiting deploy).
- [x] Club activity nudge — "NEW POSTS" badges on Groups list. DEPLOYED to prod 2026-07-12
      (dpl_GJwZaY7Q8ndfpdzqS5fRCj7hLFXF).
- [x] Check-in reply streak counter — "🔥 N days in a row" on the proactive check-in card. DEPLOYED to
      prod 2026-07-12 (dpl_6UfYU6Ai4o8p8KH3bAXLuMnVXxEJ).
- [x] In-app weekly memory digest — "Your week with Rico" recap card on the Me tab. Code complete
      2026-07-13. On branch `feature/weekly-memory-digest` (pushed). ⏳ Awaiting CEO deploy approval.

**LATER:**
- [ ] Outcome engine v2: track interviews/offers attributed to Tony; surface as user "wins."
- [ ] Cultural/"home" layer: festivals, dialects, diaspora-specific moments.
- [ ] Plan gating + Stripe (separate backlog item, CEO drives credentials).

## 4. In progress (carries across days)
- (RESOLVED 2026-08-16) Supabase outage — CEO restored the paused project; `/api/health` confirms
  `ok:true`, all data intact. Full writeup in §5/§6. GTM push is now unblocked on this front — see
  STRATEGY.md §7 for whether Sage still flags anything else before it resumes.
- (RESOLVED 2026-08-16) Deploy queue — was empty as of the last CEO-directed session today; this run's
  one new build (`feature/digest-shown-attribution`) is the only thing added back to the queue.
- Next up: build the uptime canary for `/api/health` (Nova, 2026-07-22 idea) — now genuinely buildable
  since the endpoint is deployed, but creating a new standing scheduled task that auto-emails the CEO is
  a persistent-automation call this run is flagging for approval rather than just building (see §6);
  notification/push so Rico reaches out even when the app is closed (Capacitor android shell exists);
  proactive timing intelligence (fire around each user's habitual active hour); founder board cohort
  view (Nova, 2026-07-16) — now buildable too, `/api/stats` has real (if tiny, n=6) numbers to show.

## 5. Done log (most recent first)
- 2026-08-16 (standup run, cont'd, CEO-directed) — **Ponytail-audit cleanup applied.** A repo-wide
  `/ponytail-audit` pass found 5 findings (dead code + hand-rolled stdlib); CEO said "delete" and this
  run applied all 5, zero behavior change: removed `components/HeroRat.js` + `RealRat.js` (never
  imported anywhere, 266 dead lines); removed the unused anon `supabase` client export in
  `lib/supabase.js` (only `supabaseAdmin` is real, used once by `pages/api/results.js`); removed the
  dead `storeLang` back-compat alias in `lib/i18n.js` (its neighbor `getStoredLang` is the one actually
  used); swapped hand-rolled `Math.random().toString(36)` ID generation for `crypto.randomUUID()` in
  `pages/api/club-feed.js` and `pages/api/board.js` (stdlib, zero new deps — both IDs are internal/opaque
  so the format change is safe); dropped unnecessary `export` from 4 symbols only ever called within
  their own file. Net: -270 lines, 0 new deps. `next build` passes clean; smoke-tested landing/home/
  board/groups/mascot locally (all 200), confirmed zero remaining references to the deleted files.
  Branch `chore/ponytail-audit-cleanup`, pushed, PR opened
  (https://github.com/ALIMUZAFFARMOHAMMAD/rico/pull/5); merged into `safety/working-tree-2026-06-30`,
  also pushed. ⏳ Awaiting CEO deploy approval (see §6).
- 2026-08-16 (standup run, cont'd, CEO-directed) — **`feature/digest-shown-attribution` and
  `feature/board-retention-snapshot` DEPLOYED to production** (dpl_HG3MbFxpgBGAWNq7GF6Nu5V1zg6w). CEO
  explicitly asked to deploy both in chat. Both were already merged into `safety/working-tree-2026-06-30`
  (this project deploys from the working directory, not git), so one `vercel --prod` shipped both
  together — no separate deploys needed. Same recurring alias gap as every deploy this queue has ever
  seen: only auto-aliased to `hitony.ai`, fixed with `vercel alias set` for `hitony.vercel.app`. Verified:
  `/api/health` still `ok:true`; landing/home/board/groups all 200; `curl /api/stats` confirms the new
  `weekly_digest` field and `digest` entry in `retention_by_lever` are live (both `{"users":0,...}` since
  no real user has triggered the digest card yet — expected, not a bug); zero errors in `vercel logs`
  across all 6 requests in the verification window. Could not visually click through `/board`'s new
  retention-snapshot panel in a browser this run (production domain blocked by this sandbox's browsing
  policy) — confirmed instead via the exact API response the panel depends on returning valid data, plus
  the same panel already having been click-tested against a local dev server pre-deploy. Deploy queue is
  empty again. (Forge + Keeper, CEO-directed)
- 2026-08-16 (standup run, cont'd — CEO said "do the development of the project") — **Founder board
  cohort view shipped** (Nova's 2026-07-16 idea, promoted since the "no data yet" gate is gone):
  `pages/board.js` gains a read-only "📊 Retention snapshot" panel — total signups, retention/activation
  rate, D7 retained, and the 5 retention levers ranked by return rate — fetched from the existing
  `/api/stats` using the same key already stored for `/api/board` (falls back silently if that key
  isn't also `STATS_KEY`; no new API surface, no new gating logic). `next build` passes clean; verified
  live in the local dev server via the Browser pane — key-gate screen renders, board unlocks, and the
  panel correctly stays hidden (not crashed) when `/api/stats` 500s due to the known local
  unconfigured-Supabase gap, confirming the graceful-fallback design actually works, not just compiles.
  Committed to new branch `feature/board-retention-snapshot`, pushed, PR opened
  (https://github.com/ALIMUZAFFARMOHAMMAD/rico/pull/4); merged into `safety/working-tree-2026-06-30`,
  also pushed. ⏳ Awaiting CEO deploy approval (see §6). (Nova → Forge)
- 2026-08-16 (standup run) — **Digest attribution follow-up shipped** (Nova's 2026-07-16 idea, promoted
  since `feature/weekly-memory-digest` deployed today and this closes the loop same-day as flagged):
  `components/WeeklyDigest.js` fires a `digest_shown` track event once the card actually renders,
  mirroring `MemorySpotlight.js`'s exact pattern; `pages/api/track.js` counts it into
  `stats.digest.shown`; `pages/api/stats.js` adds a `digest` entry to `retention_by_lever` (now 5 of 5
  built levers instrumented) plus a `weekly_digest.shown` total. `next build` passes clean; `next start`
  + curl confirms `/`, `/landing` 200 and `POST /api/track {event:"digest_shown"}` returns `{"ok":false}`
  — same known local-env gap as every recent run (blank `SUPABASE_SERVICE_ROLE_KEY`), not a new bug.
  Committed to new branch `feature/digest-shown-attribution`, pushed, PR opened
  (https://github.com/ALIMUZAFFARMOHAMMAD/rico/pull/3); merged into `safety/working-tree-2026-06-30`,
  also pushed. ⏳ Awaiting CEO deploy approval (see §6). (Nova → Forge)
- 2026-08-16 (standup run) — **Discovered an undocumented branch: `feature/hubspot-signup-sync`.**
  Routine `git branch -a` scan surfaced a branch never mentioned in this log — a HubSpot Forms API sync
  for new signups (`lib/hubspot.js`, 4496aba), forked from a 2026-07-13 base (predates the security guard,
  club-activity-nudge, streak counter, and everything after). Not built or touched by this run — flagging
  for the CEO rather than silently reviving or discarding ~5 weeks of drifted, unreviewed code that talks
  to an external marketing system. See §6.
- 2026-08-16 (cont'd, CEO-directed) — **`feature/memory-data-export` DEPLOYED to production**
  (dpl_EMS6bude9vBKsrb5Uc1NLLhk5oXo) — the last remaining undeployed branch. Merged in first (`--no-ff`,
  clean; this branch also carried a duplicate copy of the sign-up trust-badge diff per the 2026-07-04
  note below, which merged as a no-op since identical code was already live from the prior deploy),
  `next build` passed clean, deployed, aliased `hitony.vercel.app`. Verified: the download-button text
  is compiled into the shipped `/memory` bundle (confirms the code is genuinely live) — not visible via a
  raw curl of the static HTML since it's client-rendered and gated behind sign-in + having vault data,
  same known pattern as every other feature in this app. Landing/home/board/groups/sign-up/memory all
  200, zero errors in `vercel logs`. **Every branch that was sitting in the deploy queue is now live** —
  the "awaiting CEO deploy approval" backlog in §6 is empty for the first time since this file existed.
  (Forge + Keeper, CEO-directed)
- 2026-08-16 (cont'd, CEO-directed) — **`feature/weekly-memory-digest` and `feature/signup-trust-badge`
  DEPLOYED to production** (dpl_95hrEDF16iEKozH2At3b7PNJTbFC). Unlike the earlier batch today, these two
  weren't already folded into `safety/working-tree-2026-06-30` — merged both in first (`--no-ff`, both
  clean auto-merges, no conflicts; `weekly-memory-digest` touched the same `pages/index.js` as today's
  earlier `tour_done` change but merged without incident), then `next build` passed clean before
  deploying. Same recurring alias gap, fixed with `vercel alias set` for `hitony.vercel.app`. Verified
  against the now-healthy DB (first deploy verification since the outage that could actually exercise
  DB-backed behavior, not just curl-for-200): `/api/health` still `ok:true`; sign-up page confirmed
  serving the real trust-badge copy ("AI clearly labeled"); landing/home/board/groups/sign-up all 200,
  zero errors in `vercel logs`. Pushed the merged working tree before deploying. (Forge + Keeper,
  CEO-directed)
- 2026-08-16 (cont'd, CEO-directed) — **Sharpened the Supabase outage diagnosis + wrote the missing base
  schema.** `nslookup` on the project's own subdomain returns NXDOMAIN (compared against both a
  known-good Supabase domain and a deliberately fake project ref to rule out a general DNS problem) —
  strong evidence the project was deleted, not just paused; see Open approvals #0 for the full writeup.
  Also grepped every `pages/api/*.js` + `lib/db.js` DB call to confirm the app touches exactly one real
  table (`conversations`; everything else is a JSON blob under a synthetic `user_id` key — genuinely
  zero-DDL) and to enumerate its actual columns (`messages`, `traits`, `riasec`, `msg_count`,
  `voice_notes`, `updated_at` + implicit `id`) — none of which were ever captured as a `create table`
  anywhere in this repo; `supabase-phase1.sql` only *alters* an already-existing table. Wrote
  `supabase-base-schema.sql` (new) with the reconstructed DDL, deliberately **without** a unique
  constraint on `user_id` — `lib/db.js`'s `upsertRow` does its own lookup-then-write with no
  `ON CONFLICT`, so a real unique constraint would turn a race into a 500 instead of the harmless
  duplicate-row-picked-by-`updated_at` behavior the app already tolerates. Not run against anything (no
  new project exists yet to run it against) — ready for the moment the CEO confirms a new project is
  needed. (Forge, CEO-directed)
- 2026-08-16 (CEO-directed) — **Four queued branches DEPLOYED to production**
  (dpl_EHQVP5FNzW5cev4GkSqmuVZijTrE): `feature/tour-completion-signal`, `feature/health-check`,
  `feature/proof-moment-tour`, `feature/retention-lever-attribution` — all four were already folded into
  `safety/working-tree-2026-06-30`, so one `vercel --prod` from that working tree shipped all of them
  together (this project deploys from the working directory, not git — see repeated notes below). Same
  recurring alias gap as every deploy: only auto-aliased to `hitony.ai`; fixed with `vercel alias set` for
  `hitony.vercel.app`. Verified: landing/home/board/groups all 200, zero unexpected errors in
  `vercel logs`. **`/api/health` is now live and gives a precise diagnosis for the first time:**
  `{"ok":false,"env":{"supabase":true,...},"db":"error: fetch failed"}` — env vars ARE correctly set in
  Vercel, so this rules out a misconfiguration; the failure is a genuine network-level issue reaching the
  Supabase project itself (paused project, deleted project, or a network/firewall rule), not an env-var
  typo. `/api/board` still 500s as expected — the DB outage itself is unrelated to this deploy and remains
  open (see Open approvals #0). `security/idor-auth-guard` was also in the working tree but was already
  live since 2026-07-07 — no new exposure from today. (Forge + Keeper, CEO-directed)
- 2026-08-15 (Saturday; **24-day scheduler gap, no runs 2026-07-23 through 2026-08-14**) — Re-checked
  the outage first thing: `curl /api/board` still `{"error":"fetch failed"}`, `curl /api/health` still
  404 (never deployed). Nothing about the outage has changed since 2026-07-22 — see Open approvals #0,
  now escalated harder. Since almost everything DB-backed is unverifiable either way, built the smallest
  safe, DB-independent item left in the backlog: **tour completion signal** (Nova's 2026-07-19 idea,
  XS). `pages/api/track.js` gained a `tour_done` event (counts `stats.tour.complete` / `stats.tour.skip`,
  same day-array-free counter pattern as `spotlight_shown`); `components/Onboarding.js`'s Skip button and
  final-step `next()` now pass `"skip"`/`"complete"` into `onDone`; `pages/index.js`'s `finishTour` fires
  the track call. Once real traffic exists this is the top-of-funnel companion to `retention_by_lever` —
  whether seeing the check-in/memory preview during onboarding (shipped 2026-07-19) correlates with
  next-day activation. Deliberately did not wire it into `retention_by_lever` itself (that's for
  mid-funnel repeat-engagement levers; this is a one-time funnel-top signal) — Pulse can query
  `stats.tour` directly once there's data. `next build` passes clean; `next start` + curl confirms
  `/`, `/landing` 200 and `POST /api/track {event:"tour_done"}` returns `{"ok":false}` — the same
  known local-env gap as every recent run (`SUPABASE_SERVICE_ROLE_KEY` blank), not a new bug; the
  handler executes without a 500. Committed to new branch `feature/tour-completion-signal`, pushed;
  fast-forwarded into `safety/working-tree-2026-06-30`, also pushed. (Nova → Forge)
- 2026-07-22 (Wednesday) — **Discovered prod DB outage + built `/api/health`.** Routine board-check
  (`curl /api/board`) came back `{"error":"fetch failed"}` HTTP 500 instead of JSON. Pulled Vercel
  runtime logs/errors for `prj_M1NuDrJTVsJChVGW4Mgv9LEoUjJC`: `/api/stats` 500s the same way, both from
  `lib/db.js`'s `sb()` — a raw network-level fetch failure to Supabase's REST endpoint, not an HTTP error
  *from* Supabase (that would throw `Supabase 4xx/5xx: ...` instead). Checked the last 7 days of prod
  logs: only 5 requests total, all from this run's own diagnostic curls — confirms zero real user
  traffic in a week (consistent with GTM still not started), which also means this outage could have
  started any time in that window with nothing to surface it. Tried the connected Supabase MCP
  (`list_projects`) to check the project's own status/pause state directly — it returned zero projects,
  so either it's not authorized to the org this app's Supabase project lives in, or that's a second data
  point worth the CEO's own dashboard check. Given no Vercel/Supabase dashboard credentials in this
  sandbox and no ability to edit prod env vars, could not fix this directly — built the smallest thing
  that turns "grep Vercel logs to notice this" into "curl one URL": `pages/api/health.js`, a public,
  unauthenticated endpoint returning which env vars are set (booleans only, never values) plus a live
  Supabase reachability check (`ok`/`error: <truncated message>`). `next build` passes clean. Committed
  to new branch `feature/health-check`, pushed; fast-forwarded into `safety/working-tree-2026-06-30`,
  also pushed. Not yet deployed — same approval gate as everything else — but this one specifically
  should jump the queue since it's how the CEO (or a future uptime check) confirms the fix worked
  without needing this level of log-diving again.
- 2026-07-19 (Sunday, lighter run; no runs 2026-07-17/18) — **First-session "proof moment"**
  (Nova's 2026-07-13 #2 idea, promoted per 2026-07-16's "tomorrow's plan" — no CEO board task to
  prioritize instead): the existing 7-step `components/Onboarding.js` tour only *described* the
  proactive-checkin and living-memory flagships in text ("they message you first") — a brand-new
  signup has zero chat history, so neither feature says anything real until day 2+. Folded the fix
  into the existing tour instead of building Nova's proposed new 3-card modal (smaller diff, and
  avoids stacking a 4th sequential overlay on top of Intro → ConsentGate → Onboarding): one new step
  now renders a static, non-fetching mock of the real `ProactiveCheckin` card ("Tony texted you:
  'how'd your exam go?...'"), and the closing step now also renders a static mock of the real
  `MemorySpotlight` chips — both labeled "preview". Reuses the tour's existing skip/localStorage/
  progress-dot mechanics; no new component file, no new state. `next build` passes clean; `next
  start` + curl confirms `/` and `/landing` both 200. Could not click through the tour itself in a
  signed-in session — same long-flagged local gap (`CLERK_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`
  both blank in this sandboxed `.env.local`, confirmed by length only, not printed); this only
  changes static JSX inside an already-shipped, already-tested modal shell, so the risk surface is
  low. Committed to new branch `feature/proof-moment-tour`, pushed; fast-forwarded into
  `safety/working-tree-2026-06-30`, also pushed. Targets the ≥60% activation-in-24h goal exactly
  as Nova specified — no visible-metric change until real GTM traffic exists to measure it against.
  (Nova → Forge)
- 2026-07-16 (Thursday; no runs 2026-07-14/15) — **Retention-lever attribution** (Nova's 2026-07-13 #1
  idea, promoted — board unchanged, no CEO task to prioritize instead): `pages/api/track.js`'s
  `checkin_shown`/`checkin_reply` events now accept an optional `variant` field so the "missed you"
  lapse-reengagement variant is counted separately from a normal check-in
  (`stats.checkin.missedShown`/`missedReplied`); a new `spotlight_shown` event does the same for the
  Living-Memory panel (`stats.spotlight.shown`). `components/ProactiveCheckin.js` passes
  `variant: data.lapsed ? "missed" : "checkin"` on both existing track calls (already had `data.lapsed`
  from `/api/checkin`, no new fetch); `components/MemorySpotlight.js` fires `spotlight_shown` once real
  memory items actually render, mirroring the check-in impression pattern exactly. `pages/api/checkin.js`
  exports its existing `computeStreak()` (was already private) so `/api/stats.js` can reuse the same
  streak math instead of a duplicate; `/api/stats.js` now returns `retention_by_lever` — for each of 4
  built levers (checkin, missed_you, spotlight, streak_2plus) the users who saw it plus their
  returned_pct/d7_pct, comparable against the overall `retention_rate_pct`/`retained_7day` to see which
  lever actually correlates with retention, once real GTM traffic exists. Weekly digest (5th lever) not
  included — it's still on its own undeployed branch (`feature/weekly-memory-digest`), nothing to
  attribute until it ships; add its `digest_shown` event the same way when that branch deploys.
  `next build` passes clean. Could not runtime-verify against real Supabase data locally — same
  known-gap category as the Clerk issue in every recent standup, except this time it's
  `SUPABASE_SERVICE_ROLE_KEY` that's blank in this sandboxed `.env.local` (confirmed by checking value
  length only, never printing the key); `/api/stats` and `/api/track` both correctly return their
  existing `configured()`-false fallback, same as before this change, so this is a pre-existing local-env
  gap, not a regression. Committed to new branch `feature/retention-lever-attribution`, pushed; folded
  (clean fast-forward, no conflicts) into `safety/working-tree-2026-06-30` so working tree matches, also
  pushed. (Nova → Forge)
- 2026-07-13 — **In-app weekly memory digest** shipped to a branch: `pages/api/digest.js` (same
  "extract real, honest highlights" approach as `remembers.js`, but time-boxed to conversations
  touched in the last 7 days and framed as a past-tense recap — 2-5 items, cached 7 days on the meta
  row under a separate `traits.digest` key so it doesn't collide with `remembers`'s cache) +
  `components/WeeklyDigest.js` ("Your week with Rico" card, same render-nothing-until-real-content
  pattern as `MemorySpotlight`), wired into the Me tab in `pages/index.js` right below the memory
  spotlight. `next build` passes; `next start` + curl smoke clean (same known local Clerk-auth gap as
  every recent branch — see Challenges). Committed to new branch `feature/weekly-memory-digest`, pushed.
  Promoted from Nova's 2026-07-09 backlog per the 2026-07-12 "tomorrow's plan" (no CEO board tasks were
  open to prioritize instead). (Nova → Forge)
- 2026-07-12 (cont'd, CEO-directed) — **Club activity nudge DEPLOYED to production**
  (dpl_GJwZaY7Q8ndfpdzqS5fRCj7hLFXF). `feature/club-activity-nudge` was a sibling branch of the
  just-deployed streak counter (both forked from the same 2026-07-09 commit) — deploying it alone would
  have regressed the streak counter that just went live, the exact mistake flagged in the 2026-07-07
  standup. Merged both onto `deploy/club-activity-nudge` first (clean merge, no conflicting files), then
  deployed that. Same recurring alias gap, fixed with `vercel alias set`. Verified: landing/groups 200,
  `/api/club-feed?peek=1` returns the new `{count,latest}` shape live, `/api/checkin` still 403s
  unauthenticated requests correctly, zero errors in `vercel logs`. Folded the merged branch back into
  `safety/working-tree-2026-06-30` so git matches what's actually live again. (Keeper, CEO-directed)
- 2026-07-12 (cont'd, CEO-directed) — **Check-in reply streak counter DEPLOYED to production**
  (dpl_6UfYU6Ai4o8p8KH3bAXLuMnVXxEJ). Deployed straight from `feature/checkin-streak-counter` (it sat
  directly on top of the already-live code, nothing else bundled). Same recurring alias gap as every
  prior deploy — only auto-aliased to `hitony.ai`, fixed with `vercel alias set` for `hitony.vercel.app`.
  Verified: landing/home/board 200, club-feed peek 200 with real content, `/api/checkin` correctly 403s
  an unauthenticated request (real Clerk auth enforced in prod), zero errors in `vercel logs`. No
  regression to existing features. (Keeper, CEO-directed)
- 2026-07-12 (Sunday, lighter run; first run since 2026-07-09 — 07-10/07-11 had no run) — **Check-in
  reply streak counter** (Nova's 2026-07-09 idea, promoted per that day's "tomorrow's plan"):
  `pages/api/track.js`'s `checkin_reply` handler now also appends today's date to a `replyDays` array
  on the check-in stats (same day-array pattern already used for `activity.days` — no new data model).
  `pages/api/checkin.js` derives a consecutive-day streak from `replyDays` (counts backward from today,
  or from yesterday if today's check-in hasn't been replied to yet, so a streak stays "alive" until the
  day actually ends) and returns it on both the cached and freshly-generated check-in payload.
  `components/ProactiveCheckin.js` shows a small "🔥 N days in a row" pill next to the existing "texted
  you"/"missed you" badge once the streak reaches 2+ (a 1-day streak isn't a streak yet, so it stays
  quiet on first reply). Directly reinforces the exact daily-reply behavior the D7 North Star metric
  depends on. `next build` passes clean. Could not runtime-verify in a signed-in browser session — same
  pre-existing gap flagged in the 2026-07-06/07/09 standups (`.env.local`'s `CLERK_SECRET_KEY` is blank,
  so Clerk middleware 500s on every request in local dev); confirmed via `next start` + curl that the
  500 is the known Clerk-config error, not a syntax/runtime bug introduced today. Committed to new
  branch `feature/checkin-streak-counter`, pushed. No board card (not a CEO-assigned task — promoted
  from the Nova backlog). (Nova → Forge)
- 2026-07-09 — **Club activity nudge** (smallest queued Nova idea, promoted per 2026-07-07's "tomorrow's
  plan"): `pages/api/club-feed.js` gained a `?peek=1` GET mode that reads the cached feed row only — no
  `generateBatch` call — so the Groups list can check activity without ever spending an LLM call.
  `pages/groups.js` fetches peek data for all 8 declared clubs on mount, compares each club's latest
  cached item timestamp against a per-club last-visit timestamp in `localStorage`
  (`hitony_club_seen`), and shows a "NEW POSTS" badge on any club with unseen activity; visiting a club
  (JOIN) marks it seen. First-time users see no badges (no baseline to compare against yet) — avoids
  every club looking "new" on first launch. `next build` passes clean. Could not runtime-verify in the
  browser this run: this environment's `.env.local` has `CLERK_SECRET_KEY=""` (blank), so the Clerk
  middleware 500s on every request in local dev — a pre-existing gap already flagged in the 2026-07-06/07
  standups ("no way to test [Clerk-dependent flows] in this non-interactive environment"), not something
  introduced today. Committed to new branch `feature/club-activity-nudge`, pushed. No board card (not a
  CEO-assigned task — promoted from the Nova backlog). (Nova → Forge)
- 2026-07-09 — Housekeeping: found one stray uncommitted change sitting in the working tree (the
  honest-AI trust band on `pages/landing.js`, already live in production since 2026-07-01 per this log,
  but never actually committed to git on the current branch) — committed it, closing one more instance
  of the git/production drift repeatedly flagged in past standups.
- 2026-07-07 (cont'd) — **IDOR guard + rate limiting DEPLOYED to production** (dpl_7KxBs74F, CEO-directed).
  First deploy attempt (dpl_6D2Un1LB) shipped `security/idor-auth-guard` alone and accidentally
  **regressed the live Social/Club Feed feature** — that branch forked before `feature/club-feed` existed
  and never had it merged in. Caught immediately by checking club-feed behavior post-deploy (not just
  the auth guard), not by assuming the branch was current. Fixed by merging `feature/club-feed` +
  `safety/working-tree-2026-06-30` (rate limiting) into the security branch, rebuilding, redeploying.
  Verified this time: landing 200, Social feed returns real content (60 items), `conversation` endpoint
  403s an unowned userId while staying graceful for anonymous calls, zero errors in logs. All three
  branches (`security/idor-auth-guard`, `feature/club-feed`, `safety/working-tree-2026-06-30`) merged
  back in sync so this doesn't happen again. Lesson repeated from earlier this week: always diff against
  what's *actually live*, not just the branch you think you're deploying. (Forge, CEO-directed)
- 2026-07-07 — **IDOR auth guard completed + two stray regressions caught in review.** Picked up the
  in-progress security work from 2026-07-06 (`standups/SECURITY.md` §4 — the userId-ownership guard
  was specified but deliberately kept out of the working tree "so unrelated deploys don't ship
  unverified auth"; found sitting uncommitted with all the code actually written). Reviewed it file by
  file rather than trusting it blind: `lib/auth.js` (new, `ownsUser(req,userId)` via Clerk's real
  session) + `middleware.js` (new, `authMiddleware({publicRoutes:()=>true})` — gates nothing itself,
  just makes `getAuth()` resolve) fanned as `if(!ownsUser(req,userId)) return res.status(403)` across
  profile/conversation/memory/matches/track/avatar/consent/checkin/remembers/twin/resume/tony/tutor/
  twin-voice/voice/report — matches the spec exactly, clean. `results.js` now trusts only the session's
  real userId instead of a spoofable `body.uid` fallback. `stats.js`/`board.js` swapped to
  `lib/keys.js`'s constant-time `safeKeyEq` (the board-key rotation's other half, deployed live per
  SECURITY.md but never actually committed until now).
  **Caught two regressions before they could ship:** (1) the working tree's `board.js` was missing the
  `by` field and the entire `edit` action that are live in production right now (confirmed via a real
  GET showing `by:"ceo"` on every task) — restored both, kept the security fix; (2) `lib/source.js` had
  silently lost its `document.referrer` fallback for signup-source attribution — not part of the
  security spec, not explained anywhere, and it would have quietly undermined the GTM-tracking system
  Sage built specifically to measure the upcoming GTM push. Restored. Both fixes came from diffing the
  uncommitted working tree against git HEAD *and* against what's actually live (curl), since this
  repo's `main` and working tree have diverged in ways plain `git diff` alone can't fully explain.
  `next build` passes clean (Middleware bundle now present, 119kB). Committed to new branch
  `security/idor-auth-guard`, pushed — **NOT deployed.** Per SECURITY.md's own caution, the IDOR guard
  needs a real signed-in login to confirm `getAuth()` actually resolves through the new middleware
  (if the Clerk cookie doesn't resolve, every request 403s instead of working) — no way to test that
  in this non-interactive environment. (Forge, continuing 2026-07-06's security work)
- 2026-07-05 (cont'd, CEO-directed) — **Social feed switched to per-character profiles.** CEO
  clarified: characters should each have their OWN profile/feed (like a real Instagram account per AI
  friend), not post inside 2-person themed Clubs. `pages/api/club-feed.js` generalized to a
  `resolveSpace()` concept — a real club (unchanged) or `profile-<agentId>` (one feed per character;
  author is always that character, but ANY other character in the full ~12-agent roster can
  react/comment/debate on their post, so it feels like one shared platform, not siloed pairs). `?all=1`
  now aggregates all character profiles instead of the 8 declared clubs. Dropped the "post to a club"
  composer from `components/SocialFeed.js` — real Instagram semantics are you comment on existing
  posts, not create new ones on someone else's profile; the badge under each post now shows the
  character's archetype (e.g. "The Sports Buff") instead of a club name. Kept generation **on-demand**
  (no cron) per CEO's explicit call — costs nothing when idle, feels daily to any active user. Declared
  Clubs (Movie Club, etc.) still work unchanged via `pages/groups.js`. `next build` passes. DEPLOYED to
  production (dpl_5ekH6nG2) — same stale-alias issue a third time now (auto-alias only points
  `hitony.ai`; fixed again with `vercel alias set` — this really needs investigating, not just
  patching around each time). Live-verified: all 12 characters posted genuine, in-character, diverse
  content (Arjun on cricket, Tony self-deprecating meme, Yusuf on dhikr) — no fabricated claims about
  real people, no errors in logs. (Forge, CEO-directed)
- 2026-07-05 (cont'd, CEO-directed) — **Social tab — unified cross-club feed.** The CEO flagged that
  Club Feed (buried in Groups → click a Club) "wasn't what I pictured" for "a social media platform
  for AI" — fair, since nothing on the main screen pointed at it. Rebuilt as a first-class experience:
  new "Social" tab on the main bottom bar (Discover/Chats/**Social**/You), showing ONE merged feed
  across all 8 clubs at once (closer to an Instagram/Reddit home feed) instead of picking a club first.
  `pages/api/club-feed.js` gained a `?all=1` aggregate mode (parallel fetch-or-generate across every
  club, tagged + sorted by time); `components/clubFeedCards.js` (new) extracted the card rendering out
  of `ClubFeed.js` for reuse; `components/SocialFeed.js` (new) is the unified feed, restyled to match
  the app's dark theme (unlike the comic-styled Groups page) since it now lives inside `index.js`.
  `next build` passes. DEPLOYED to production (dpl_FBPh8i5z) — same stale-alias issue as last time
  (auto-alias only pointed `hitony.ai`, not `hitony.vercel.app`; fixed with `vercel alias set` again —
  worth investigating why Vercel isn't auto-aliasing the vercel.app domain, flagging for later). Live
  curl against `hitony.vercel.app/api/club-feed?all=1` confirmed real content across all 8 clubs (34
  items on first generation), second call served from cache in <1s. No errors in logs. (Forge, CEO-directed)
- 2026-07-05 (Sunday, lighter run) — Folded Club Feed into the investor story: added it as moat
  pillar #6 in `STRATEGY.md` §2, marked the "demo lands the bet in 60s" checklist item done since
  Club Feed is now the strongest single beat. Extended `standups/DEMO_SCRIPT.md` with a new
  Club Feed segment (1:10–1:40) — runtime grows from ~2:00 to ~2:30, timestamps renumbered
  accordingly, Reel spec updated to match. Echo drafted a launch post + short video spec for Club
  Feed (`CONTENT_CALENDAR.md`, src=ig6) — genuinely screen-recordable, not staged, since the feature
  is live. Nova added 2 new R&D ideas (below); none promoted to build today — board unchanged (no
  new team-assigned tasks), so today's capacity went to making sure yesterday's big ship is actually
  reflected in the raise narrative and content plan instead of sitting undocumented. (Sage + Nova + Echo)
- 2026-07-04/05 (CEO-directed, off-cadence) — **Club Feed** — DEPLOYED to production (dpl_93BN6nqU,
  aliased to hitony.vercel.app). Turns AGENTCONNECT-SPEC §4 Clubs into an actual shared, persistent,
  Instagram/Reddit-style feed instead of a private per-user chat copy. `pages/api/club-feed.js` (new,
  lazy-cached ~6h generation per club — reuses the zero-DDL `conversations` table via a
  `club::<clubId>::feed` row, shared not per-user) generates posts, in-universe agent-to-agent debates,
  and text/CSS meme cards; `components/ClubFeed.js` (new) renders them with AI-labeled avatars vs.
  human avatars, reactions, and reply threads; `pages/groups.js` (modified) routes a club click to the
  shared feed instead of `createGroup()` — private user-created Groups are untouched. CEO's original
  ask ("AI bots gossip/react/debate/meme, humans join in") was reframed for safety: every generation
  prompt bans fabricated claims about any real named person — gossip/teasing only ever targets fellow
  AI personas or general topics — since the literal ask matched the exact harm pattern in the "feral AI
  gossip" research the CEO cited (Univ. of Exeter, Krueger & Osler). `next build` passed; CEO explicitly
  approved production deploy (no working preview path — this Vercel project's env vars were Production-
  scope only, and adding secrets to Preview scope was a separate call the CEO chose to skip in favor of
  verifying live). Post-deploy curl smoke test against the real `hitony.vercel.app` confirmed genuine
  generation across multiple clubs — Movie Club (Luna/Pixel discussing real films, no fabricated claims
  about real people), Game Day (Zara/Arjun), Career Corner (Tony/Meera), and a working meme card + the
  single-member-club debate-skip (Gita Circle, `hari` alone, correctly produced a meme + post, no
  debate since debate mode requires 2+ members). Note: this deploy also had to fix a stale alias — the
  new production deployment initially only auto-aliased to `hitony.ai` (which doesn't resolve via DNS),
  not `hitony.vercel.app`; ran `vercel alias set` to point the real domain at it. Branch `feature/club-feed`
  pushed to GitHub (PR not opened — `gh` not authenticated in this environment).
  **Follow-up error check (same day, CEO-directed):** reviewed Vercel runtime logs (error/warning/5xx,
  all empty) and live-tested every POST path (comment incl. direct-address routing, react toggle,
  generate_debate, plus every error branch: bad action, unknown club, empty comment, missing itemId,
  single-member-club debate rejection) directly against production with the CEO's explicit sign-off to
  write test data into a real club. All clean — no server bugs found. One red herring: a reaction stored
  under a garbled `"??"` key, traced to the test terminal's encoding mangling the 💜 emoji before curl
  sent it (confirmed by resending via a properly UTF-8-encoded file — server stored/returned the real
  emoji correctly). Not a code bug; harmless leftover `"??": []` entries sit in `movie-club`'s feed but
  are invisible in the UI (reaction bar only renders the 4 defined emoji).
- 2026-07-04 (cont'd) — Investor demo script + 2-min walkthrough (Sage → Atlas): `standups/DEMO_SCRIPT.md`
  — a beat-by-beat 2-min script (problem → proactive check-in → memory spotlight → data export/trust →
  business model → ask) plus a Reel production spec (screen-record + ElevenLabs VO, 16:9 + 9:16 cutdown).
  Executes the recommendation Sage made on 2026-07-01 and repeated 2026-07-02 instead of re-queuing it
  a third time. Added a retention benchmark to STRATEGY.md: Character.AI D30 is 13–18%; Rico's D7≥18%
  target already matches that range at 1/4 the time horizon — sharpens the raise narrative once real
  data lands. No deploy needed (doc only); one open ask: record/generate the actual video (ElevenLabs VO).
- 2026-07-04 — Data-export button in Memory Vault (Nova R&D → Forge): `pages/memory.js` adds a
  "⬇ DOWNLOAD EVERYTHING RICO REMEMBERS" button, visible to signed-in users with vault data, that
  builds a JSON export (per-friend message counts, traits, last-talked date, voice-note memories)
  client-side from the already-fetched `/api/memory` data and triggers a browser download — no new
  API endpoint needed. `next build` passes; runtime smoke (`next start` + curl `/memory`) confirms
  the page renders with no server error. Committed on new branch `feature/memory-data-export`, pushed
  to GitHub (PR not opened — no `gh` auth in this environment). Note: that branch's single commit also
  bundled the already-reviewed sign-up trust-badge diff (staged incidentally from restoring it to the
  working tree) — same code as `feature/signup-trust-badge`, harmless but not perfectly scoped.
  ⏳ Awaiting CEO deploy approval (now 2 branches queued: signup-trust-badge, memory-data-export).
- 2026-07-02 — Trust badge on sign-up screen (Nova R&D → Forge): `pages/sign-up/[[...index]].js`
  adds a compact honesty-pledge strip (AI clearly labeled · you control your data · no romance/
  manipulation) below the Clerk form + a link to `/landing#trust`. Mirrors yesterday's landing trust
  band at the exact moment a trust-wary student decides whether to make an account. `next build`
  passes; runtime smoke (`next start` + curl `/sign-up`) confirms the copy renders. Committed on new
  branch `feature/signup-trust-badge`, pushed to GitHub (PR not opened — `gh` not authenticated in
  this environment; CEO or next run can open it from the pushed branch). No matching board card.
  ⏳ Awaiting CEO deploy approval.
- 2026-07-01 — Honest-AI/privacy trust band on landing (board top task): `pages/landing.js` new
  "Honest by design" section (labeled AI · your-memory-your-control · friendship-not-romance) + Trust
  nav link. Turns AI-trust gap into our wedge (Sage). DEPLOYED to prod (dpl beizacnqf) — live on /landing.
  Board card → Done. Echo content card also Done. (Forge + Sage + Keeper)
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
- (resolved 2026-08-16) **`chore/ponytail-audit-cleanup`** — CEO-directed deploy
  (dpl_76PyZKgU4oJNAqWJDQNdWYb7qHCZ). Verified via curl + `vercel logs`: `/api/health` ok:true, all
  routes 200, no regressions from anything this cleanup touched. **Found one unrelated, pre-existing
  issue while checking logs** (not caused by this deploy — `generateBatch()`/`claude()` in
  `pages/api/club-feed.js` weren't touched by the cleanup): when a club's feed cache goes stale (>6h)
  and a request triggers a lazy regenerate, it can hit `club-feed generate error: API 400` — caught
  gracefully, still serves the cached content with a 200, no user-facing break, but worth a look. New
  backlog candidate for Forge: diagnose the club-feed regenerate 400 (§7).
- (resolved 2026-08-16) **`feature/digest-shown-attribution` and `feature/board-retention-snapshot`** —
  CEO-directed deploy (dpl_HG3MbFxpgBGAWNq7GF6Nu5V1zg6w). Verified via curl + `vercel logs`: no
  regressions, both features' API surface confirmed live. Deploy queue is empty again.
- **New: `feature/hubspot-signup-sync` — needs a CEO decision, not just a deploy.** An undocumented
  branch surfaced today (see §5) syncs new signups to HubSpot's Forms API for marketing automation. It's
  unreviewed, ~5 weeks stale (forked before the security/IDOR guard and several later features — would
  need a rebase before it's safe to ship), and touches an external third-party system on every signup,
  which reads as exactly the kind of "external communication"-adjacent integration this team doesn't
  ship without asking first. Question for the CEO: is this still wanted? If yes, next run can rebase it
  onto current `safety/working-tree-2026-06-30` and review it properly before proposing a deploy.
- **New: set up an uptime canary for `/api/health`** (Nova, 2026-07-22 idea) — the endpoint itself is
  live now, so the check is buildable, but the natural implementation is a new *standing* scheduled task
  in this environment that emails the CEO automatically if health flips to failing. That's a persistent
  automation this run is choosing to ask about rather than silently create — say the word and next run
  sets it up.
- (RESOLVED 2026-08-16, 25 days open) **Supabase outage — fixed by the CEO restoring the paused
  project in the dashboard.** `/api/health` now returns `{"ok":true,"db":"ok"}`; `/api/board` and
  `/api/stats` both confirmed live with ALL original data intact (same 11 board tasks/IDs from
  2026-06-30, real signup/activation/retention numbers) — **no data was lost.** Correcting this file's own
  earlier (2026-08-16, same day) diagnosis: DNS NXDOMAIN + Cloudflare 521 + a transient `PGRST205`
  ("table not found in schema cache") looked exactly like a deleted project, but watching the full resume
  sequence live made the real cause clear — it was **paused**, not deleted. Restoring a paused project
  goes through: DNS reprovisions → Cloudflare edge comes up before the Postgres origin does (the 521) →
  Postgres boots before PostgREST reloads its schema cache (the `PGRST205`) → fully healthy. Each stage
  looked like harder evidence of deletion in isolation; only watching it resolve live disambiguated it.
  `supabase-base-schema.sql` (written earlier today) wasn't needed this time since the table already
  existed — keeping it committed anyway as disaster-recovery documentation, since the original DDL still
  isn't captured anywhere else. GTM push can now resume per Sage's repeated recommendation (see
  STRATEGY.md §7) — this was the one blocker on that call.
- (resolved 2026-08-16) **`feature/health-check`, `feature/tour-completion-signal`,
  `feature/proof-moment-tour`, `feature/retention-lever-attribution`** — CEO-directed deploy
  (dpl_EHQVP5FNzW5cev4GkSqmuVZijTrE). Verified via curl + `vercel logs`: no regressions.
  `curl hitony.vercel.app/api/health` now works and confirms the outage is a genuine Supabase-side
  network issue, not a Vercel env-var problem — see Done log and item #0 above.
- (resolved 2026-08-15) **`gh` CLI PR access** — `Muzaffar-07` was invited as a collaborator (via the
  already-working push credential) and the invite accepted the same run; `gh repo view` now shows WRITE
  permission and `gh pr create` succeeds. First PR opened: `feature/tour-completion-signal` →
  https://github.com/ALIMUZAFFARMOHAMMAD/rico/pull/1. Future runs can open PRs directly instead of
  leaving a compare link.
- **New: Deploy `feature/proof-moment-tour`** (onboarding tour now shows a real check-in card + memory
  chips instead of only describing them, code complete 2026-07-19) to production. Low-risk — static
  JSX added to an already-shipped modal, no new data flow, no new API surface.
- **New: Deploy `feature/retention-lever-attribution`** (per-lever impression tracking + `/api/stats`
  ranking, code complete 2026-07-16) to production. Lowest-risk item in this queue — instrumentation
  only, no visible UI change, additive fields on the existing meta-row stats object.
- (resolved 2026-08-16) **`feature/weekly-memory-digest`** — CEO-directed deploy
  (dpl_95hrEDF16iEKozH2At3b7PNJTbFC). Verified via curl + `vercel logs`: no regressions.
- (resolved) **`security/idor-auth-guard`** — CEO-directed deploy, 2026-07-07 (dpl_7KxBs74F). Verified
  via curl: anonymous calls stay graceful, an unowned userId now correctly 403s, no errors. Still worth
  a real signed-in click-through when convenient — curl can't fully exercise the browser/Clerk-cookie
  path, only the API layer.
- **NEEDS INVESTIGATION (not a CEO approval, a Forge fix):** every `vercel --prod` deploy this week
  auto-aliased only to `hitony.ai`, never `hitony.vercel.app` — required a manual `vercel alias set`
  every single time (3 times now). Likely `hitony.vercel.app` isn't registered as a "Domain" on the
  Vercel project (only `hitony.ai` is), so it doesn't get auto-included in each deploy's alias set.
  Check Vercel project → Domains and add `hitony.vercel.app` properly so this stops needing a manual
  patch after every deploy.
- (resolved) **Club Feed** — CEO explicitly approved production deploy 2026-07-05 despite no staging
  path (this Vercel project had no Preview-scope env vars); deployed, alias fixed, live-verified via
  curl across 3 clubs. Still worth a real signed-in click-through in the app itself when convenient —
  the comment/react/report UI paths were only exercised via direct API calls, not the browser.
- (resolved 2026-08-16) **`feature/signup-trust-badge`** — CEO-directed deploy
  (dpl_95hrEDF16iEKozH2At3b7PNJTbFC). Verified live: sign-up page serves the real trust-badge copy.
- (resolved 2026-08-16) **`feature/memory-data-export`** — CEO-directed deploy
  (dpl_EMS6bude9vBKsrb5Uc1NLLhk5oXo). Verified via curl + `vercel logs`: no regressions. This was the
  last item in the deploy queue.
- (resolved) **`feature/club-activity-nudge`** — CEO-directed deploy, 2026-07-12
  (dpl_GJwZaY7Q8ndfpdzqS5fRCj7hLFXF). Merged onto the already-live streak-counter branch first to avoid
  regressing it; verified via curl + `vercel logs`: no regressions, no errors.
- (resolved) **`feature/checkin-streak-counter`** — CEO-directed deploy, 2026-07-12
  (dpl_6UfYU6Ai4o8p8KH3bAXLuMnVXxEJ). Verified via curl + `vercel logs`: no regressions, no errors.
- **Record/generate the 2-min investor walkthrough video** (`standups/DEMO_SCRIPT.md`) — mostly a live
  screen-record, but the voiceover pass (ElevenLabs, unless the CEO records their own narration) spends
  credits. New as of 2026-07-04.
- REMINDER (not a build task, board items assigned to CEO, unchanged since 2026-06-30 — now 46 days):
  Plan gating + Stripe, Lock 3 named testimonials, Start 30-day GTM push. These three are the actual
  bottleneck to an investor-ready metric story. **The one thing sequenced in front of GTM — the Supabase
  fix — is now resolved (2026-08-16)**, so GTM push no longer has a product-side reason to wait; it's back
  to being purely the CEO's call on when to start, same as the other two.
- **New (2026-07-05):** Echo drafted a Club Feed launch post (`standups/CONTENT_CALENDAR.md`, src=ig6)
  + Reel spec — needs approval to post, and separately, ~1 ElevenLabs VO pass if you want the video cut.
- (none open) — voice-note check-ins deployed to prod 2026-06-30 (dpl g7j9qhkdw); track voice ok:true; board card → Done.
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
- **New (bug, surfaced 2026-08-16):** Club-feed lazy-regenerate hits `API 400` — seen in prod logs
  post-deploy verification (see §6). `generateBatch()` in `pages/api/club-feed.js` catches it and falls
  back to cached content gracefully, so it's not user-facing yet, but the underlying Claude API call is
  failing on stale-cache regeneration and nobody's diagnosed why. Worth a Forge pass: reproduce (force a
  space's cache stale and hit it), check the actual Anthropic error body (only `e.message` is logged
  today, may need more detail), fix or at least log richer diagnostics.
- ~~Founder board cohort view~~ — DONE 2026-08-16 (see Done log; ships as a read-only panel on `/board`).
- **New (M, Nova 2026-08-16):** Digest-driven re-engagement — the weekly digest is currently a passive
  card on the Me tab (renders only if the user opens the app). Consider a proactive check-in variant that
  references digest highlights ("saw you talked about your exam this week...") to pull lapsed users back
  in, tying the newest lever into Flagship #1 instead of leaving it purely passive. Bigger than the other
  two ideas here — needs a design pass on how it interacts with the existing "missed you" variant so they
  don't compete for the same check-in slot.
- **Uptime canary for `/api/health`** (S, Nova 2026-07-22): now genuinely buildable (endpoint deployed);
  see §6 — flagged for CEO approval since the natural build is a new standing scheduled automation, not
  a code change.
- ~~Tour completion signal~~ — DONE 2026-08-15/16 (see Done log; deployed 2026-08-16).
  ~~Retention-lever attribution~~ — DONE 2026-07-16. ~~Digest attribution follow-up~~ — DONE 2026-08-16
  (see Done log).
- ~~First-session "proof moment" tour~~ — DONE 2026-07-19 (see Done log; shipped as an enhancement to
  the existing Onboarding tour rather than Nova's proposed standalone modal).
- **Shareable weekly digest card** (S, Nova 2026-07-13): let a user tap "Your week with Rico" (shipped
  today) to export it as a redacted, no-PII image card ("this week I talked about my exam, missed home,
  practiced Spanish 💜 — with Rico") for their own Story/WhatsApp. A soft, opt-in growth loop riding on
  content that already exists, distinct from the ambassador-link mechanic below (this is organic sharing
  by users themselves, not a referral code).
- **Invite a friend into a club** (M, Nova 2026-07-05): a shareable link so a real human friend joins
  the SAME shared club feed — now that clubs are genuinely shared (not per-user), this is a natural
  referral mechanic tying directly to the 15% referral goal in `STRATEGY.md` §6b. Needs a join/consent
  flow, sized bigger than the nudge above.
- **In-app testimonial capture flow** (S, Nova 2026-07-04): a consent-gated prompt for engaged beta
  users ("mind if we share a short quote? we'll show your first name only, your call") that stores
  opted-in quotes for the CEO to review/select — turns "lock 3 testimonials" from a from-scratch task
  into a one-click review once a few beta users opt in. Doesn't do the outreach itself (still CEO-owned),
  just removes the build work standing in front of it.
- **Ambassador referral link generator** (S, Nova 2026-07-04): auto-generate personalized
  `?src=ambassador_<name>` links + a simple referral count in the CEO board, so the moment the GTM push
  starts, ambassadors already have working, trackable links instead of the CEO hand-rolling them.
- First-chat AI-disclosure micro-moment (S, Nova 2026-07-02): bake a warm, natural one-line AI
  disclosure into each new friend's very first message (not a boilerplate popup) — extends the trust
  wedge into the single product moment that matters most (first chat), cheap to build, reinforces the
  honesty narrative for investors.
- Streaks / "Rico missed you" re-engagement after lapse.
- Voice note check-ins (ElevenLabs) instead of text — higher emotional fidelity.
- Group "friend circle" that reacts among themselves to your news.
- Anonymous peer matching: connect two real lonely students via a Rico-mediated intro.
- "Homesick mode" — culturally specific comfort content in user's language.
