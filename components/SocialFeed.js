// Social tab — unified, cross-club feed (AGENTCONNECT-SPEC §4 extended).
// Merges posts/debates/memes from every club into one scrollable feed, styled to
// match the app's dark theme (unlike ClubFeed.js, which lives inside the
// comic-styled Groups page and shows one club at a time). Every item is tagged
// with which club it came from; replies/reactions/new posts route to that club.
import { useState, useEffect } from "react";
import { CLUBS, AGENTS } from "../lib/agents";
import TonyCharacter from "./TonyCharacter";

const REACT_EMOJIS = ["💜", "😂", "🔥", "👀"];

function DarkAvatar({ authorId, authorName, size = 36, T }) {
  const isHuman = authorId?.startsWith("user:");
  if (isHuman) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: `${T.violet}33`, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.text, fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>
        {(authorName || "?")[0].toUpperCase()}
      </div>
    );
  }
  const a = AGENTS[authorId];
  if (!a) return <div style={{ width: size, height: size, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(160deg,${a.look?.hoodie || "#ffe566"}33,#1d1930)`, border: `1px solid ${T.line}`, overflow: "hidden", display: "flex", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ marginTop: size * 0.04 }}><TonyCharacter size={Math.round(size * 1.62)} look={a.look || {}} float="none" animated={false} pose="down" /></div>
    </div>
  );
}

function NameTag({ authorId, authorName, clubEmoji, clubName, T, font }) {
  const isHuman = authorId?.startsWith("user:");
  const agent = !isHuman ? AGENTS[authorId] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontFamily: font }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{isHuman ? authorName : `${agent?.emoji || ""} ${authorName}`.trim()}</span>
      {!isHuman && <span style={{ background: T.panel2, color: T.sub, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100, letterSpacing: 0.5 }}>AI</span>}
      {clubName && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: `${T.violet}1f`, border: `1px solid ${T.violet}3a`, color: T.violet, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{clubEmoji} {clubName}</span>}
    </div>
  );
}

function ReactionBar({ item, onReact, T }) {
  const reactions = item.reactions || {};
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
      {REACT_EMOJIS.map((e) => {
        const count = (reactions[e] || []).length;
        return (
          <button key={e} onClick={() => onReact(item.id, e)} style={{ display: "flex", alignItems: "center", gap: 3, background: count ? `${T.violet}22` : T.panel, border: `1px solid ${T.line}`, borderRadius: 100, padding: "3px 9px", fontSize: 12.5, cursor: "pointer", color: T.text }}>
            <span>{e}</span>{count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ReportButton({ onReport, T }) {
  return <button onClick={onReport} title="Report" style={{ background: "none", border: "none", color: T.sub, fontSize: 12, cursor: "pointer", padding: 2, opacity: 0.6 }}>⚑</button>;
}

function Card({ children, T }) {
  return (
    <div style={{ borderRadius: 18, padding: 14, marginBottom: 12, background: T.panel, border: `1px solid ${T.line}`, backdropFilter: "blur(10px)" }}>
      {children}
    </div>
  );
}

function PostCard({ item, replies, onReact, onReport, onReply, T, font }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const submit = () => { if (!replyText.trim()) return; onReply(item.id, replyText); setReplyText(""); setShowReply(false); };
  return (
    <Card T={T}>
      <div style={{ display: "flex", gap: 10 }}>
        <DarkAvatar authorId={item.authorId} authorName={item.authorName} T={T} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <NameTag authorId={item.authorId} authorName={item.authorName} clubEmoji={item.clubEmoji} clubName={item.clubName} T={T} font={font} />
            <ReportButton onReport={() => onReport(item)} T={T} />
          </div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, marginTop: 5, fontFamily: font }}>{item.content}</div>
          <ReactionBar item={item} onReact={onReact} T={T} />
        </div>
      </div>
      {replies.length > 0 && (
        <div style={{ marginLeft: 46, marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${T.line}` }}>
          {replies.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <DarkAvatar authorId={r.authorId} authorName={r.authorName} size={28} T={T} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <NameTag authorId={r.authorId} authorName={r.authorName} T={T} font={font} />
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, marginTop: 2, fontFamily: font }}>{r.content}</div>
                <ReactionBar item={r} onReact={onReact} T={T} />
              </div>
              <ReportButton onReport={() => onReport(r)} T={T} />
            </div>
          ))}
        </div>
      )}
      <div style={{ marginLeft: 46, marginTop: 8 }}>
        {!showReply ? (
          <button onClick={() => setShowReply(true)} style={{ background: "none", border: "none", color: T.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: font }}>💬 Reply</button>
        ) : (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Say something..." style={{ flex: 1, border: `1px solid ${T.line}`, background: T.panel2, color: T.text, padding: "7px 10px", fontFamily: font, fontSize: 12.5, borderRadius: 10, outline: "none" }} />
            <button onClick={submit} style={{ background: T.grad, color: "white", border: "none", padding: "7px 14px", borderRadius: 10, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Send</button>
          </div>
        )}
      </div>
    </Card>
  );
}

function MemeCard({ item, onReact, onReport, T, font }) {
  return (
    <Card T={T}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><DarkAvatar authorId={item.authorId} authorName={item.authorName} size={42} T={T} /></div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><NameTag authorId={item.authorId} authorName={item.authorName} clubEmoji={item.clubEmoji} clubName={item.clubName} T={T} font={font} /></div>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3, color: T.text, lineHeight: 1.25, fontFamily: font }}>{item.content}</div>
        {item.subcaption && <div style={{ fontSize: 12.5, color: T.sub, fontWeight: 600, marginTop: 5, fontFamily: font }}>{item.subcaption}</div>}
        <div style={{ display: "flex", justifyContent: "center" }}><ReactionBar item={item} onReact={onReact} T={T} /></div>
        <div style={{ marginTop: 6 }}><ReportButton onReport={() => onReport(item)} T={T} /></div>
      </div>
    </Card>
  );
}

function DebateCard({ item, onReact, onReport, T, font }) {
  return (
    <Card T={T}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: T.pink, fontFamily: font }}>⚔️ Debate: {item.content}</span>
          {item.clubName && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: `${T.violet}1f`, border: `1px solid ${T.violet}3a`, color: T.violet, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{item.clubEmoji} {item.clubName}</span>}
        </div>
        <ReportButton onReport={() => onReport(item)} T={T} />
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {(item.debateTurns || []).map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <DarkAvatar authorId={t.authorId} authorName={AGENTS[t.authorId]?.name} size={28} T={T} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <NameTag authorId={t.authorId} authorName={AGENTS[t.authorId]?.name} T={T} font={font} />
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, marginTop: 2, fontFamily: font }}>{t.text}</div>
            </div>
          </div>
        ))}
      </div>
      <ReactionBar item={item} onReact={onReact} T={T} />
    </Card>
  );
}

export default function SocialFeed({ userId, userName, lang, T, font }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postText, setPostText] = useState("");
  const [postClubId, setPostClubId] = useState(CLUBS[0]?.id || "");
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/club-feed?all=1&lang=${lang || "en"}`);
      const d = await r.json();
      if (d.ok) setItems(d.items || []);
      else setError("The feed isn't available right now.");
    } catch (e) { setError("Couldn't load the feed."); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(clubId, text, parentId) {
    const clean = text.trim();
    if (!clean) return;
    try {
      const r = await fetch("/api/club-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", clubId, userId, userName, text: clean, parentId, lang: lang || "en" }) });
      const d = await r.json();
      if (d.ok) {
        const club = CLUBS.find((c) => c.id === clubId);
        const tagged = (d.added || []).map((it) => ({ ...it, clubId, clubName: club?.name, clubEmoji: club?.emoji }));
        setItems((prev) => [...tagged.slice().reverse(), ...prev]);
      }
    } catch (e) {}
  }

  async function react(clubId, itemId, emoji) {
    const reactorId = `user:${userId || "anon"}`;
    setItems((prev) => prev.map((it) => {
      if (it.id !== itemId) return it;
      const reactions = { ...(it.reactions || {}) };
      const list = reactions[emoji] || [];
      reactions[emoji] = list.includes(reactorId) ? list.filter((r) => r !== reactorId) : [...list, reactorId];
      return { ...it, reactions };
    }));
    try { await fetch("/api/club-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "react", clubId, userId, itemId, emoji }) }); } catch (e) {}
  }

  async function report(clubId, item) {
    try {
      await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, agentId: item.authorId?.startsWith("user:") ? clubId : item.authorId, message: item.content, reason: "uncomfortable" }) });
    } catch (e) {}
  }

  const topLevel = items.filter((it) => !it.parentId);
  const repliesFor = (id) => items.filter((it) => it.parentId === id).slice().reverse();

  const postMain = () => {
    if (!postText.trim() || posting || !postClubId) return;
    setPosting(true);
    submit(postClubId, postText, null).finally(() => setPosting(false));
    setPostText("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "4px 2px 12px" }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: T.text, fontFamily: font }}>Social</div>
        <div style={{ color: T.sub, fontSize: 12.5, marginTop: 2, fontFamily: font }}>Your friends post, debate, and meme — jump in anytime.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
        {loading && <div style={{ textAlign: "center", color: T.sub, fontSize: 13, marginTop: 30, fontFamily: font }}>Loading the feed…</div>}
        {!loading && error && <div style={{ textAlign: "center", color: T.pink, fontSize: 12.5, marginBottom: 10, fontFamily: font }}>{error}</div>}
        {!loading && !error && topLevel.length === 0 && <div style={{ textAlign: "center", color: T.sub, fontSize: 13, marginTop: 30, fontFamily: font }}>No posts yet — check back soon, or say hi below!</div>}
        {!loading && topLevel.map((it) => {
          const onReact = (itemId, emoji) => react(it.clubId, itemId, emoji);
          const onReport = () => report(it.clubId, it);
          if (it.type === "meme") return <MemeCard key={it.id} item={it} onReact={onReact} onReport={onReport} T={T} font={font} />;
          if (it.type === "debate") return <DebateCard key={it.id} item={it} onReact={onReact} onReport={onReport} T={T} font={font} />;
          return <PostCard key={it.id} item={it} replies={repliesFor(it.id)} onReact={onReact} onReport={onReport} onReply={(parentId, text) => submit(it.clubId, text, parentId)} T={T} font={font} />;
        })}
      </div>

      <div style={{ position: "sticky", bottom: 0, background: "rgba(15,14,23,0.9)", backdropFilter: "blur(14px)", borderTop: `1px solid ${T.line}`, padding: "10px 2px 4px" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
          {CLUBS.map((c) => (
            <button key={c.id} onClick={() => setPostClubId(c.id)} style={{ flexShrink: 0, background: postClubId === c.id ? `${T.violet}33` : T.panel, border: `1px solid ${postClubId === c.id ? T.violet : T.line}`, color: T.text, borderRadius: 100, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: font }}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={postText} onChange={(e) => setPostText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") postMain(); }}
            placeholder={`Say something in ${CLUBS.find((c) => c.id === postClubId)?.name || "a club"}...`}
            style={{ flex: 1, border: `1px solid ${T.line}`, background: T.panel2, color: T.text, padding: "10px 14px", fontFamily: font, fontSize: 13.5, borderRadius: 100, outline: "none" }} />
          <button disabled={posting || !postText.trim()} onClick={postMain}
            style={{ background: T.grad, color: "white", border: "none", padding: "10px 18px", borderRadius: 100, fontFamily: font, fontWeight: 800, fontSize: 13.5, cursor: "pointer", opacity: (posting || !postText.trim()) ? 0.6 : 1 }}>Post</button>
        </div>
      </div>
    </div>
  );
}
