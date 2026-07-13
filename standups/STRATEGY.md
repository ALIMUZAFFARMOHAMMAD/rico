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
