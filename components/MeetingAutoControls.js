import { useEffect, useState } from "react";
import s from "./Meetings.module.css";
import a from "./MeetingAutoControls.module.css";

export default function MeetingAutoControls({ meeting, automatic, device, hasClone, onChange }) {
  const [callName, setCallName] = useState("Rico"), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { setCallName(automatic?.callName || "Rico"); setConsent(false); setError(""); }, [meeting.id, automatic?.callName]);
  const active = automatic?.enabled && Date.parse(automatic.expiresAt) > Date.now() && automatic.count < 40 && meeting.status === "active";
  const ready = device?.online && device.autoVersion === 1 && device.voiceVersion === 1 && hasClone && meeting.voiceEnabled && meeting.status === "active" && meeting.platform === "meet";
  async function configure(enabled) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/meeting-auto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "configure", id: meeting.id, enabled, callName, consent }), signal: AbortSignal.timeout(20000) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not update automatic replies.");
      onChange(data.auto);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className={a.panel} aria-label="Automatic meeting replies">
    <div className={s.row}><h3>Let your twin answer</h3><span className={s.pill}>{active ? automatic.status === "thinking" ? "Thinking…" : automatic.status === "queued" ? "Preparing voice…" : "Listening" : "Automatic replies off"}</span></div>
    <p>Your twin listens for its call name, waits for a pause and replies in your cloned voice and personality. No approval needed for each answer. Every reply identifies it as your AI twin.</p>
    {automatic?.enabled ? <>
      <p>Say <strong>“{automatic.callName}, what do you think?”</strong> to ask a question. {automatic.count}/40 replies this session.</p>
      <button className={s.danger} disabled={busy} onClick={() => configure(false)}>{busy ? "Pausing…" : "Pause & stop speaking"}</button>
      {automatic.lastReply && <p><strong>Latest reply:</strong> {automatic.lastReply}</p>}
    </> : <>
      {!ready && <p className={s.notice}>Join a Google Meet with cloned speech enabled and keep the updated PC connector running.</p>}
      <label htmlFor="twin-call-name">Name to address in the meeting</label><input id="twin-call-name" value={callName} maxLength={40} onChange={e => setCallName(e.target.value)} placeholder="Rico" />
      <p>Answers use your <a href="/twin-studio" target="_blank" rel="noreferrer">twin profile</a> and this meeting’s briefing. Review the facts you want shared before enabling. Missing facts are left for you to confirm.</p>
      <label className={s.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Everyone present agrees to automatic AI replies in my cloned voice. I approve using my twin profile and meeting briefing for spoken answers.</label>
      <button className={s.primary} disabled={busy || !ready || !consent || !!automatic?.stopId} onClick={() => configure(true)}>{busy ? "Enabling…" : "Enable automatic replies"}</button>
      {automatic?.stopId && <p role="status">Stop requested. Waiting for the PC to confirm; allow a few seconds.</p>}
    </>}
    {(error || automatic?.error) && <p className={s.error} role="alert">{error || automatic.error}</p>}
    <p className={s.muted}>English · Google Meet · short answers, at least 45 seconds apart · pauses after 1 hour or 40 replies. Uses your AI and voice service credits. Transcription can mishear words; review important answers.</p>
  </section>;
}
