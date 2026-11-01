import s from "./Meetings.module.css";

export default function MeetingReadiness({ device, hasClone, meeting, events = [], onRecover }) {
  const spoken = events.filter(event => event.type === "transcript");
  const stages = [
    ["PC connection", device?.online ? "Connected" : "Offline — start your connector"],
    ["Meeting service", device?.online ? device.runtimeStatus === "ready" ? "Ready" : device.runtimeStatus === "unavailable" ? "Unavailable — restart meeting services" : "Not checked — update your connector" : "Waiting for PC"],
    ["Speech recognition", device?.online ? device.speechStatus === "ready" ? "Model ready" : device.speechStatus === "unavailable" ? "Unavailable — run Listening Check" : "Not checked — update your connector" : "Waiting for PC"],
    ["Your voice", hasClone ? "Clone saved" : "Add your voice in You"],
    ["Live transcript", spoken.length ? `${spoken.length} confirmed segments` : meeting?.status === "active" ? "No speech received yet — unmute and speak" : "Waiting for an admitted meeting"],
  ];
  return <section className={s.readiness} aria-label="Meeting readiness">
    <div className={s.row}><h3>Connection check</h3><button className={s.secondary} onClick={onRecover}>Connection help</button></div>
    <dl>{stages.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {device?.lastSeen && <p className={s.muted}>Last PC update: {new Date(device.lastSeen).toLocaleString()}</p>}
  </section>;
}
