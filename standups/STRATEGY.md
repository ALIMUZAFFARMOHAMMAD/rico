# Rico — Business Strategy (Sage's brain)

> Owned by Sage (business strategist). Read first, update last. This is the business
> layer above product: positioning, moat, monetization, market, fundraising, narrative.
> Goal: make Rico investable and improve the business — not just ship features.

## 1. Locked positioning (from CEO)
- **Sector:** Consumer AI / AI companions (NOT healthcare).
- **Beachhead:** The AI friend AND career mentor for international students far from home (esp. South Asian / diaspora).
- **Primary audience:** International students & recent grads (18–28). Secondary: language learners, early-career job seekers, lonely young adults wanting a non-romantic AI friend.
- **Positioning:** "For international students far from home, Rico is an AI companion that gives you a circle of honest AI friends — who remember you, talk and play with you, and help you figure out your career — so you feel less alone and more on-track, in your own language."
- **One-liner:** Character.AI is for play. Replika is for romance. ChatGPT is for tasks. Rico is for the people far from home who need a friend AND a leg up.
- **Tagline:** Your people, always.

## 2. The moat (why this compounds / is defensible)
1. **Proactive presence** — friends reach out first (shipped). Retention lever + "it's alive".
2. **Living memory** — friends remember across time (shipped); switching cost grows with use.
3. **Outcome engine** — Tony turns engagement into career wins; monetization + testimonials.
4. **In-language diaspora focus** — 11 languages, cultural grounding; incumbents don't serve this.
5. **Honesty / privacy** — consent gates + memory vault; Replika took a €5M GDPR fine → trust is a wedge.
6. **AI social circle (new, shipped 2026-07-04)** — Club Feed: AI friends post, debate, and meme with
   each other on a shared, persistent feed; humans comment/react alongside them. No companion app
   (Character.AI, Replika) has a genuinely shared, multi-agent social layer — it's Instagram/Reddit
   dynamics applied to your own AI circle. Built with the same trust guardrail as everything else:
   gossip/teasing only ever targets fellow AI personas or general topics, never a real named person.
   This is a strong new demo beat — watching agents debate live is more "wow" than a 1:1 chat screenshot.

## 3. Business model
- Freemium: Free · Pro $9/mo · Premium $19/mo (in-beta, no payment wired yet).
- Plan gating + Stripe = backlog (CEO drives credentials). Monetization goal: ≥3% free→paid post-Stripe.
- Open question Sage tracks: which features gate at which tier to maximize conversion without hurting activation.

## 4. Market (for the pitch)
- AI companion market large & fast-growing (companion apps; Character.AI 233M registered, Replika 30M+ downloads).
- Rico's wedge = the underserved international-student / diaspora segment (tens of millions globally), in-language.
- **Retention benchmark (added 2026-07-04):** Character.AI, the category leader, reports ~50–60% D1,
  ~30% D7, and 13–18% D30 retention (2026 industry reporting). Rico's own North Star is D7 ≥18% — our
  7-day target already sits at the top of the leader's 30-day range. Use this framing once real data
  lands: "our week-one retention target matches best-in-class month-one retention in this category."
  Category economics: consumer AI companion apps crossed ~$120M revenue in 2025; Character.AI ~$32M
  and Replika ~$24M annual revenue (2024) on 200M+ / 30M+ user bases respectively — confirms the
  category monetizes at scale even before Rico's outcome-engine upsell.

## 5. Investor narrative (the raise)
"Companion apps churn because novelty fades; career tools don't retain. Rico fuses emotional
retention (proactive friends + living memory) with tangible life outcomes (career wins) for the
60M+ international students & diaspora no incumbent serves in-language. We retain like a companion
app AND monetize like a career tool."

## 6. Fundraising readiness checklist (Sage tracks)
- [ ] Live metric story: activation rate + D7 + proactive-checkin reply rate (instrumented ✓ — needs data).
- [x] Demo that lands the bet in 60s (proactive check-in + memory panel + **Club Feed** all live ✓ —
      Club Feed is now the strongest single demo beat: agents visibly debating/posting is a stronger
      "it's alive" moment than a 1:1 chat screenshot).
- [ ] Named testimonials (3 beta lovers — pending consent).
- [ ] Pricing validated (post-Stripe).
- [x] Deck (Gamma deck exists). 2-min walkthrough **script** written 2026-07-04 (`standups/DEMO_SCRIPT.md`)
      + Reel production spec attached. [ ] Video itself not generated (screen-record + 1 ElevenLabs VO —
      minimal spend, needs CEO approval to record/generate). [ ] One-pager still open.

## 6b. Go-to-Market plan — reaching international students (Sage deep-dive, 2026-06-29)
**GTM goal:** first 500 real, retained beachhead users so the metric story exists. Budget ~$0–50 (video credits); everything else is sweat. Honest, value-first — no spammy mass-DMs.

**Where they actually are (channels, by trust):**
1. **WhatsApp/Telegram cohorts** (highest trust) — university intl-student groups, country cohorts. Reached via ambassadors, not ads.
2. **Reddit** — r/internationalstudents, r/gradschool, r/f1visa, r/ABCDesis, r/developersIndia, country subs. Story-led, never spam.
3. **Instagram/TikTok** — @rico.hitony + study-abroad & desi-abroad creators; "day in the life" / homesick angles (Echo + Reel).
4. **University intl-student offices & cultural orgs** (ISA, desi student assocs) — offer free "AI for your career / ATS" workshops with Tony.
5. **LinkedIn** — recent grads / job-seeking intl students (Tony career hook) + founder story.
6. **Discord** — study-abroad & university servers.

**Tactics ranked by ROI for a solo founder:**
- **Campus ambassadors (highest ROI):** recruit 5–10 intl students (free Premium + small perk) to share Rico in their WhatsApp/Telegram cohorts — the trusted, un-buyable channel.
- **Content-led:** Echo/Reel short-form on "texts you first" + "homesick" + Tony career wins; post in-feed and as genuine value in communities.
- **Community seeding:** founder participates authentically in 5–10 communities ("I built this because I was far from home").
- **Org partnerships:** free career/ATS workshops → warm funnel.
- **Referral loop:** "invite a friend from home" (ties to the 15% referral goal).

**30-day plan:**
- W1: instrument signup source; publish 3 short-form videos; seed 5 communities authentically.
- W2: recruit 5 ambassadors; 1 student-org partnership outreach; daily content.
- W3: founder LinkedIn story; double down on the best channel from W1–2 data (Pulse).
- W4: referral push; collect named testimonials (with consent); read activation/D7 BY SOURCE.

**Measure (Pulse):** signups, activation rate, and D7 **by source** → kill what doesn't convert, pour into what does.
**Tracking gap — CLOSED (2026-06-29):** signup-source attribution built (`lib/source.js`, `by_source` in /api/stats).
Tag every link you share: `hitony.vercel.app/landing?src=reddit` (or `?src=ambassador_name`, `?src=ig`, etc.).

## 7. Strategic recommendations log (most recent first)
- 2026-08-16 — **The Supabase outage is resolved; withdrawing the "pause GTM" recommendation.** CEO
  restored the paused project directly in the dashboard; `/api/health` confirms `ok:true` and all
  original data (signups, activation, retention) is intact — nothing was lost. This closes the one
  condition Sage attached to resuming the GTM push (2026-07-22 entry, repeated 2026-08-15): "send traffic
  once the core loop is confirmed healthy." It's confirmed healthy now. Recommendation reverts to the
  standing one underneath it (2026-07-09 onward, now 47 days stale): GTM push is still the cheapest of
  the three CEO-owned items to start (zero engineering dependency, `?src=` tracking has been live since
  2026-06-29) and is the one every fundraising-readiness item in §6 depends on for real data — no reason
  left to hold it.
- 2026-08-15 (Saturday; 24-day scheduler gap since the last run) — **Escalating, not repeating.** The
  Supabase outage flagged 2026-07-22 is confirmed STILL live 24 days later (`/api/board` still
  `{"error":"fetch failed"}`), and the diagnostic endpoint built specifically to make this a one-curl
  check (`feature/health-check`) was never deployed, so there's no evidence anyone has looked since. Two
  compounding risks this creates: (1) if any real user *did* sign up in the last 24 days via an old
  content link or organic discovery, their entire experience — chat memory, proactive check-ins, Club
  Feed — has likely been silently broken the whole time, which is worse for an investor narrative than
  zero users; (2) the CEO-owned board tasks (Stripe, testimonials, GTM push) are now 46 days stale, and
  GTM specifically should not start until this is fixed regardless of how stale the ask gets — starting
  it onto a broken core loop would still be the wrong call today, same as 2026-07-22. Recommendation,
  unchanged in substance but now urgent given the gap: (1) CEO checks the Supabase dashboard + Vercel env
  vars (5-minute task, cannot be done from this sandbox); (2) deploy `feature/health-check` immediately
  after so `/api/health` confirms the fix in one request going forward; (3) resume GTM only once that
  reads `ok:true`. Also flagging the 24-day scheduler gap itself as worth the CEO's attention separately
  from the product content — three prior gaps (07-14/15, 07-17/18, 07-20/21) were 2-3 days each and each
  got flagged; this one is an order of magnitude larger and suggests something about the schedule itself
  may need a look, not just a one-off miss.
- 2026-07-22 (Wednesday) — **Change of recommendation: pause the "unblock Stripe/testimonials/GTM"
  ask for one beat.** Today's routine board-check found `/api/board` and `/api/stats` both 500ing in
  production with a raw Supabase network failure — not an app bug, a fetch that never completes (see
  PRODUCT_LOG §5/§6 for the diagnosis). Because the DB helper it's failing in (`lib/db.js`) is shared by
  every user-facing route, this likely means chat memory, proactive check-ins, and Club Feed are
  currently broken for any real signed-in user too — invisible only because there's been zero real
  traffic in 7 days to surface it. Starting the 30-day GTM push onto a product whose core loop may be
  silently down would spend the CEO's one shot at first impressions on an outage instead of the bet.
  Recommendation, in order: (1) CEO confirms the Supabase project's status + Vercel env vars match it —
  this is dashboard/account access this sandbox doesn't have, so it can't be verified from here; (2)
  once fixed, deploy today's `feature/health-check` and confirm `ok:true`; (3) *then* resume the GTM
  push. Stripe and testimonials are unaffected by this and can proceed in parallel — only the "send
  users to the product" step should wait. This doesn't reduce urgency on the three CEO-owned items, it
  reorders one step in front of them.
- 2026-07-19 (Sunday, lighter run; no runs 2026-07-17/18) — Same flag, now 19 days: the three
  CEO-owned board tasks (Stripe, testimonials, GTM push) are unchanged since 2026-06-30. Not
  repeating the ask a sixth time — today's build (first-session proof moment) is a deliberately
  small, low-risk item chosen specifically because it's a Sunday: it closes the exact gap this file
  flagged on 2026-07-13 (five retention levers built, but a brand-new signup's first session shows
  none of them since they all need chat history). Once GTM traffic exists, day-0 users will now see
  concrete proof of the bet during onboarding instead of an abstract description — this should help
  the ≥60% activation-in-24h goal convert, not just the eventual D7 number. Still nothing left to
  build that substitutes for real users; distribution remains the sole gate on every item in §6.
- 2026-07-16 (Thursday; no runs 2026-07-14/15) — Same flag, now 16 days: the three CEO-owned board
  tasks (Stripe, testimonials, GTM push) are unchanged since 2026-06-30. Not repeating the ask a fifth
  time with new words — instead, today's build (retention-lever attribution) is the team's own answer to
  its own previous flag: rather than shipping a 6th blind retention lever, `/api/stats` can now rank the
  4 already-deployed levers (checkin, missed-you, spotlight, streak) by returned/D7 rate the moment real
  users exist. That means the GTM push is now not just "the cheapest of the three to unblock" but also
  the one piece of missing data every other roadmap decision downstream of it (which lever to double
  down on, which to cut) is waiting on. Nothing left to build to make that case stronger — it's now
  purely a distribution problem, not a measurement one.
- 2026-07-13 (Monday) — Same flag, now 13 days: the three CEO-owned board tasks (Stripe, testimonials,
  GTM push) are unchanged since 2026-06-30. Today's build (weekly memory digest) is, again, a retention
  lever aimed at users already in the funnel, not a distribution one — four builds running (streak
  counter, club nudge, digest, plus the still-undeployed trust badge/data-export) are all pointed at the
  same side of the funnel while the top stays empty. Not re-arguing the point differently: GTM push
  remains the cheapest of the three to unblock (zero engineering dependency, `?src=` tracking has been
  live since 2026-06-29) and every fundraising-readiness item in this file's §6 waits on it for real
  data. New angle worth flagging once traffic exists: Rico now has FIVE built retention levers
  (proactive check-in, "missed you," memory spotlight, streak counter, weekly digest) stacked before a
  single cohort has been measured against any of them — worth deciding, once GTM starts, whether to
  ship a sixth or instead spend a cycle instrumenting which of the five actually moves D7.
- 2026-07-12 (Sunday, lighter run; no run 2026-07-10/11) — Same recommendation, now overdue by nearly
  two weeks: the three CEO-owned board tasks (Stripe, testimonials, GTM push) are unchanged since
  2026-06-30 — 12 days now. Today's build (check-in reply streak counter) is another retention lever,
  not a distribution one — the team keeps making the funnel's top-of-funnel users stickier while the
  funnel itself stays empty of new traffic. Flagging plainly rather than reformulating: of the three,
  GTM push is still the cheapest to start (zero engineering dependency, the `?src=` tracking has been
  ready since 2026-06-29) and is the one every other fundraising-readiness checklist item in §6 depends
  on for real data.
- 2026-07-09 — The three CEO-owned board tasks (Stripe, testimonials, GTM push) are now 9 days stale
  (unchanged since 2026-06-30). Repeating the same recommendation rather than dressing it up
  differently: GTM is still the cheapest to start and the one actually blocking the metric story every
  other checklist item in §6 depends on. Product work continues to outpace distribution — today's
  build (Club activity nudge) is a genuine retention lever, but it retains users the funnel isn't
  bringing in yet. No new research otherwise; capacity went to product + a small git-hygiene fix.
- 2026-07-05 — Club Feed (CEO-directed build, shipped + deployed 2026-07-04) is a genuine new moat
  pillar, not just a feature — no companion-app competitor has a shared, multi-agent social layer.
  Recommendation: (1) added it to §2 as moat pillar #6 and folded it into the demo script as the
  strongest single "it's alive" beat (Sage owns keeping the narrative current, Nova/Atlas own the doc);
  (2) don't let it sit unmarketed — Echo drafted a launch post today tied to it. The three CEO-owned
  board tasks (Stripe/testimonials/GTM) are now 5 days stale (unchanged since 2026-06-30) — repeating
  the same flag: GTM push is the cheapest one to start and would let Club Feed's novelty actually reach
  new users instead of sitting behind a login wall only existing beta users see.
- 2026-07-04 — Finally executed the 2026-07-01/07-02 recommendation instead of re-queuing it: wrote
  the investor demo script + 2-min walkthrough video spec (`standups/DEMO_SCRIPT.md`), so there's a
  leave-behind asset ready the moment plan-gating/testimonials/GTM unlock. Also added a hard retention
  benchmark (Character.AI D30 13–18% vs Rico's D7≥18% target) to sharpen the raise narrative once real
  data lands. The three CEO-owned board tasks are unchanged since 2026-06-30 (5 days) — recommend the
  CEO pick at least one this week; GTM push is the cheapest to start (no engineering dependency) and
  would unblock the metric story fastest.
- 2026-07-02 — Three CEO-owned board tasks (plan gating/Stripe, testimonials, GTM push) have sat in
  "todo" since 2026-06-30 — the team cannot progress them further without CEO action, and they are the
  actual blockers to an investor-ready metric story (activation/D7/reply-rate exist but need real
  traffic; the pricing test needs Stripe; the "this app changed my life" flywheel needs consented
  names). Recommendation: this week, spend the team's free capacity on the one investor-readiness item
  fully unblocked — the demo script + 2-min walkthrough video (Reel can produce once approved) — so
  there's a leave-behind asset ready the moment the CEO unlocks the other three. Do not let feature
  work keep outpacing distribution/monetization proof; the product bet is demo-ready now.
- 2026-06-29 — GTM deep-dive added (§6b). Key insight: the un-buyable advantage is ambassador-led
  WhatsApp/Telegram distribution inside diaspora cohorts; pair with honest founder story. Blocking gap:
  no signup-source attribution yet — recommend Forge add a `source` capture so growth is measurable.
- 2026-06-29 — Priority order to become investable: (1) get real users through the funnel so the
  instrumentation produces a metric story; (2) ship plan gating to test willingness-to-pay; (3) lock
  named testimonials. Features are ahead of distribution — the bottleneck is now users, not product.
