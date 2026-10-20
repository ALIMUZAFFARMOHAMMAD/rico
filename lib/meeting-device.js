import { randomBytes, timingSafeEqual } from "crypto";
import { getRow, upsertRow } from "./db";
import { digest, meetingKey } from "./meeting-store";
import { MAX_TRANSCRIPT, MEETING_STATUS, vexaPlatform } from "./meeting-core";

export const deviceKey = owner => meetingKey(owner, "device");
export function deviceOnline(device) {
  return !!device && !device.revoked && device.ready === true && Date.parse(device.expiresAt) > Date.now() && Date.now() - Date.parse(device.lastSeen || "") < 45000;
}
export async function pairDevice(owner) {
  const token = `${Buffer.from(owner).toString("base64url")}.${randomBytes(32).toString("hex")}`;
  const device = { kind: "meeting-device", owner, tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), ready: false, revoked: false };
  await upsertRow(deviceKey(owner), { traits: device });
  return { token, expiresAt: device.expiresAt };
}
export async function authenticateDevice(header) {
  const token = typeof header === "string" ? header.replace(/^Bearer /, "") : "";
  if (!/^[A-Za-z0-9_-]{5,160}\.[a-f0-9]{64}$/.test(token)) return null;
  const owner = Buffer.from(token.split(".")[0], "base64url").toString();
  if (!/^user_[A-Za-z0-9]{1,100}$/.test(owner)) return null;
  const device = (await getRow(deviceKey(owner)))?.traits;
  if (!device || device.owner !== owner || device.revoked || !Number.isFinite(Date.parse(device.expiresAt)) || Date.parse(device.expiresAt) <= Date.now() || !/^[a-f0-9]{64}$/.test(device.tokenHash || "")) return null;
  return timingSafeEqual(Buffer.from(digest(token)), Buffer.from(device.tokenHash)) ? device : null;
}
// Conditional updates, not process-local locks: jobs can be claimed once even
// when several Vercel instances receive simultaneous polls or retries.
export async function compareUpdate(key, field, expected, traits) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/conversations?user_id=eq.${encodeURIComponent(key)}&traits->>${field}=eq.${encodeURIComponent(expected)}`;
  const r = await fetch(url, { method: "PATCH", signal: AbortSignal.timeout(10000), headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ traits, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error("Could not update the meeting connection.");
  return (await r.json()).length > 0;
}
export function validateSnapshot(meeting, data) {
  if (!data || data.providerId !== meeting.providerId || data.platform !== vexaPlatform(meeting.platform) || data.nativeId !== meeting.nativeId || !Object.hasOwn(MEETING_STATUS, data.status) || ["draft", "queued", "uncertain"].includes(data.status) || !Array.isArray(data.segments) || data.segments.length > 5000) throw new Error("Invalid meeting snapshot.");
  const ids = new Set(); let length = 0;
  const segments = data.segments.filter(s => s?.completed === true).map(s => {
    if (typeof s.segment_id !== "string" || !s.segment_id || s.segment_id.length > 300 || ids.has(s.segment_id) || typeof s.text !== "string" || s.text.length > MAX_TRANSCRIPT || (s.speaker != null && typeof s.speaker !== "string") || !Number.isFinite(s.start) || s.start < 0) throw new Error("Invalid transcript segment.");
    ids.add(s.segment_id);
    const speaker = (s.speaker || "Speaker").slice(0, 120);
    length += s.text.length + speaker.length + 3;
    if (length > MAX_TRANSCRIPT) throw new Error("This meeting exceeds the 100,000-character transcript limit. Export the full transcript from local Vexa.");
    return { id: s.segment_id, type: "transcript", speaker, text: s.text, order: s.start, occurredAt: new Date().toISOString() };
  });
  return { status: data.status, segments: segments.sort((a, b) => a.order - b.order) };
}
