// Records a user's acceptance of the Terms, Privacy & AI consent (legal proof of consent).
// Stored in the user's meta row (traits.consent = {version, at}).
import { configured, getRow, upsertRow, metaKey } from "../../lib/db";
import { CONSENT_VERSION } from "../../lib/consent";

export { CONSENT_VERSION };

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });
  const userId = req.method === "GET" ? req.query.userId : req.body?.userId;
  if (!userId) return res.status(400).json({ error: "No userId" });
  const key = metaKey(userId);

  try {
    if (req.method === "GET") {
      const row = await getRow(key);
      const c = row?.traits?.consent || null;
      return res.status(200).json({ accepted: c?.version === CONSENT_VERSION, version: CONSENT_VERSION, record: c });
    }
    if (req.method === "POST") {
      const row = await getRow(key);
      await upsertRow(key, { traits: { ...(row?.traits || {}), consent: { version: CONSENT_VERSION, at: new Date().toISOString() } } });
      return res.status(200).json({ ok: true, version: CONSENT_VERSION });
    }
    return res.status(405).end();
  } catch (e) {
    console.error("consent error:", e.message);
    return res.status(500).json({ error: "Failed" });
  }
}
