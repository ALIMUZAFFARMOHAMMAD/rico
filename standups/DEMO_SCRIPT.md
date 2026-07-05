# Rico — Investor Demo Script (~2:30 walkthrough)

> Owned by Sage + Atlas. Purpose: a leave-behind asset that lands the product bet in a couple
> minutes — for a live call or a recorded walkthrough. Recommended by Sage on 2026-07-02 and
> 2026-07-01 as the one investor-readiness item fully unblocked while Stripe/testimonials/GTM
> sit CEO-owned. Built 2026-07-04 to stop leaving it on the backlog. Extended 2026-07-05 to add
> the Club Feed beat (shipped to production 2026-07-04) — now the single strongest "it's alive"
> demo moment, so the runtime grew from ~2:00 to ~2:30 rather than cramming it in.

## Positioning line (say this first)
"Character.AI is for play. Replika is for romance. ChatGPT is for tasks. Rico is for the people
far from home who need a friend AND a leg up — international students and diaspora, in their
own language."

## The 2-minute flow

**0:00–0:15 — The problem (say, don't show)**
"Companion apps churn because novelty fades once the honeymoon's over. Career tools don't retain
at all — you open them when you need a resume, then leave. Nobody serves the 60M+ international
students and diaspora who need both: a friend AND a leg up, in their own language."

**0:15–0:45 — Screen: Chats tab, proactive check-in card**
Open the app to the Chats tab. Point at the check-in card at the top — the friend you last talked
to greets you first, referencing something specific and real from your history ("how'd the exam
go?"). Say: "Reactive chatbots wait for you. Rico's friends reach out first — this is the single
strongest retention lever we have, and it's the moment that makes people say 'wait, this feels alive.'"
If it's been a few days since the demo account's last chat, this naturally surfaces the "missed you 💜"
variant instead — call that out if it appears, it's the same mechanic.

**0:45–1:10 — Screen: Me tab, Memory Spotlight**
Switch to the Me tab. Point at the memory chips — specific, real things Rico knows about you across
every friend. Say: "This is the moat. The longer you talk, the more it knows — and the higher the
switching cost. No incumbent has a living memory graph like this."

**1:10–1:40 — Screen: Groups → a Club's shared feed (NEW, 2026-07-05)**
Open Groups, tap into a Club — Movie Club or Game Day demo best. Let a debate or a meme sit on
screen for a beat before talking. Say: "This is new — our AI friends don't just chat with you,
they have their own social circle. They post opinions, they debate each other, they make memes —
and you can jump in and react or comment right alongside them." Point at a debate thread if one's
showing: "Watch — Luna and Pixel actually disagree here, in character, and you can weigh in."
Then point at the "AI" tag on every bot post: "Every single post is clearly labeled — this is the
same honesty pillar as everything else, it's just now a whole social layer, not one friend."
This is the strongest single moment in the whole demo — let it breathe on screen.

**1:40–2:00 — Screen: Memory Vault export button**
Open Memory Vault, point at "Download everything Rico remembers." Say: "And because trust is the
actual adoption blocker in this category — Replika's €5M GDPR fine — we made the opposite bet.
You can see and export everything, anytime. It's on the landing page and the sign-up screen before
you even make an account."

**2:00–2:20 — The business model**
"Freemium: free, Pro $9, Premium $19. The outcome engine — Tony, the career-mentor friend — turns
engagement into resume wins and interview prep, which is the monetization hook and the testimonial
flywheel no pure companion app has."

**2:20–2:30 — The ask**
"We retain like a companion app and monetize like a career tool — and now we're the only one with
an actual AI social circle. [Insert live D7/activation numbers once GTM push is live — see Open
metric gaps below.]"

## Open metric gaps (fill in before using this live)
- D7 retention (target ≥18% — see benchmark note below)
- Activation rate (first real conversation within 24h, target ≥60%)
- Proactive check-in reply rate
- Signup → paid conversion (blocked on Stripe)
All four are instrumented (`/api/stats`) but need real traffic — CEO-owned GTM push is the
prerequisite. Until then, present the flow above with the demo/beta account and flag the numbers
as "coming with the GTM push."

## Investor-narrative benchmark (Sage, added 2026-07-04)
Character.AI — the category leader — reports roughly 50–60% D1 retention, ~30% D7, and 13–18% D30
(industry reporting, 2026). Rico's own North Star is D7 ≥18% — i.e., our 7-day target already sits
at the top of Character.AI's 30-day range. Frame this explicitly in the pitch once real data lands:
"Our week-one retention target matches best-in-class month-one retention in this category" is a
sharp, defensible claim — verify against our own instrumented numbers before using it live.

## 🎬 Reel — walkthrough video production spec (📝 not generated — generation is gated)
**Title:** "Rico, in 2 minutes" · **Aspect:** 16:9 (investor deck / email) + 9:16 cutdown for social
**Duration:** ~2:30 (16:9), ~50s cutdown (9:16) · **Tool:** screen-record (live app) + ElevenLabs VO + Descript edit
- **Segment 1 (0:00–0:15):** Founder voiceover over a calm title card (Rico logo, tagline "Your
  people, always.") — the problem statement, no screen yet.
- **Segment 2 (0:15–0:45):** Screen-record: Chats tab, proactive check-in card in action.
- **Segment 3 (0:45–1:10):** Screen-record: Me tab, Memory Spotlight chips.
- **Segment 4 (1:10–1:40, NEW):** Screen-record: Groups → a Club's live feed — a debate or meme
  card visible, then a human comment landing and an agent replying in-thread. This is the segment
  most worth re-cutting into its own standalone social clip (see CONTENT_CALENDAR.md).
- **Segment 5 (1:40–2:00):** Screen-record: Memory Vault export button + landing/sign-up trust badge.
- **Segment 6 (2:00–2:30):** Title cards: business model line, then the ask, close on logo + tagline.
- **Voiceover:** founder's own voice (authentic, "Rico beta" honest framing) or ElevenLabs clone if
  founder prefers not to re-record — script above, read at a measured pace (~150 wpm fits ~2:30).
- **Captions:** burned-in for the 9:16 cutdown only; 16:9 investor version can stay caption-free.
- **Approval needed to generate:** this is mostly a live screen-record (no image/video credits) +
  1 ElevenLabs VO pass if the founder doesn't record their own narration — flagging the VO as the
  only gated spend.
