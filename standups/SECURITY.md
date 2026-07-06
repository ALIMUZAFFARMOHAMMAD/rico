# Rico — Security Runbook

## 1. Login protection = Clerk dashboard (NOT code)
There is no custom login endpoint (Clerk owns auth), so rate limiting / lockout / CAPTCHA
are dashboard toggles. Do these in https://dashboard.clerk.com → your Rico app:

- **User lockout** (User & Authentication → Attack protection):
  - Enable "Lockout". Set: lock after **5** failed attempts, duration **15 min**.
  - Clerk handles the owner notification + the generic error — no enumeration leak.
- **Bot protection / CAPTCHA** (Attack protection):
  - Enable. Clerk ships **Cloudflare Turnstile** — no hCaptcha code needed. It challenges
    suspicious sign-in attempts automatically (covers the "CAPTCHA after N failures" ask).
- **Rate limiting**: on by default for Clerk's sign-in endpoints. Nothing to configure.
- **Password rules** (User & Authentication → Password): require min length 8, and enable
  "Reject compromised passwords" (HIBP) — stronger than an uppercase/symbol regex.

DO NOT hand-roll Redis counters or progressive `sleep()` delays for login: they can't
intercept Clerk's hosted flow, and artificial delay on Vercel = you pay for held-open
compute + self-DoS. Reject-fast + 15-min lock (Clerk's model) is correct.

## 2. Real abuse surface = credit-spending API endpoints (needs rate limiting)
These are unauthenticated-callable and each hit spends YOUR money — the actual risk:
- ElevenLabs credits: `tts`, `twin-voice`, `stt`
- Anthropic credits: `tony`, `banter`, `checkin`, `remembers`, `translate`, `tutor`, `twin`, `avatar`
Fix (do on the next deploy, alongside the pending auth-guard change): shared limiter,
Upstash `@upstash/ratelimit` (survives serverless cold starts; in-memory does not).
Needs a free Upstash Redis + `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in env.

## 3. Board key — DONE (2026-07-01)
Rotated `BOARD_KEY` from `752003` to a 32-hex random token (Vercel + .env.local), and swapped
the `/board` + `/stats` compares to constant-time `lib/keys.js` safeKeyEq (node:crypto).
Deployed (dpl oq7stvmjr): new key → ok:true, old key → 401. New key is in the CEO's hands (chat).

## 4. userId IDOR guard — specified, NOT in tree (kept deploys clean)
The fix (`middleware.js` Clerk v4 authMiddleware + `lib/auth.js` ownsUser + `if(!ownsUser(req,userId)) 403`)
is fully specified here and backed up (scratchpad /tmp/authkeep). It was REMOVED from the working tree
so unrelated deploys don't ship unverified auth. IMPLEMENT on the verified rollout:
1. Add middleware.js (authMiddleware, publicRoutes:()=>true — gates nothing) + lib/auth.js.
2. Verify on a real login: self=200, app loads (getAuth resolves). If everything 403s, Clerk cookie
   isn't resolving — fix before proceeding.
3. Fan `if(!ownsUser(req,userId)) return res.status(403).end()` across ALL user-data endpoints:
   profile, memory, conversation, resume, matches, track, avatar, save-mascot, consent, checkin,
   remembers, twin(POST) — and tighten results.js's dead `uid||userId` fallback.
4. Then add the Upstash limiter (§2) in the same deploy.
