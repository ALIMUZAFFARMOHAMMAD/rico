// Delete my account: removes every Rico row keyed by the signed-in user (memory, matches,
// notebook, twin), their cloned voice at ElevenLabs, career results, and finally the Clerk
// user. Required by Google Play (in-app + web account deletion). Only the signed-in user
// can delete themselves — the id comes from the session, never the request body.
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { configured, sb, getRow } from "../../lib/db";
import { twinKey } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";

// Rows that belong to userId: "<id>", "<id>::…", "twin::<id>". LIKE treats `_` as a
// wildcard, so the server query is broad and this exact check decides.
export const ownsKey = (key, id) => key === id || key.startsWith(id + "::") || key === `twin::${id}`;

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in first" });
  if (!configured()) return res.status(503).json({ error: "Not configured" });
  if (rateLimited(req, { limit: 3 })) return res.status(429).json({ error: "slow down" });

  try {
    const twin = await getRow(twinKey(userId));
    if (twin?.traits?.voiceCloned && twin.traits.voice && process.env.ELEVENLABS_API_KEY) {
      await fetch(`https://api.elevenlabs.io/v1/voices/${twin.traits.voice}`, { method: "DELETE", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } }).catch(() => {});
    }
    const enc = encodeURIComponent(userId);
    const rows = [
      ...((await sb(`/conversations?user_id=eq.${enc}&select=id,user_id`)) || []),
      ...((await sb(`/conversations?user_id=like.${enc}::*&select=id,user_id`)) || []),
      ...((await sb(`/conversations?user_id=eq.${encodeURIComponent(twinKey(userId))}&select=id,user_id`)) || []),
    ].filter(r => ownsKey(r.user_id, userId));
    for (const r of rows) await sb(`/conversations?id=eq.${r.id}`, "DELETE");
    try { await sb(`/career_results?user_id=eq.${enc}`, "DELETE"); } catch (e) { /* table optional */ }
    await clerkClient.users.deleteUser(userId); // last: if anything above throws, the user can retry signed in
    console.log(`account deleted: ${rows.length} rows, …${userId.slice(-6)}`);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("account delete error:", e.message);
    return res.status(500).json({ error: "Couldn't delete everything — please try again." });
  }
}
