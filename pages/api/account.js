// Delete my account: removes every Rico row keyed by the signed-in user (memory, matches,
// notebook, twin), their cloned voice at ElevenLabs, career results, and finally the Clerk
// user. Required by Google Play (in-app + web account deletion). Only the signed-in user
// can delete themselves — the id comes from the session, never the request body.
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { configured, sb, getRow } from "../../lib/db";
import { twinKey } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";
import { removeTwinVoice } from "../../lib/selfvoice";
import { removeUserMedia } from "../../lib/social-media";

// Rows that belong to userId: "<id>", "<id>::…", "twin::<id>". LIKE treats `_` as a
// wildcard, so the server query is broad and this exact check decides.
export const ownsKey = (key, id) => key === id || key.startsWith(id + "::") || key === `twin::${id}`;

export async function deleteOwnedRows(userId) {
  const enc = encodeURIComponent(userId);
  const filters = [`user_id=eq.${enc}`, `user_id=like.${enc}::*`, `user_id=eq.${encodeURIComponent(twinKey(userId))}`];
  let deleted = 0;
  for (const filter of filters) {
    let cursor = null;
    for (let page = 0; page < 50; page++) {
      const rows = await sb(`/conversations?${filter}&select=id,user_id&order=id.asc&limit=100${cursor ? `&id=gt.${cursor}` : ""}`) || [];
      if (!rows.length) break;
      if (rows.some(row => !/^[a-f0-9-]{36}$/i.test(row.id))) throw new Error("Unexpected account record ID");
      const owned = rows.filter(row => ownsKey(row.user_id, userId));
      if (owned.length) { await sb(`/conversations?id=in.(${owned.map(row => row.id).join(",")})`, "DELETE"); deleted += owned.length; }
      cursor = rows[rows.length - 1].id;
      if (rows.length < 100) break;
      if (page === 49) throw new Error("Account cleanup needs another attempt");
    }
  }
  return deleted;
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in first" });
  if (!configured()) return res.status(503).json({ error: "Not configured" });
  if (await rateLimited(req, { limit: 3 })) return res.status(429).json({ error: "slow down" });

  try {
    await removeUserMedia(userId);
    const twin = await getRow(twinKey(userId));
    if (twin?.traits?.voiceCloned) await removeTwinVoice(twin.traits.voice);
    const enc = encodeURIComponent(userId);
    const deleted = await deleteOwnedRows(userId);
    await sb(`/career_results?user_id=eq.${enc}`, "DELETE");
    await (await clerkClient()).users.deleteUser(userId); // last: if anything above throws, the user can retry signed in
    console.log("account deleted", { rows: deleted });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("account delete error:", e.message);
    return res.status(500).json({ error: "Couldn't delete everything — please try again." });
  }
}

