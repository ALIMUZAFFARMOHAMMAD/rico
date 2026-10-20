import { createHash } from "crypto";
import { sb, getRow, upsertRow } from "./db";
import { meetingState, transcriptText, MAX_TRANSCRIPT } from "./meeting-core";

export const meetingKey = (owner, id) => `${owner}::meeting::${id}`;
export const digest = text => createHash("sha256").update(text).digest("hex");
export async function getMeeting(owner, id) {
  const row = await getRow(meetingKey(owner, id));
  return row?.traits?.kind === "meeting" && row.traits.owner === owner && !row.traits.deleted ? row.traits : null;
}
export async function listMeetings(owner) {
  const rows = await sb(`/conversations?traits->>kind=eq.meeting&traits->>owner=eq.${encodeURIComponent(owner)}&select=user_id,traits&order=updated_at.desc&limit=60`);
  return (rows || []).filter(r => r.user_id === meetingKey(owner, r.traits.id) && !r.traits.deleted).map(r => r.traits);
}
export async function saveMeeting(meeting) {
  await upsertRow(meetingKey(meeting.owner, meeting.id), { traits: { ...meeting, kind: "meeting" } });
}
export async function meetingEvents(meeting) {
  const rows = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const page = await sb(`/conversations?traits->>kind=eq.meeting-event&traits->>meetingId=eq.${meeting.id}&traits->>owner=eq.${encodeURIComponent(meeting.owner)}&select=user_id,traits&order=updated_at.asc,id.asc&limit=1000&offset=${offset}`);
    rows.push(...(page || []));
    if (!page || page.length < 1000) break;
  }
  const snapshot = (await getRow(`${meetingKey(meeting.owner, meeting.id)}::snapshot`))?.traits;
  const live = snapshot?.providerId === meeting.providerId && snapshot?.owner === meeting.owner ? snapshot.segments || [] : [];
  return [...new Map(rows.filter(r => r.user_id.startsWith(`${meetingKey(meeting.owner, meeting.id)}::event::`)).map(r => [r.traits.id, r.traits])).values(), ...live].sort((a, b) => (a.order || 0) - (b.order || 0) || a.occurredAt.localeCompare(b.occurredAt));
}
export async function saveMeetingEvent(meeting, id, event) {
  const key = `${meetingKey(meeting.owner, meeting.id)}::event::${digest(id)}`;
  if (await getRow(key)) return false;
  await upsertRow(key, { traits: { ...event, id: digest(id), kind: "meeting-event", meetingId: meeting.id, owner: meeting.owner }, updated_at: event.occurredAt });
  return true;
}
export async function meetingDetail(meeting) {
  const events = await meetingEvents(meeting);
  const summary = (await getRow(`${meetingKey(meeting.owner, meeting.id)}::notes`))?.traits || null;
  const text = transcriptText(events);
  const snapshot = (await getRow(`${meetingKey(meeting.owner, meeting.id)}::snapshot`))?.traits;
  const status = snapshot?.providerId === meeting.providerId ? snapshot?.status : null;
  const automatic = (await getRow(`${meetingKey(meeting.owner, meeting.id)}::auto`))?.traits || null;
  return { meeting: { ...meeting, status: status || meetingState(meeting, events), lastTranscriptAt: snapshot?.receivedAt }, auto: automatic, events, notes: summary?.notes || null, notesError: summary?.error || null, notesStale: !!summary?.sourceHash && digest(text) !== summary.sourceHash, transcriptLimit: text.length > MAX_TRANSCRIPT };
}
export async function deleteMeetingData(meeting) {
  // The caller holds the operation lock. Remove children before the tombstone,
  // so a failed delete remains visible and can be retried.
  const rows = await sb(`/conversations?traits->>meetingId=eq.${meeting.id}&traits->>owner=eq.${encodeURIComponent(meeting.owner)}&select=id,user_id&limit=10000`);
  for (const row of rows || []) if (row.user_id.startsWith(`${meetingKey(meeting.owner, meeting.id)}::`)) await sb(`/conversations?id=eq.${row.id}`, "DELETE");
  await saveMeeting({ id: meeting.id, owner: meeting.owner, deleted: true, operation: "idle" });
}
// A conditional database update is the cross-instance lock. In-memory locks do
// not protect against two Vercel instances joining or sending at the same time.
export async function claimMeeting(meeting, operation) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/conversations?user_id=eq.${encodeURIComponent(meetingKey(meeting.owner, meeting.id))}&traits->>operation=eq.idle`;
  const r = await fetch(url, { method: "PATCH", signal: AbortSignal.timeout(10000), headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ traits: { ...meeting, operation }, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error("Could not reserve this meeting operation.");
  return (await r.json()).length > 0;
}
