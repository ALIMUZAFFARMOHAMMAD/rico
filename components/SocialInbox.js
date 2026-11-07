import { useEffect, useState } from "react";
import TonyCharacter from "./TonyCharacter";
import s from "./SocialUI.module.css";

function Portrait({ friend }) {
  return <span className={s.avatar}>{friend.avatar ? <img src={friend.avatar} alt="" /> : <TonyCharacter size={86} look={friend.look || {}} float="none" animated={false} pose="down" />}</span>;
}

export default function SocialInbox({ userId, friends, onChat, onDiscover, onPlay, onProfile, children }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [summaries, setSummaries] = useState({});
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading"); setSummaries({});
    fetch(`/api/conversation?userId=${encodeURIComponent(userId)}&summary=1`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setSummaries(Object.fromEntries((data.conversations || []).map(item => [item.agentId, item]))); setStatus("ready"); })
      .catch(error => { if (error.name !== "AbortError") setStatus("error"); });
    return () => controller.abort();
  }, [userId, retry]);
  const visible = friends.filter(friend => `${friend.name} ${friend.bio || ""}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All" || (filter === "Twins" ? friend.isTwin : !friend.isTwin)))
    .sort((a,b) => (Date.parse(summaries[b.id]?.updatedAt) || 0) - (Date.parse(summaries[a.id]?.updatedAt) || 0));
  return <section className={s.inbox}>
    <header className={s.hero}><div><span className={s.eyebrow}>Your circle</span><h1>Good company.<br />One hello away.</h1><p className={s.muted}>Pick up a conversation, call, or play together.</p></div><button className={s.secondary} onClick={onDiscover}>Meet friends ↗</button></header>
    <div className={s.stories} aria-label="Your friends">{friends.map(friend => <button key={friend.id} className={s.story} onClick={() => onChat(friend)}><Portrait friend={friend} /><span>{friend.name}</span></button>)}</div>
    <div className={s.grid}><div>
      {children}
      <label><span className={s.eyebrow}>Find a conversation</span><input className={s.search} aria-label="Search your friends" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or interest…" /></label>
      <div className={s.filters}>{["All","AI friends","Twins"].map(item => <button key={item} className={s.filter} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {status === "loading" && <p role="status" className={s.muted}>Finding your latest conversations…</p>}
      {status === "error" && <div role="alert" className={s.notice}>We couldn’t load recent messages. Your friends are still here. <button className={s.secondary} onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {visible.map(friend => <article key={friend.id} className={s.conversation}>
        <button className={s.openChat} onClick={() => onChat(friend)}><Portrait friend={friend} /><span className={s.preview}><strong>{friend.name}</strong><span className={s.badge}>{friend.isTwin ? "AI twin of a person" : "AI friend"}</span><p>{summaries[friend.id]?.preview || friend.bio || "Start with a hello."}</p></span></button>
        <a className={s.call} href={`/voice?agent=${encodeURIComponent(friend.id)}`} aria-label={`Call ${friend.name}`}>Call ↗</a>
      </article>)}
      {!visible.length && <div className={s.empty}>No friends match that search.<br /><button className={s.secondary} onClick={() => { setQuery(""); setFilter("All"); }}>Show everyone</button></div>}
    </div><aside className={s.aside}>
      <div className={`${s.card} ${s.peach}`}><span>✦ A little friendly competition</span><h2>Make room<br />for play.</h2><p>Board games, quick questions, and stories with your AI friends.</p><button className={s.secondary} onClick={onPlay}>Find a game →</button></div>
      <div className={`${s.card} ${s.mint}`}><span>◎ Better together</span><h2>Your group,<br />your vibe.</h2><p>Bring a few AI friends into one conversation.</p><a className={s.secondary} href="/groups">Open group chats →</a></div>
      <div className={s.card}><h2>A voice that’s yours.</h2><p className={s.muted}>Create your AI twin and personalize its voice from your profile.</p><button className={s.primary} onClick={onProfile}>Meet your twin →</button></div>
    </aside></div>
  </section>;
}
