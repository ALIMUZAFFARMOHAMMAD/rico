import { configured, getRow } from "../../lib/db";
import { authenticateDevice } from "../../lib/meeting-device";
import { twinKey } from "../../lib/twins";
import { twinIdentityPrompt } from "../../lib/twin-identity";
import { digest } from "../../lib/meeting-store";
import { rateLimited } from "../../lib/ratelimit";
import { savedVoiceReference } from "../../lib/meeting-local-voice";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "2kb" }, responseLimit: "9mb" } };
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!configured()) return res.status(503).end();
  const device = await authenticateDevice(req.headers.authorization);
  if (!device) return res.status(401).end();
  if (await rateLimited(req, { limit: 6 })) return res.status(429).end();
  if (req.body?.action !== "export-reference" || req.body?.confirm !== true) return res.status(400).json({ error: "Confirm saving your existing voice reference on this paired PC." });
  try {
    const twin = (await getRow(twinKey(device.owner)))?.traits;
    if (!twin?.persona || !twin?.voiceCloned) return res.status(409).json({ error: "Create your twin and save your own cloned voice first." });
    const audio = await savedVoiceReference(twin);
    // Recheck pairing and voice ownership after the external read.
    const current = await authenticateDevice(req.headers.authorization);
    const fresh = (await getRow(twinKey(device.owner)))?.traits;
    if (!current || current.tokenHash !== device.tokenHash || !fresh?.voiceCloned || fresh.voice !== twin.voice) return res.status(409).end();
    return res.status(200).json({ ...audio, voiceHash: digest(twin.voice), profile: twinIdentityPrompt(twin), name: String(twin.name || "the owner").slice(0, 50) });
  } catch { return res.status(409).json({ error: "Your saved reference could not be exported. No audio was generated and no API credits were used." }); }
}
