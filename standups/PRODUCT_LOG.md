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

**LATER:**
- [ ] Outcome engine v2: track interviews/offers attributed to Tony; surface as user "wins."
- [ ] Cultural/"home" layer: festivals, dialects, diaspora-specific moments.
- [ ] Plan gating + Stripe (separate backlog item, CEO drives credentials).

## 4. In progress (carries across days)
- Next up: notification/push so Rico reaches out even when the app is closed (Capacitor android shell exists);
  proactive timing intelligence (fire around each user's habitual active hour).

## 5. Done log (most recent first)
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
- **Deploy `feature/signup-trust-badge`** (sign-up trust badge, code complete 2026-07-02) to production.
- **Deploy `feature/memory-data-export`** (Memory Vault data-export button, code complete 2026-07-04) to production.
- **New (2026-07-09):** **Deploy `feature/club-activity-nudge`** (Groups list "NEW POSTS" badge, code
  complete 2026-07-09) to production. Low-risk (additive UI + a read-only API branch), but untested in a
  real signed-in browser session for the same Clerk-env reason as the security branch below.
- **Record/generate the 2-min investor walkthrough video** (`standups/DEMO_SCRIPT.md`) — mostly a live
  screen-record, but the voiceover pass (ElevenLabs, unless the CEO records their own narration) spends
  credits. New as of 2026-07-04.
- REMINDER (not a build task, board items assigned to CEO, unchanged since 2026-06-30 — now 5 days):
  Plan gating + Stripe, Lock 3 named testimonials, Start 30-day GTM push. These three are the actual
  bottleneck to an investor-ready metric story — product is now ahead of distribution/monetization proof.
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
- **Check-in reply streak counter** (S, Nova 2026-07-09): a small "X days in a row" counter on the
  proactive check-in card when a user replies to consecutive daily check-ins — cheap (derives from
  existing `track.js` check-in-reply events, no new data model) and a direct, visible reinforcement of
  the exact behavior the D7 North Star metric depends on.
- **In-app weekly memory digest** (M, Nova 2026-07-09): once a week, a card on the Me tab summarizing
  "what happened with your friends this week" (a few real highlights pulled from `remembers.js`-style
  extraction) — a lightweight, no-email-infra way to give lapsed users a reason to open the app, sized
  above the nudge but below full push notifications.
