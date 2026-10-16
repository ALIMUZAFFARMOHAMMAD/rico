import { randomUUID } from "crypto";
import { waitUntil } from "@vercel/functions";
import { configured, getRow, upsertRow } from "../../lib/db";
import { authenticateDevice, compareUpdate, deviceKey, validateSnapshot } from "../../lib/meeting-device";
import { getMeeting, listMeetings, meetingKey, deleteMeetingData, claimMeeting, saveMeeting } from "../../lib/meeting-store";
import { validMeetingId, terminalMeeting } from "../../lib/meeting-core";
import { generateMeetingNotes } from "../../lib/meeting-ai";
import { clonedMeetingAudio } from "../../lib/meeting-voice";
import { twinKey } from "../../lib/twins";
import { getAuto, autoActive, automaticSpeechAllowed, updateAuto } from "../../lib/meeting-auto";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "2mb" } } };
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!configured()) return res.status(503).json({ error: "Storage unavailable." });
  try {
    const device = await authenticateDevice(req.headers.authorization);
    if (!device) return res.status(401).json({ error: "PC pairing expired or was disconnected." });
    const body = req.body || {};
    if (body.action === "poll") {
      const ready = body.ready === true;
      if (!await compareUpdate(deviceKey(device.owner), "tokenHash", device.tokenHash, { ...device, ready, voiceVersion: body.voiceVersion === 1 ? 1 : 0, autoVersion: body.autoVersion === 1 ? 1 : 0, lastSeen: new Date().toISOString() })) return res.status(401).end();
      const meetings = (await listMeetings(device.owner)).filter(m => m.deviceHash === device.tokenHash);
      const jobs = [];
      if (ready) for (const meeting of meetings.filter(m => m.jobState === "pending")) {
        const jobLease = randomUUID();
        const claimed = { ...meeting, jobState: "running", jobLease };
        if (await compareUpdate(meetingKey(device.owner, meeting.id), "jobState", "pending", claimed)) jobs.push({ id: meeting.id, jobId: meeting.jobId, lease: jobLease, type: meeting.jobType, platform: meeting.platform, url: meeting.url, twinName: meeting.twinName, providerId: meeting.providerId, nativeId: meeting.nativeId, voiceEnabled: meeting.voiceEnabled === true, automatic: !!meeting.autoGeneration, autoFingerprint: meeting.autoFingerprint });
      }
      const tracked = meetings.filter(m => m.providerId && (!terminalMeeting(m.state) || Date.now() - Date.parse(m.finishedAt || "") < 120000));
      const sessions = await Promise.all(tracked.map(async m => {
        const a = body.autoVersion === 1 ? await getAuto(m) : null;
        return { id: m.id, platform: m.platform, providerId: m.providerId, nativeId: m.nativeId, auto: a ? { enabled: autoActive(a) && m.state === "active", generation: a.generation, stopId: a.stopId } : null };
      }));
      return res.status(200).json({ jobs, meetings: sessions });
    }
    if (!validMeetingId(body.id)) return res.status(400).json({ error: "Invalid meeting." });
    const meeting = await getMeeting(device.owner, body.id);
    if (!meeting || meeting.deviceHash !== device.tokenHash) return res.status(404).json({ error: "Meeting not found for this PC." });
    if (body.action === "voice") {
      if (meeting.autoGeneration && !await automaticSpeechAllowed(meeting)) return res.status(409).json({ error: "Automatic speech has been paused." });
      if (meeting.jobType !== "speak" || meeting.jobState !== "running" || meeting.jobId !== body.jobId || meeting.jobLease !== body.lease || !meeting.voiceEnabled || meeting.platform !== "meet" || meeting.state !== "active") return res.status(409).json({ error: "This speech request is no longer active." });
      // Claim synthesis once. A retry must never spend credits or speak twice.
      if (meeting.voiceSynthesisJob === body.jobId) return res.status(409).json({ error: "Speech synthesis was already requested." });
      if (!await compareUpdate(meetingKey(device.owner, meeting.id), "jobState", "running", { ...meeting, jobState: "synthesizing", voiceSynthesisJob: body.jobId })) return res.status(409).end();
      try {
        const twin = (await getRow(twinKey(device.owner)))?.traits;
        const audio = await clonedMeetingAudio(twin, meeting.speechText);
        if (!await authenticateDevice(req.headers.authorization)) return res.status(401).end();
        const current = await getMeeting(device.owner, meeting.id);
        if (!current || current.deviceHash !== device.tokenHash || !current.voiceEnabled || current.jobId !== body.jobId || current.jobLease !== body.lease || current.state !== "active") return res.status(409).end();
        if (current.autoGeneration && !await automaticSpeechAllowed(current)) return res.status(409).end();
        if (!await compareUpdate(meetingKey(device.owner, meeting.id), "jobState", "synthesizing", { ...current, jobState: "running" })) return res.status(409).end();
        return res.status(200).json(audio);
      } finally {
        const current = await getMeeting(device.owner, meeting.id);
        if (current?.jobId === body.jobId && current.jobState === "synthesizing") await compareUpdate(meetingKey(device.owner, meeting.id), "jobState", "synthesizing", { ...current, jobState: "running" });
      }
    }
    if (body.action === "result") {
      if (body.jobId !== meeting.jobId || body.lease !== meeting.jobLease) return res.status(409).json({ error: "Stale job lease." });
      if (meeting.jobState === "done" || meeting.jobState === "error") {
        if (meeting.jobState === "done" && meeting.jobType === "purge" && body.ok === true) await deleteMeetingData(meeting);
        return res.status(200).json({ accepted: true });
      }
      if (meeting.jobState !== "running") return res.status(409).json({ error: "Job is not running." });
      let next = { ...meeting, jobState: "done", operation: "idle", error: null };
      if (body.ok !== true) {
        // Never re-enqueue an uncertain join. The provider may have accepted it.
        next = { ...next, jobState: "error", state: meeting.jobType === "join" ? "uncertain" : meeting.state, error: "The PC could not confirm this action. Check the local Vexa dashboard before trying again." };
      } else if (meeting.jobType === "join") {
        if (!Number.isSafeInteger(body.providerId) || body.providerId < 1 || typeof body.nativeId !== "string" || !body.nativeId || body.nativeId.length > 255 || /[?#&=/\s]/.test(body.nativeId)) return res.status(400).json({ error: "Invalid local meeting identity." });
        next = { ...next, providerId: body.providerId, nativeId: body.nativeId, state: "requested" };
      } else if (meeting.jobType === "leave") next.state = "stopping";
      if (["speak", "stop_speaking"].includes(meeting.jobType)) {
        next.speechDelivery = body.ok === true ? (meeting.jobType === "speak" ? "submitted" : "stop_requested") : "unconfirmed";
        if (body.ok === true && meeting.jobType === "speak") next.lastSpeechAt = new Date().toISOString();
        delete next.speechText;
      }
      if (body.ok === true && meeting.jobType === "purge") next.operation = "worker";
      if (!await compareUpdate(meetingKey(device.owner, meeting.id), "jobState", "running", next)) return res.status(409).json({ error: "Job already changed." });
      if (meeting.autoGeneration) {
        const a = await getAuto(meeting);
        if (a?.enabled && a.generation === meeting.autoGeneration && a.turnId === meeting.autoTurnId) await updateAuto(meeting, a, body.ok === true ? { status: "listening" } : { enabled: false, status: "error", error: "Speech delivery was not confirmed. Automatic replies paused; the reply will not be repeated." });
      }
      if (body.ok === true && meeting.jobType === "purge") await deleteMeetingData(next);
      return res.status(200).json({ accepted: true });
    }
    if (body.action === "snapshot") {
      const snapshot = validateSnapshot(meeting, body);
      if (!await claimMeeting(meeting, "snapshot")) return res.status(409).json({ error: "Meeting is busy; retry this snapshot." });
      let release = meeting;
      try {
      const key = `${meetingKey(device.owner, meeting.id)}::snapshot`;
      const previous = (await getRow(key))?.traits;
      // Finished sessions do not move backwards if an older poll arrives late.
      if (previous && terminalMeeting(previous.status) && !terminalMeeting(snapshot.status)) return res.status(200).json({ accepted: true });
      await upsertRow(key, { traits: { ...snapshot, owner: device.owner, meetingId: meeting.id, kind: "meeting-snapshot", providerId: meeting.providerId, receivedAt: new Date().toISOString() } });
      release = { ...meeting, state: snapshot.status, ...(terminalMeeting(snapshot.status) ? { finishedAt: meeting.finishedAt || new Date().toISOString() } : {}) };
      if (meeting.important && terminalMeeting(snapshot.status) && !terminalMeeting(previous?.status) && snapshot.segments.length) {
        // Persist/release before scheduling notes so deletion and manual requests
        // use the same database lock as automatic generation.
        await saveMeeting({ ...release, operation: "idle" });
        waitUntil((async () => {
          const current = await getMeeting(device.owner, meeting.id);
          if (!current || !await claimMeeting(current, "notes")) return;
          try { await generateMeetingNotes(current); }
          finally { const fresh = await getMeeting(device.owner, meeting.id); if (fresh) await saveMeeting({ ...fresh, operation: "idle" }); }
        })().catch(() => {}));
        release = null;
      }
      return res.status(200).json({ accepted: true });
      } finally { if (release) await saveMeeting({ ...release, operation: "idle" }); }
    }
    return res.status(400).json({ error: "Unknown worker action." });
  } catch (error) {
    console.error("meeting worker failed", error.name);
    return res.status(502).json({ error: "Could not process the local meeting update. Check the app and local Vexa dashboard." });
  }
}
