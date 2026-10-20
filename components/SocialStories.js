/* eslint-disable @next/next/no-img-element -- private, authenticated images are served directly. */
import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS } from "../lib/agents";
import { SOCIAL_MOODS, isActiveStory } from "../lib/social-content";
import SocialArtwork from "./SocialArtwork";
import Dialog from "./Dialog";
import styles from "./SocialFeed.module.css";

export function StoryViewer({ stories, initialIndex, onClose, onSeen, onOpenPost, userId, send, onDeleted }) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(() => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const elapsed = useRef(0);
  const seen = useRef(onSeen); seen.current = onSeen;
  const close = useRef(onClose); close.current = onClose;
  const story = stories[index];
  const next = useCallback(() => { if (index + 1 < stories.length) setIndex(index + 1); else close.current(); }, [index, stories.length]);
  useEffect(() => { elapsed.current = 0; setProgress(0); setError(""); setConfirmDelete(false); setImageFailed(false); if (story) seen.current(story.id); }, [story]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility); visibility();
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (paused || hidden || hovered || confirmDelete || busy || !story) return;
    const timer = setInterval(() => { elapsed.current += 100; setProgress(elapsed.current / 10000); if (elapsed.current >= 10000) { clearInterval(timer); next(); } }, 100);
    return () => clearInterval(timer);
  }, [paused, hidden, hovered, confirmDelete, busy, story, next]);
  useEffect(() => {
    const key = e => { if (busy) return; if (e.key === "ArrowRight") { e.preventDefault(); next(); } if (e.key === "ArrowLeft") { e.preventDefault(); setIndex(i => Math.max(0, i - 1)); } };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [next, busy]);
  async function remove() {
    setBusy(true); setError("");
    try { await send({ action: "delete", postId: story.id }); onDeleted(story.id); onClose(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (!story) return null;
  const active = isActiveStory(story);
  const mood = SOCIAL_MOODS[story.mood];
  return <Dialog title="Stories" onClose={onClose} busy={busy}>
    <div className={styles.storyViewer} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false); }}>
      <div className={styles.storyProgress} aria-label={`Story ${index + 1} of ${stories.length}`}>{stories.map((s, i) => <span key={s.id}><i style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} /></span>)}</div>
      {active && <div className={styles.storyVisual}>{story.image && !imageFailed ? <img src={story.image} alt={story.content?.slice(0, 150) || "Story photo"} onError={() => setImageFailed(true)} /> : <SocialArtwork theme={story.art || "sunrise"} title={story.topic || mood?.label || "A moment to share"} compact />}</div>}
      <div className={styles.storyTop}><div><strong>{story.authorName}</strong>{story.ai && <span className={styles.aiBadge}>AI friend · illustration</span>}</div><button type="button" onClick={() => setPaused(v => !v)} aria-label={paused ? "Play stories" : "Pause stories"}>{paused ? "▶" : "Ⅱ"}</button></div>
      <div className={styles.storyCaption}>{!active ? <p>This story has expired.</p> : <>{mood && <span>{mood.emoji} {mood.label}</span>}<p>{story.content}</p><small>{story.ai ? "AI-generated caption · original illustration" : "Shared with Ricomates members"}</small></>}</div>
    </div>
    <div className={styles.storyControls}><button disabled={!index || busy} onClick={() => setIndex(i => Math.max(0, i - 1))} aria-label="Previous story">←</button><span>{index + 1} / {stories.length}</span><button disabled={busy} onClick={next} aria-label={index + 1 < stories.length ? "Next story" : "Finish stories"}>→</button>{active && story.format !== "story" && <button onClick={() => onOpenPost(story)}>View post</button>}{story.authorId === userId && !story.ai && <button onClick={() => { setPaused(true); setConfirmDelete(true); }}>Delete</button>}</div>
    {confirmDelete && <div className={styles.confirm}><span>{story.format === "story" ? "Delete your story?" : "Delete this post and its story?"}</span><button disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete now"}</button><button disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </Dialog>;
}

export default function SocialStories({ stories, seen, onOpen, onCreate, loading, error, onRetry }) {
  const representatives = stories.map((story, index) => ({ story, index })).filter(({ story }, index) => stories.findIndex(s => s.authorId === story.authorId) === index);
  return <section className={styles.storySection} aria-label="Daily stories">
    <div className={styles.storyStrip}><button className={styles.storyCircle} onClick={onCreate}><span className={styles.addStory}>＋</span><strong>Your story</strong><small>Share a moment</small></button>
      {representatives.map(({ story, index }) => <button key={story.authorId} className={styles.storyCircle} onClick={() => onOpen(index)} aria-label={`View ${story.authorName}'s story`}><span className={`${styles.storyRing} ${stories.filter(s => s.authorId === story.authorId).every(s => seen[s.id]) ? styles.seenRing : ""}`}><span className={styles.storyThumb}>{story.image ? <img src={story.image} alt="" /> : <SocialArtwork theme={story.art || "sunrise"} title="" compact />}<i>{story.ai ? AGENTS[story.authorId]?.emoji || "✦" : story.authorName?.slice(0, 1)}</i></span></span><strong>{story.authorName}</strong><small>{story.ai ? "AI friend" : "Member"}</small></button>)}
      {loading && !stories.length && <span className={styles.storyLoading} role="status">Loading stories…</span>}
      {!loading && !stories.length && !error && <span className={styles.storyLoading}>A fresh moment, here for 24 hours.</span>}
    </div>{error && <p className={styles.error} role="alert">Stories couldn’t load. <button className={styles.quiet} onClick={onRetry}>Retry</button></p>}
  </section>;
}
