# Rico (ricomates.si) — Security & Compliance Rules

Owner: CEO (Muzaffar). Applies to everyone who touches Rico — the CEO, contractors, and the
autonomous AI team (Atlas/Forge/Sentry/…). The daily team MUST read this before shipping.
Last full review: 2026-10-09.

---

## A. Hard rules (non-negotiable)

1. **Secrets never leave the server.** API keys live ONLY in Vercel env vars (Production,
   marked Sensitive) and the CEO's local `.env.local` (git-ignored). Never in code, commits,
   chat messages, screenshots, scheduled-task command lines, docs, or `NEXT_PUBLIC_*` vars.
   The only `NEXT_PUBLIC_*` values allowed are ones that are public by design
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).
2. **No custom auth.** Clerk owns sign-in/sign-up/passwords/MFA/sessions. We store no
   passwords or tokens. Never build a login endpoint.
3. **Every user-data API proves ownership** — `if (!ownsUser(req, userId)) return 403`
   (`lib/auth.js`). Never trust a `userId` sent by the client on its own.
4. **Every paid API requires a signed-in session** — enforced centrally by the `PAID_API`
   list in `middleware.js` (signed-out → 401 before any money is spent). A NEW route that calls
   Anthropic or ElevenLabs MUST be added to that list AND call `rateLimited(req)`.
5. **Founder-only tools** (`/api/board`, `/api/stats`) are gated by long random keys compared
   in constant time (`lib/keys.js safeKeyEq`). Never a short/guessable key.
6. **Production deploys need CEO approval**, go out from a committed tree, and get the
   post-deploy smoke test (§D). No `--force`, no skipping hooks.
7. **Honest by design**: AI is always labelled AI; friendship only; no fabricated
   testimonials/metrics; never invent facts about a user ("only what they actually said").
8. **Privacy**: raw photos (avatar selfies, notebook pages) are never stored — only derived
   data. Voice cloning only with explicit consent. Users can see and wipe what Rico remembers
   (Memory Vault). Beta testers' names are never published without written consent.

## B. What is in place (verified 2026-10-09)

| Control | Where | Status |
|---|---|---|
| Managed auth (Clerk **production** instance, `clerk.ricomates.si`) | Clerk | ✅ live |
| Ownership check on all user-data APIs | `lib/auth.js` + routes | ✅ live (non-owner → 403) |
| Sign-in required on all 16 paid APIs | `middleware.js` `PAID_API` | ✅ live (anonymous → 401) |
| Per-IP rate limit on paid APIs | `lib/ratelimit.js` | ✅ live (in-memory — see §E) |
| Constant-time founder-key checks | `lib/keys.js` | ✅ |
| Patched framework (Next 14.2.35, fixes CVE-2025-29927 middleware bypass) | `package.json` | ✅ |
| Security headers: HSTS, X-Frame-Options DENY + `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy | `next.config.js` / Vercel | ✅ live |
| HTTPS everywhere (auto-renewed Let's Encrypt) | Vercel, Clerk | ✅ |
| No secrets in git (repo + history scanned) | `.gitignore` | ✅ clean |
| Supabase service key server-side only | `lib/db.js`, `lib/supabase.js` | ✅ never imported client-side |
| Health/uptime probe incl. real AI-credit check | `/api/health` | ✅ |

## C. Clerk dashboard settings (CEO does these — not code)
In Clerk → **Production** instance:
- **Attack protection → Lockout**: ON, 5 failed attempts, 15 min.
- **Attack protection → Bot protection**: ON (Cloudflare Turnstile).
- **Password**: min length 8 + "Reject compromised passwords" (HIBP).
- **Multi-factor**: allow TOTP (authenticator app) as optional MFA for users.
- **Device trust** update: keep enabled — we use Clerk's prebuilt components, no code change needed.
- **Google sign-in**: production needs our own Google OAuth client (SSO connections → Google →
  custom credentials).

## D. Release checklist (every production deploy)
1. `npx next build` passes.
2. `npm audit --omit=dev` — no NEW critical/high introduced.
3. Deploy → alias → smoke test:
   - `/`, `/landing`, `/sign-in`, `/api/health` → 200, health shows all services `ok`.
   - anonymous POST to `/api/tts` and `/api/tony` → **401**.
   - `/api/profile?userId=user_fake` → **403**.
4. Owner-run checks after big auth/voice/AI changes: `node scripts/tts-check.cjs`,
   `node scripts/notebook-check/run.cjs`, `node scripts/migrate-check.cjs`.

## E. Known gaps / backlog (ranked)
1. **🔴 Rotate the Anthropic API key (CEO).** The current key was exposed in June (plaintext in
   the local `JobApplyAgent` scheduled-task command line, still there today, and in a public
   claude.ai share link). Rotate in console.anthropic.com, then update: Vercel env
   `ANTHROPIC_API_KEY`, `.env.local`, and the `JobApplyAgent` task (better: have that script read
   the key from a file/env instead of the command line). Delete the old share link.
   Also rotate any other key that was in that share (Discord bot token, Clerk/Supabase if present).
2. **Clerk v4 → v5 upgrade** — clears the remaining high advisories (js-cookie via @clerk/shared).
   Breaking (authMiddleware → clerkMiddleware); plan + test on a branch.
3. **Next 14 → 15** — remaining Next advisories are self-hosted DoS issues (not exploitable on
   Vercel's platform); upgrade with the Clerk v5 work.
4. **Durable rate limiting** — current limiter is in-memory per serverless instance. Upgrade to
   Upstash (`@upstash/ratelimit`, free tier) if abuse is ever seen. Also set **spend caps** in
   the Anthropic and ElevenLabs consoles so a bug can never run up an unbounded bill.
5. **Content-Security-Policy** — add a full CSP (report-only first; Clerk domains allowlisted).
6. **Founder keys in URLs** — `/board?key=` puts the key in browser history/logs; move to a header.
7. **Dev→prod migration route** (`/api/migrate` + `CLERK_DEV_SECRET_KEY`) — delete ~2026-11-09,
   once beta users have signed in again.

## F. Incident response (if something goes wrong)
**Severity:** SEV1 site down / data exposed · SEV2 major feature broken or credit drain ·
SEV3 minor feature · SEV4 cosmetic.
1. **Detect** — `/api/health` red, unusual Anthropic/ElevenLabs spend, user report.
2. **Contain (minutes):**
   - Leaked key → rotate it at the provider immediately, update Vercel env, redeploy.
   - Credit drain → lower/zero the spend cap at the provider; tighten `PAID_API`/rate limit.
   - Bad deploy → Vercel dashboard → previous deployment → "Promote to Production" (instant rollback).
   - Account abuse → ban the user in Clerk; their sessions die.
3. **Communicate** — CEO decides on user notice. If personal data may have been exposed,
   notify affected users and assess GDPR breach-notification duties (72h to the authority).
4. **Fix + postmortem** — blameless; root cause (5 whys); add a rule here and a check in §D.

## G. Data & privacy compliance (GDPR-minded — app runs from an EU domain)
- **Lawful basis + consent**: users accept Terms/Privacy/AI consent (`/api/consent`, versioned).
- **Data minimisation**: store only conversation memory, preferences, and derived data needed
  for the product. No photos, no passwords, no payment data.
- **Right of access / erasure**: Memory Vault shows and deletes per-friend memory; full account
  deletion = Clerk user delete + delete the user's Supabase rows (`<userId>`, `<userId>::*`,
  `twin::<userId>`). Respond to any data request within 30 days.
- **Processors** (list in the Privacy Policy): Vercel (hosting), Supabase (database), Clerk
  (auth), Anthropic (AI), ElevenLabs (voice). No data sold; no ads.
- **Retention**: delete inactive accounts' memory after 24 months unless the user opts to keep it.
- **Children**: Rico is for adults (international students); don't target under-16s.

## History
- 2026-07-01 — Board key rotated to a 32-hex token; constant-time compares.
- 2026-10-02 — IDOR guard shipped (`ownsUser` on all user-data APIs).
- 2026-10-07 — Stock-voice fallback when ElevenLabs clones are blocked.
- 2026-10-08 — Production domain ricomates.si; Clerk production instance; hitony → 308 redirect.
- 2026-10-09 — Next 14.2.35 (CVE-2025-29927 etc.), sign-in required on paid APIs, rate-limit
  gaps closed, security headers, this compliance rulebook.
