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

## 3. Board key is brute-forceable
`BOARD_KEY=752003` is 6 digits (10^6) with no rate limit → guessable. Rotate to a long
random token (e.g. `openssl rand -hex 16`) on the next deploy, update Vercel env + `/board` login.

## 4. Pending (in working tree, NOT deployed — verify before shipping)
`middleware.js` + `lib/auth.js` `ownsUser` guard on profile/memory/conversation/resume/matches
closes the userId IDOR. Verify with a real login (self=200, app loads) before deploy, then
fan the guard to the remaining user-data endpoints + rotate the board key + add the Upstash
limiter — all in one deploy.
