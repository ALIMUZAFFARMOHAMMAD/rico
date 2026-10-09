// One-time dev→production Clerk account migration. Moving Clerk to a production
// instance gives every user a new id, and all Rico data is keyed by that id. On a
// user's first production sign-in the client POSTs here; we read their VERIFIED emails
// from production Clerk, ask the old DEV instance which user owned that verified email,
// and rename every row keyed by the old id to the new one. Idempotent: once moved, the
// old id owns nothing, so later calls are no-ops.
//
// Needs CLERK_DEV_SECRET_KEY (the old sk_test_ key) in env. Without it we answer 503 so the
// client does NOT mark the user as migrated and retries on a later visit.
// ponytail: delete this route + the CLERK_DEV_SECRET_KEY env var once beta users have
// signed in again (or after ~a month).
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { configured, sb, getUserRows } from "../../lib/db";
import { rateLimited } from "../../lib/ratelimit";

// "<old>" → "<new>", "<old>::anything" → "<new>::anything", "twin::<old>" → "twin::<new>"
export function remapKey(key, oldId, newId) {
  if (key === oldId) return newId;
  if (key.startsWith(oldId + "::")) return newId + key.slice(oldId.length);
  if (key === `twin::${oldId}`) return `twin::${newId}`;
  return null; // LIKE matched a lookalike id (`_` is a LIKE wildcard) — not ours
}

const verifiedEmails = (list, addrKey) =>
  (list || []).filter(e => e?.verification?.status === "verified").map(e => String(e[addrKey]).toLowerCase());

async function findDevUserId(email) {
  const r = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_DEV_SECRET_KEY}` },
  });
  if (!r.ok) throw new Error("dev clerk " + r.status);
  const users = await r.json();
  // the dev account must have verified the SAME address too — no takeover via unverified emails
  const hit = (users || []).find(u => verifiedEmails(u.email_addresses, "email_address").includes(email));
  return hit ? hit.id : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in first" });
  if (!process.env.CLERK_DEV_SECRET_KEY || !configured()) return res.status(503).json({ error: "migration not configured" });
  if (rateLimited(req, { limit: 5 })) return res.status(429).json({ error: "slow down" });

  try {
    const me = await clerkClient.users.getUser(userId);
    let oldId = null;
    for (const email of verifiedEmails(me.emailAddresses, "emailAddress")) {
      oldId = await findDevUserId(email);
      if (oldId) break;
    }
    if (!oldId || oldId === userId) {
      // diagnostics only (no PII): a dev instance with 0 users = CLERK_DEV_SECRET_KEY is from the wrong Clerk app
      const c = await fetch("https://api.clerk.com/v1/users/count", { headers: { Authorization: `Bearer ${process.env.CLERK_DEV_SECRET_KEY}` } }).then(r => r.ok ? r.json() : null).catch(() => null);
      console.log(`migrate: no match — verified emails=${verifiedEmails(me.emailAddresses, "emailAddress").length}, dev instance users=${c?.total_count ?? "?"}, same id=${oldId === userId}`);
      return res.status(200).json({ moved: 0 });
    }

    const rows = [
      ...(await getUserRows(oldId)),
      ...((await sb(`/conversations?user_id=eq.${encodeURIComponent(`twin::${oldId}`)}&select=id,user_id`)) || []),
    ];
    let moved = 0;
    for (const row of rows) {
      const target = remapKey(row.user_id, oldId, userId);
      if (!target) continue;
      // ponytail: any row already at the target key was created seconds ago by this first
      // production session (e.g. the activity stamp) — the old row is the real history, so it wins.
      await sb(`/conversations?user_id=eq.${encodeURIComponent(target)}`, "DELETE");
      await sb(`/conversations?id=eq.${row.id}`, "PATCH", { user_id: target });
      moved++;
    }
    try { await sb(`/career_results?user_id=eq.${encodeURIComponent(oldId)}`, "PATCH", { user_id: userId }); } catch (e) { /* table optional */ }
    console.log(`migrate: ${moved} rows ${oldId.slice(-6)} → ${userId.slice(-6)}`);
    return res.status(200).json({ moved });
  } catch (e) {
    console.error("migrate error:", e.message);
    return res.status(500).json({ error: "Migration failed — your data is safe; try again." });
  }
}
