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

## 3. Business model
- Freemium: Free · Pro $9/mo · Premium $19/mo (in-beta, no payment wired yet).
- Plan gating + Stripe = backlog (CEO drives credentials). Monetization goal: ≥3% free→paid post-Stripe.
- Open question Sage tracks: which features gate at which tier to maximize conversion without hurting activation.

## 4. Market (for the pitch)
- AI companion market large & fast-growing (companion apps; Character.AI 233M registered, Replika 30M+ downloads).
- Rico's wedge = the underserved international-student / diaspora segment (tens of millions globally), in-language.

## 5. Investor narrative (the raise)
"Companion apps churn because novelty fades; career tools don't retain. Rico fuses emotional
retention (proactive friends + living memory) with tangible life outcomes (career wins) for the
60M+ international students & diaspora no incumbent serves in-language. We retain like a companion
app AND monetize like a career tool."

## 6. Fundraising readiness checklist (Sage tracks)
- [ ] Live metric story: activation rate + D7 + proactive-checkin reply rate (instrumented ✓ — needs data).
- [ ] Demo that lands the bet in 60s (proactive check-in + memory panel both live ✓).
- [ ] Named testimonials (3 beta lovers — pending consent).
- [ ] Pricing validated (post-Stripe).
- [ ] Deck (Gamma deck exists) + one-pager + 2-min walkthrough video (Reel can produce).

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
