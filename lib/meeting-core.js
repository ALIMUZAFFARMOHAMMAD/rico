// Shared meeting rules. This module contains no credentials or private twin data.
export const MEETING_PLATFORMS = { zoom: "Zoom", teams: "Microsoft Teams", meet: "Google Meet", whatsapp: "WhatsApp / phone", notes: "Notes only" };
export const MEETING_STATUS = { draft: "Ready to prepare", queued: "Waiting for your PC", requested: "Requested", joining: "Joining meeting", awaiting_admission: "Waiting for the host", needs_help: "Host action needed", active: "In meeting · transcribing", stopping: "Leaving meeting", completed: "Finished", failed: "Could not complete call", uncertain: "Check the local Vexa dashboard", idle: "Preparing", scheduled: "Scheduled" };
export const validMeetingId = id => typeof id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
export const terminalMeeting = status => ["completed", "failed"].includes(status);
export const vexaPlatform = platform => platform === "meet" ? "google_meet" : platform;
export const MAX_TRANSCRIPT = 100000;
export function meetingUrl(value, platform) {
  if (typeof value !== "string" || value.length > 2048) throw new Error("Paste a valid meeting link.");
  let url; try { url = new URL(value); } catch { throw new Error("Paste a full https meeting link."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Use a secure meeting link without a custom port.");
  const host = url.hostname.toLowerCase();
  const supported = platform === "zoom" ? (host === "zoom.us" || host.endsWith(".zoom.us")) && /^\/(j|my)\/.+/.test(url.pathname)
    : platform === "teams" ? ["teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft"].includes(host) && /^\/(l\/meetup-join|meet)\/.+/.test(url.pathname)
      : platform === "meet" ? host === "meet.google.com" && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url.pathname) : false;
  if (!supported) throw new Error("Use a direct meeting link for the selected platform. WhatsApp and phone calls support imported notes only.");
  return url.toString();
}
export function transcriptText(events) {
  return events.filter(e => e.type === "transcript").map(e => `${e.speaker || "Speaker"}: ${e.text}`).join("\n");
}
export function meetingState(meeting, events) {
  const status = events.filter(e => e.type === "status").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).at(-1);
  return status?.status || meeting.state || "draft";
}
export function notesMarkdown(meeting, notes) {
  const list = values => values?.length ? values.map(v => `- ${v}`).join("\n") : "- Not stated in the transcript.";
  return `# ${meeting.title}\n\nAI meeting notes — review against the transcript.\n\n${notes.summary}\n\n## Key points\n${list(notes.keyPoints)}\n\n## Decisions\n${list(notes.decisions)}\n\n## Action items\n${list(notes.actions.map(a => `${a.task} — Owner: ${a.owner || "Unassigned"}; Due: ${a.due || "Not stated"}`))}\n\n## Open questions\n${list(notes.openQuestions)}\n\n## Important moments\n${list(notes.importantMoments)}\n`;
}
