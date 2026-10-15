import { getAuth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { configured, getRow, upsertRow } from "../../lib/db";
import { twinKey } from "../../lib/twins";
import { rateLimited } from "../../lib/ratelimit";
import { MEETING_PLATFORMS, validMeetingId, meetingUrl, MAX_TRANSCRIPT, transcriptText, terminalMeeting } from "../../lib/meeting-core";
import { getMeeting, listMeetings, saveMeeting, saveMeetingEvent, meetingDetail, claimMeeting, meetingKey, deleteMeetingData, meetingEvents, digest } from "../../lib/meeting-store";
import { deviceKey, deviceOnline, pairDevice, compareUpdate } from "../../lib/meeting-device";
import { generateMeetingNotes, draftMeetingReply } from "../../lib/meeting-ai";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "1mb" } } };
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in first." });
  if (!configured()) return res.status(503).json({ error: "Meeting storage is unavailable." });
  if (rateLimited(req, { limit: req.method === "GET" ? 100 : 30 })) return res.status(429).json({ error: "Please wait a moment before trying again." });
  try {
    if (req.method === "GET") {
      if (req.query.id) {
        if (!validMeetingId(req.query.id)) return res.status(400).json({ error: "Invalid meeting." });
        const meeting = await getMeeting(userId, req.query.id);
        return meeting ? res.status(200).json(await meetingDetail(meeting)) : res.status(404).json({ error: "Meeting not found." });
      }
      const twin = (await getRow(twinKey(userId)))?.traits;
      const device = (await getRow(deviceKey(userId)))?.traits;
      return res.status(200).json({ meetings: await listMeetings(userId), device: { paired: !!device && !device.revoked, online: deviceOnline(device), lastSeen: device?.lastSeen, expiresAt: device?.expiresAt }, capabilities: { notes: !!process.env.ANTHROPIC_API_KEY, liveReplies: false }, twin: twin?.persona ? { name: twin.name } : null });
    }
    const body = req.body || {};
    const { action, id } = body;
    if (action === "pair") {
      const meetings = await listMeetings(userId);
      if (meetings.some(m => m.deviceHash && !terminalMeeting(m.state))) return res.status(409).json({ error: "Finish connected meetings before replacing your PC connection." });
      return res.status(201).json(await pairDevice(userId));
    }
    if (action === "revoke") {
      if (body.confirm !== true) return res.status(400).json({ error: "Confirm disconnecting this PC." });
      const device = (await getRow(deviceKey(userId)))?.traits;
      if (device) await upsertRow(deviceKey(userId), { traits: { ...device, tokenHash: null, revoked: true, ready: false } });
      return res.status(200).json({ revoked: true });
    }
    if (action === "create") {
      if (!validMeetingId(id) || typeof body.title !== "string" || !body.title.trim() || body.title.length > 120 || !Object.hasOwn(MEETING_PLATFORMS, body.platform)) return res.status(400).json({ error: "Add a title and choose a supported meeting type." });
      if (body.consent !== true) return res.status(400).json({ error: "Confirm you have permission to process this conversation." });
      const existing = await getMeeting(userId, id); if (existing) return res.status(200).json(await meetingDetail(existing));
      if (await getRow(meetingKey(userId, id))) return res.status(409).json({ error: "Start a new meeting instead of reusing a deleted one." });
      const bot = ["zoom", "teams", "meet"].includes(body.platform);
      const url = bot ? meetingUrl(body.url, body.platform) : null;
      const twin = (await getRow(twinKey(userId)))?.traits;
      const meeting = { id, owner: userId, kind: "meeting", title: body.title.trim(), platform: body.platform, url, briefing: typeof body.briefing === "string" ? body.briefing.slice(0, 4000) : "", important: body.important === true, twinName: twin?.name || "Ricomates", state: "draft", operation: "idle", consentAt: new Date().toISOString(), createdAt: new Date().toISOString() };
      await saveMeeting(meeting);
      return res.status(201).json(await meetingDetail(meeting));
    }
    if (!validMeetingId(id)) return res.status(400).json({ error: "Invalid meeting." });
    const meeting = await getMeeting(userId, id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found." });
    if (action === "resolve") {
      if (!meeting.deviceHash || !meeting.jobId || body.confirmLocalStopped !== true) return res.status(400).json({ error: "First stop this bot in local Vexa and confirm it is no longer in a call." });
      const resolved = { ...meeting, jobId: randomUUID(), jobLease: null, jobState: "recovering", state: "failed", operation: "recovering", error: "Marked finished after you confirmed the local bot was stopped." };
      if (!await compareUpdate(meetingKey(userId, id), "jobId", meeting.jobId, resolved)) return res.status(409).json({ error: "This meeting changed. Refresh before resolving it." });
      const key = `${meetingKey(userId, id)}::snapshot`;
      const snapshot = (await getRow(key))?.traits;
      if (snapshot) await upsertRow(key, { traits: { ...snapshot, status: "failed" } });
      await saveMeeting({ ...resolved, jobState: "done", operation: "idle" });
      return res.status(200).json(await meetingDetail(await getMeeting(userId, id)));
    }
    if (action === "draft") {
      if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 1500) return res.status(400).json({ error: "Enter a reply instruction of up to 1,500 characters." });
      const twin = (await getRow(twinKey(userId)))?.traits;
      if (!twin?.persona) return res.status(409).json({ error: "Create your AI twin from the You tab first." });
      return res.status(200).json({ draft: await draftMeetingReply(meeting, twin, body.question) });
    }
    if (!["import", "notes", "join", "leave", "delete"].includes(action)) return res.status(400).json({ error: "Unknown meeting action." });
    if (!await claimMeeting(meeting, action)) return res.status(409).json({ error: "A meeting operation is already in progress. Refresh in a moment." });
    let queued = false;
    try {
      if (action === "import") {
        if (body.consent !== true || typeof body.text !== "string" || !body.text.trim() || body.text.length > MAX_TRANSCRIPT || !validMeetingId(body.importId)) return res.status(400).json({ error: "Confirm permission and import 1–100,000 characters of transcript." });
        if (meeting.deviceHash) return res.status(409).json({ error: "Use a separate notes-only meeting for imported transcripts." });
        const events = await meetingEvents(meeting);
        if (events.some(e => e.id === digest(`import:${body.importId}`))) return res.status(200).json(await meetingDetail(meeting));
        if (transcriptText(events).length + body.text.length + 30 > MAX_TRANSCRIPT) return res.status(400).json({ error: "This import would exceed the 100,000-character meeting limit. Create another notebook for the remaining text." });
        await saveMeetingEvent(meeting, `import:${body.importId}`, { type: "transcript", speaker: "Imported transcript", text: body.text.trim(), occurredAt: new Date().toISOString(), order: Date.now() });
        meeting.state = "completed";
        await saveMeeting({ ...meeting, operation: "import" });
        if (meeting.important) { try { await generateMeetingNotes(meeting); } catch { /* Detail exposes a retryable notes error. */ } }
      }
      if (action === "notes") await generateMeetingNotes(meeting);
      if (["join", "leave", "delete"].includes(action)) {
        if (action === "delete" && body.confirm !== true) return res.status(400).json({ error: "Confirm deletion." });
        if (action === "delete" && !meeting.deviceHash) { await deleteMeetingData(meeting); return res.status(200).json({ deleted: true }); }
        if (action === "delete" && body.confirmLocalDeleted === true && terminalMeeting(meeting.state)) { await deleteMeetingData(meeting); return res.status(200).json({ deleted: true }); }
        const device = (await getRow(deviceKey(userId)))?.traits;
        if (!deviceOnline(device)) return res.status(409).json({ error: "Start the paired PC worker and local Vexa first. Your PC must stay awake and connected." });
        if (meeting.deviceHash && meeting.deviceHash !== device.tokenHash) return res.status(409).json({ error: "This meeting belongs to a previous PC connection. Manage its bot in local Vexa." });
        if (action === "join") {
          if (!["zoom", "teams", "meet"].includes(meeting.platform) || meeting.state !== "draft" || meeting.deviceHash) return res.status(409).json({ error: "Create a new Zoom, Teams or Meet session to join." });
          if (body.consent !== true) return res.status(400).json({ error: "Confirm participants know an AI twin will transcribe this meeting." });
          if ((await meetingEvents(meeting)).length) return res.status(409).json({ error: "Create a fresh meeting for live transcription." });
        } else if (!meeting.providerId) return res.status(409).json({ error: "The bot has not been confirmed. Check local Vexa; do not start a second bot." });
        if (action === "delete" && !terminalMeeting((await meetingDetail(meeting)).meeting.status)) return res.status(409).json({ error: "Leave the meeting and wait for it to finish before deleting its data." });
        const next = { ...meeting, deviceHash: device.tokenHash, jobId: randomUUID(), jobType: action === "delete" ? "purge" : action, jobState: "pending", jobLease: null, operation: "worker", state: action === "join" ? "queued" : meeting.state, error: null };
        await saveMeeting(next); queued = true;
        return res.status(202).json(await meetingDetail(next));
      }
      return res.status(200).json(await meetingDetail(meeting));
    } finally {
      if (!queued) { const current = await getMeeting(userId, id); if (current) await saveMeeting({ ...current, operation: "idle" }); }
    }
  } catch (error) {
    console.error("meeting operation failed", error.name);
    return res.status(502).json({ error: /Supabase|fetch failed|JSON/i.test(error.message) ? "The meeting operation could not finish. Your saved transcript is safe; please retry." : error.message || "Meeting operation failed." });
  }
}
