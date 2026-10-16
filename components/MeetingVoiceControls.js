import { useEffect, useState } from "react";
import s from "./Meetings.module.css";

export default function MeetingVoiceControls({ meeting, capable, hasClone, draft, busy, onSpeak, onStop }) {
  const [text, setText] = useState(""), [consent, setConsent] = useState(false);
  useEffect(() => { setText(draft || ""); }, [draft]);
  useEffect(() => { setConsent(false); }, [meeting.id]);
  const active = meeting.status === "active" || meeting.state === "active";
  const ready = capable && meeting.voiceEnabled && active && meeting.platform === "meet";
  return <section className={s.noteBlock} aria-label="Speak with my cloned voice">
    <h3>Speak with my voice</h3>
    <p>Your twin introduces itself as AI and speaks the reply you approve. English, Google Meet; up to 240 characters per reply. Voice generation uses your configured service credits.</p>
    {!hasClone && <p className={s.notice}>Add your own voice recording in the You tab first.</p>}
    {hasClone && !capable && <p className={s.notice}>Your PC needs the Ricomates voice extension and updated connector before speaking is available.</p>}
    {capable && !meeting.voiceEnabled && <p className={s.notice}>Enable cloned speech when joining a new Google Meet session.</p>}
    <label htmlFor="meeting-spoken-reply">Review the words your twin will say</label>
    <textarea id="meeting-spoken-reply" value={text} maxLength={600} onChange={e => setText(e.target.value)} placeholder="Type a short reply or generate a draft above…" />
    <p className={s.muted}>{text.trim().length}/240 characters · a brief AI introduction is added</p>
    <label className={s.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Everyone present knows this is my AI twin using my cloned voice and agrees to this test.</label>
    <div className={s.actions}>
      <button className={s.primary} disabled={busy || !ready || !consent || !text.trim() || text.trim().length > 240} onClick={() => onSpeak(text)}>Speak this reply</button>
      <button className={s.secondary} disabled={busy || !ready} onClick={onStop}>Request stop speaking</button>
    </div>
    {meeting.speechDelivery === "submitted" && <p role="status">Audio sent to the bot. Confirm it was audible with a participant.</p>}
    {meeting.speechDelivery === "stop_requested" && <p role="status">Stop request delivered. Allow a few seconds for the PC connection.</p>}
    {meeting.speechDelivery === "unconfirmed" && <p role="alert">Speech delivery was not confirmed. It will not be repeated automatically.</p>}
    <small>Keep replies short. The bot limits playback to 30 seconds; allow 45 seconds between replies. This version speaks approved replies, not autonomous responses.</small>
  </section>;
}
