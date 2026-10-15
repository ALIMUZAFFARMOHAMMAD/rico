import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS } from "../lib/agents";
import { resizeImage } from "../lib/resizeImage";
import styles from "./SocialFeed.module.css";

function Icon({ name, size = 20 }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    comment: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z" />,
    photo: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 3M18 18A8 8 0 0 1 5 15" /></>,
    send: <path d="m3 3 18 9-18 9 3-9-3-9ZM6 12h15" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Avatar({ name, ai, authorId }) {
  return <span className={`${styles.avatar} ${ai ? styles.aiAvatar : ""}`} aria-hidden="true">{(ai && AGENTS[authorId]?.emoji) || (name || "M").slice(0, 1).toUpperCase()}</span>;
}
function timestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
async function request(url, body, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(url, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not complete that. Please try again.");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("This is taking too long. Your draft is kept — please retry.");
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
function Composer({ userName, send, onCreated }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(null);
  const textarea = useRef(null);
  const dirty = () => { requestId.current = null; setError(""); };
  async function choosePhoto(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) { setError("Choose a photo smaller than 12 MB."); return; }
    setReading(true); setError("");
    try {
      let blob = file;
      if (/heic|heif/i.test(file.type + file.name)) {
        const { default: convert } = await import("heic2any");
        let timer;
        try { blob = await Promise.race([convert({ blob: file, toType: "image/jpeg", quality: 0.8 }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 20000); })]); }
        finally { clearTimeout(timer); }
        if (Array.isArray(blob)) blob = blob[0];
      }
      let result = await resizeImage(blob, 1024, 0.78);
      if (result.length > 349500) result = await resizeImage(blob, 768, 0.65);
      if (result.length > 349500) result = await resizeImage(blob, 512, 0.6);
      if (result.length > 349500) throw new Error("size");
      dirty(); setPhoto(result);
    } catch { setError("Could not open that photo. Try a JPG, PNG or WebP image."); }
    finally { setReading(false); }
  }
  async function publish(event) {
    event.preventDefault(); if (busy || reading || (!text.trim() && !photo)) return;
    setBusy(true); setError(""); requestId.current ||= crypto.randomUUID();
    try {
      const data = await send({ action: "post", id: requestId.current, content: text, image: photo });
      setText(""); setPhoto(null); setExpanded(false); requestId.current = null; onCreated(data.post);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <form className={styles.composer} onSubmit={publish} aria-label="Create a post">
    <div className={styles.composerTop}><Avatar name={userName} /><div><strong>Your everyday, shared.</strong><p>A small win, a good photo, a thought worth sharing.</p></div></div>
    <textarea ref={textarea} aria-label="Post caption" placeholder={`What’s happening, ${userName?.split(" ")[0] || "friend"}?`} value={text} maxLength={2000} disabled={busy} onFocus={() => setExpanded(true)} onChange={e => { dirty(); setText(e.target.value); }} rows={expanded ? 3 : 1} />
    {expanded && !text && !photo && <div className={styles.prompts}>{["Today’s small win: ", "A little thing I loved today: ", "A question for everyone: "].map(prompt => <button type="button" key={prompt} onClick={() => { dirty(); setText(prompt); textarea.current?.focus(); }}>{prompt.trim()}</button>)}</div>}
    {photo && <div className={styles.photoPreview}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo} alt="Your photo ready to post" /><button className={styles.removePhoto} type="button" disabled={busy} onClick={() => { dirty(); setPhoto(null); }} aria-label="Remove photo">✕</button></div>}
    <div className={styles.composerBottom}><label className={`${styles.photoButton} ${busy || reading ? styles.disabled : ""}`}><Icon name="photo" />{reading ? "Preparing…" : "Photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Add photo to post" disabled={busy || reading} onChange={choosePhoto} /></label><span className={styles.audience}>Visible to members{text.length > 1600 && ` · ${text.length}/2000`}</span><button className={styles.publish} disabled={busy || reading || (!text.trim() && !photo)}><Icon name="send" size={17} />{busy ? "Posting…" : "Post"}</button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
function Post({ post, userId, send, onChange, onDelete }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [nextOffset, setNextOffset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reported, setReported] = useState(false);
  const commentId = useRef(null);
  async function loadComments(offset = 0) {
    setLoading(true); setError("");
    try {
      const data = await request(`/api/social?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(post.id)}&offset=${offset}`);
      setComments(prev => [...new Map([...(offset ? prev : []), ...data.comments].map(c => [c.id, c])).values()]); setNextOffset(data.nextOffset); setLoaded(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  async function act(action, extra = {}) {
    if (busy) return; setBusy(action); setError("");
    try {
      const data = await send({ action, postId: post.id, ...extra });
      if (action === "delete") onDelete(post.id);
      else if (action === "report") setReported(true);
      else {
        onChange(post.id, { likes: data.likes, liked: data.liked, comments: data.comments });
        if (data.comment) { setComments(prev => [data.comment, ...prev.filter(c => c.id !== data.comment.id)]); setText(""); commentId.current = null; }
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }
  return <article className={styles.card} aria-label={`Post by ${post.authorName}`}>
    <header className={styles.postHeader}><Avatar name={post.authorName} ai={post.ai} authorId={post.authorId} /><div className={styles.byline}><div><strong>{post.authorName}</strong>{post.ai && <span className={styles.aiBadge}>AI friend</span>}</div><time dateTime={post.createdAt}>{timestamp(post.createdAt)}</time></div>{!post.ai && post.authorId === userId ? <button className={styles.quiet} disabled={!!busy} onClick={() => setConfirmDelete(v => !v)}>Delete</button> : <button className={styles.quiet} disabled={!!busy || reported} onClick={() => act("report")}>{reported ? "Reported" : "Report"}</button>}</header>
    {post.image && <div className={styles.postImage}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={post.image} alt={post.content ? post.content.slice(0, 150) : `Photo shared by ${post.authorName}`} loading="lazy" decoding="async" /></div>}
    <div className={post.ai ? `${styles.content} ${styles.aiContent}` : styles.content}>{post.ai && <span className={styles.topic}>{post.topic || "A daily thought"}</span>}<p>{post.content}</p>{post.ai && <span className={styles.aiFootnote}>A little inspiration from your AI circle</span>}</div>
    <footer className={styles.actions}><button className={post.liked ? styles.liked : ""} disabled={!!busy} aria-pressed={post.liked} aria-label={`${post.liked ? "Unlike" : "Like"} post by ${post.authorName}`} onClick={() => act("like", { liked: !post.liked })}><Icon name="heart" /><span>{post.likes || "Like"}</span></button><button aria-expanded={showComments} onClick={() => { setShowComments(v => !v); if (!showComments && !loaded) loadComments(); }}><Icon name="comment" /><span>{post.comments ? `${post.comments} ${post.comments === 1 ? "comment" : "comments"}` : "Comment"}</span></button>{post.ai && <span className={styles.generated}>AI-generated</span>}</footer>
    {confirmDelete && <div className={styles.confirm}><span>Delete this post and its comments?</span><button disabled={!!busy} onClick={() => act("delete")}>{busy === "delete" ? "Deleting…" : "Delete post"}</button><button disabled={!!busy} onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
    {showComments && <section className={styles.comments} aria-label={`Comments on ${post.authorName}'s post`}>
      <form onSubmit={e => { e.preventDefault(); if (text.trim()) { commentId.current ||= crypto.randomUUID(); act("comment", { id: commentId.current, content: text }); } }}><input aria-label={`Comment on ${post.authorName}'s post`} placeholder="Add to the conversation…" value={text} maxLength={500} disabled={!!busy} onChange={e => { commentId.current = null; setText(e.target.value); }} /><button className={styles.publish} disabled={!!busy || !text.trim()} aria-label="Send comment"><Icon name="send" size={18} /></button></form>
      {loading && <p className={styles.muted} role="status">Loading comments…</p>}
      {!loading && !loaded && <button className={styles.quiet} onClick={() => loadComments()}>Retry loading comments</button>}
      {loaded && !comments.length && <p className={styles.muted}>Be the first to say something.</p>}
      {comments.map(c => <div className={styles.comment} key={c.id}><Avatar name={c.authorName} /><div><strong>{c.authorName}</strong><p>{c.content}</p><time dateTime={c.createdAt}>{timestamp(c.createdAt)}</time></div></div>)}
      {nextOffset !== null && <button className={styles.more} disabled={loading} onClick={() => loadComments(nextOffset)}>Older comments</button>}
    </section>}
    {error && <p role="alert" className={`${styles.error} ${styles.cardError}`}>{error}</p>}
  </article>;
}
export default function SocialFeed({ userId, userName, T, font }) {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [nextOffset, setNextOffset] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const activeRequest = useRef(null);
  const load = useCallback(async (offset = 0) => {
    activeRequest.current?.abort(); const controller = new AbortController(); activeRequest.current = controller;
    setLoading(true); setError("");
    try {
      const data = await request(`/api/social?userId=${encodeURIComponent(userId)}&filter=${filter}&offset=${offset}`, null, controller.signal);
      if (controller.signal.aborted) return;
      setPosts(prev => [...new Map([...(offset ? prev : []), ...data.posts].map(p => [p.id, p])).values()]); setNextOffset(data.nextOffset);
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [userId, filter]);
  useEffect(() => { setPosts([]); setNextOffset(null); load(); return () => activeRequest.current?.abort(); }, [load]);
  const send = body => request("/api/social", { ...body, userId, userName });
  return <div className={styles.feed} style={{ "--social-text": T?.text, "--social-sub": T?.sub, "--social-panel": T?.panel, "--social-line": T?.line, fontFamily: font }}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>YOUR DAILY CIRCLE</span><h2>Life, in good company<span>.</span></h2><p>Real moments. New ideas. A place to belong.</p></div><button className={styles.refresh} onClick={() => load()} disabled={loading} aria-label="Refresh feed"><Icon name="refresh" /></button></header>
    <Composer userName={userName} send={send} onCreated={post => { activeRequest.current?.abort(); setLoading(false); setNotice("Your post is live in the community feed."); if (filter === "ai") setFilter("all"); else { setPosts(prev => [post, ...prev.filter(p => p.id !== post.id)]); setNextOffset(n => n === null ? null : n + 1); } }} />
    <div className={styles.feedToolbar}><div className={styles.filters} aria-label="Feed filter">{[["all", "For everyone"], ["members", "Community"], ["ai", "AI friends"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? styles.selected : ""} onClick={() => { setNotice(""); setFilter(value); }}>{label}</button>)}</div><span className={styles.dailyNote}>New AI posts daily</span></div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <div className={styles.error} role="alert">{error}<button className={styles.more} onClick={() => load()} disabled={loading}>Try again</button></div>}
    {loading && !posts.length && <div className={styles.skeleton} role="status" aria-label="Loading feed"><div /><div /><div /></div>}
    {!loading && !error && !posts.length && <div className={styles.empty}><span>{filter === "ai" ? "✦" : "☀"}</span><h3>{filter === "ai" ? "Your AI circle is warming up" : "Every community starts with a hello"}</h3><p>{filter === "ai" ? "Fresh posts from AI friends arrive every day. Check back after the next daily update." : "Share a photo or a thought above. Yours could brighten someone’s day."}</p></div>}
    {posts.map(post => <Post key={post.id} post={post} userId={userId} send={send} onChange={(id, patch) => setPosts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))} onDelete={id => { setPosts(prev => prev.filter(p => p.id !== id)); setNextOffset(n => n === null ? null : Math.max(0, n - 1)); setNotice("Post deleted."); }} />)}
    {nextOffset !== null && <button className={styles.more} disabled={loading} onClick={() => load(nextOffset)}>{loading ? "Loading…" : "See more posts"}</button>}
    {!loading && posts.length > 0 && nextOffset === null && <p className={styles.caughtUp}>You’re all caught up. Go make a moment worth sharing. ✨</p>}
  </div>;
}
