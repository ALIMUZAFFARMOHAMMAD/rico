// Shared feed-card rendering — used by ClubFeed.js (single club) and
// SocialFeed.js (unified cross-club feed). Cards are club-agnostic: callers
// close over the correct clubId when building onReact/onReport/onReply.
import { useState } from "react";
import { AGENTS } from "../lib/agents";
import TonyCharacter from "./TonyCharacter";

export const INK = "#1a1008";
export const YELLOW = "#ffe566";
export const RED = "#e63946";
export const PURPLE = "#7c4fcd";
export const REACT_EMOJIS = ["💜", "😂", "🔥", "👀"];

export function AuthorAvatar({ authorId, authorName, size = 34 }) {
  const isHuman = authorId?.startsWith("user:");
  if (isHuman) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${INK}`, background: "#fff0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 900, color: PURPLE, flexShrink: 0 }}>
        {(authorName || "?")[0].toUpperCase()}
      </div>
    );
  }
  const a = AGENTS[authorId];
  if (!a) return <div style={{ width: size, height: size, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${INK}`, background: a.look?.hoodie || YELLOW, overflow: "hidden", flexShrink: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ marginTop: 1 }}><TonyCharacter size={Math.round(size * 1.65)} look={a.look || {}} float="none" animated={false} pose="down" /></div>
    </div>
  );
}

export function NameTag({ authorId, authorName }) {
  const isHuman = authorId?.startsWith("user:");
  const agent = !isHuman ? AGENTS[authorId] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Bangers,cursive", fontSize: 10.5, letterSpacing: 1, color: isHuman ? "#888" : PURPLE }}>
      <span>{isHuman ? authorName : `${agent?.emoji || ""} ${authorName}`.trim()}</span>
      {!isHuman && <span style={{ background: INK, color: "white", fontSize: 8, fontWeight: 700, fontFamily: "'Comic Neue',cursive", padding: "1px 5px", borderRadius: 100, letterSpacing: 0.5 }}>AI</span>}
    </div>
  );
}

// Small pill showing which club an item came from — only used in the unified feed.
export function ClubBadge({ emoji, name }) {
  if (!name) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#f3edff", border: `1px solid ${PURPLE}55`, color: PURPLE, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, marginLeft: 6 }}>
      {emoji} {name}
    </span>
  );
}

export function ReactionBar({ item, onReact }) {
  const reactions = item.reactions || {};
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
      {REACT_EMOJIS.map((e) => {
        const count = (reactions[e] || []).length;
        return (
          <button key={e} onClick={() => onReact(item.id, e)} style={{ display: "flex", alignItems: "center", gap: 3, background: count ? "#fff0f5" : "white", border: `2px solid ${INK}`, borderRadius: 100, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>
            <span>{e}</span>{count > 0 && <span style={{ fontFamily: "Bangers,cursive", fontSize: 11, color: INK }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ReportButton({ onReport }) {
  return <button onClick={onReport} title="Report" style={{ background: "none", border: "none", color: "#bbb", fontSize: 12, cursor: "pointer", padding: 2 }}>⚑</button>;
}

export function PostCard({ item, replies, onReact, onReport, onReply, clubBadge }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const submit = () => { if (!replyText.trim()) return; onReply(item.id, replyText); setReplyText(""); setShowReply(false); };
  return (
    <div style={{ border: `3px solid ${INK}`, background: "white", boxShadow: `4px 4px 0 ${INK}`, borderRadius: 4, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <AuthorAvatar authorId={item.authorId} authorName={item.authorName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
              <NameTag authorId={item.authorId} authorName={item.authorName} />
              {clubBadge && <ClubBadge {...clubBadge} />}
            </div>
            <ReportButton onReport={() => onReport(item)} />
          </div>
          <div style={{ fontSize: 13.5, color: INK, fontWeight: 700, lineHeight: 1.5, marginTop: 3 }}>{item.content}</div>
          <ReactionBar item={item} onReact={onReact} />
        </div>
      </div>
      {replies.length > 0 && (
        <div style={{ marginLeft: 34, marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${YELLOW}` }}>
          {replies.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <AuthorAvatar authorId={r.authorId} authorName={r.authorName} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <NameTag authorId={r.authorId} authorName={r.authorName} />
                <div style={{ fontSize: 12.5, color: INK, fontWeight: 600, lineHeight: 1.4 }}>{r.content}</div>
                <ReactionBar item={r} onReact={onReact} />
              </div>
              <ReportButton onReport={() => onReport(r)} />
            </div>
          ))}
        </div>
      )}
      <div style={{ marginLeft: 34, marginTop: 6 }}>
        {!showReply ? (
          <button onClick={() => setShowReply(true)} style={{ background: "none", border: "none", color: "#999", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>💬 Reply</button>
        ) : (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Say something..." style={{ flex: 1, border: `2px solid ${INK}`, padding: "5px 8px", fontFamily: "'Comic Neue',cursive", fontSize: 12, fontWeight: 700, outline: "none" }} />
            <button onClick={submit} style={{ background: PURPLE, color: "white", border: `2px solid ${INK}`, padding: "5px 10px", fontFamily: "Bangers,cursive", fontSize: 12, cursor: "pointer" }}>SEND</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MemeCard({ item, onReact, onReport, clubBadge }) {
  const a = AGENTS[item.authorId];
  return (
    <div style={{ border: `3px solid ${INK}`, background: a?.look?.hoodie ? `${a.look.hoodie}22` : "#fff8e1", boxShadow: `4px 4px 0 ${INK}`, borderRadius: 4, padding: 16, marginBottom: 12, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><AuthorAvatar authorId={item.authorId} authorName={item.authorName} size={40} /></div>
      {clubBadge && <div style={{ marginBottom: 4 }}><ClubBadge {...clubBadge} /></div>}
      <div style={{ fontFamily: "Bangers,cursive", fontSize: 19, letterSpacing: 0.5, color: INK, lineHeight: 1.2 }}>{item.content}</div>
      {item.subcaption && <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginTop: 4 }}>{item.subcaption}</div>}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}><ReactionBar item={item} onReact={onReact} /></div>
      <div style={{ marginTop: 4 }}><ReportButton onReport={() => onReport(item)} /></div>
    </div>
  );
}

export function DebateCard({ item, onReact, onReport, clubBadge }) {
  return (
    <div style={{ border: `3px solid ${RED}`, background: "white", boxShadow: `4px 4px 0 ${RED}`, borderRadius: 4, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "Bangers,cursive", fontSize: 14, color: RED, letterSpacing: 1 }}>⚔️ DEBATE: {item.content}</div>
          {clubBadge && <ClubBadge {...clubBadge} />}
        </div>
        <ReportButton onReport={() => onReport(item)} />
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {(item.debateTurns || []).map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <AuthorAvatar authorId={t.authorId} authorName={AGENTS[t.authorId]?.name} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <NameTag authorId={t.authorId} authorName={AGENTS[t.authorId]?.name} />
              <div style={{ fontSize: 12.5, color: INK, fontWeight: 600, lineHeight: 1.4 }}>{t.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6 }}><ReactionBar item={item} onReact={onReact} /></div>
    </div>
  );
}
