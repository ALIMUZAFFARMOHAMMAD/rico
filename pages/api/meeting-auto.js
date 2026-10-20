import { getAuth } from "@clerk/nextjs/server";
import { configured, getRow } from "../../lib/db";
import { rateLimited } from "../../lib/ratelimit";
import { validMeetingId } from "../../lib/meeting-core";
import { getMeeting } from "../../lib/meeting-store";
import { authenticateDevice, deviceKey } from "../../lib/meeting-device";
import { getAuto, configureAuto, automaticTurn, automaticSpeechAllowed, updateAuto } from "../../lib/meeting-auto";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "8kb" } } };
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!configured()) return res.status(503).json({ error: "Meeting storage is unavailable." });
  try {
    const body = req.body || {};
    if (!validMeetingId(body.id)) return res.status(400).json({ error: "Invalid meeting." });
    if (body.action === "configure") {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).end();
      // Never rate-limit the emergency pause control.
      if (body.enabled === true && rateLimited(req, { limit: 20 })) return res.status(429).end();
      const m = await getMeeting(userId, body.id);
      if (!m) return res.status(404).end();
      const device = (await getRow(deviceKey(userId)))?.traits;
      return res.status(200).json({ auto: await configureAuto(m, device, body) });
    }
    const device = await authenticateDevice(req.headers.authorization);
    if (!device) return res.status(401).end();
    const m = await getMeeting(device.owner, body.id);
    if (!m || m.deviceHash !== device.tokenHash) return res.status(404).end();
    if (body.action === "turn") return res.status(200).json(await automaticTurn(m, device, body));
    if (body.action === "authorize") {
      const allowed = m.jobId === body.jobId && m.jobLease === body.lease && m.jobType === "speak" && m.jobState === "running" && m.state === "active" && m.voiceEnabled && await automaticSpeechAllowed(m);
      return res.status(allowed ? 200 : 409).json({ allowed });
    }
    if (body.action === "stopped") {
      const a = await getAuto(m);
      if (a?.stopId === body.stopId) await updateAuto(m, a, { stopId: null });
      return res.status(200).json({ accepted: true });
    }
    return res.status(400).json({ error: "Unknown automatic meeting action." });
  } catch (error) {
    return res.status(409).json({ error: /Supabase|fetch|JSON/i.test(error.message) ? "Automatic mode could not update. Please retry." : error.message });
  }
}
