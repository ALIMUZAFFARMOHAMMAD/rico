/* eslint-disable @next/next/no-img-element -- authenticated social media uses direct image endpoints. */
import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS } from "../lib/agents";
import { resizeImage } from "../lib/resizeImage";
import { SOCIAL_MOODS, isActiveStory } from "../lib/social-content";
import SocialArtwork from "./SocialArtwork";
import SocialStories, { StoryViewer } from "./SocialStories";
import Dialog from "./Dialog";
import styles from "./SocialFeed.module.css";

function Icon({ name, size = 20 }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    comment: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z" />,
    photo: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 3M18 18A8 8 0 0 1 5 15" /></>,
    send: <path d="m3 3 18 9-18 9 3-9-3-9ZM6 12h15" />,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
    plus: <path d="M12 4v16M4 12h16" />,
    link: <><path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 1 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(0 -1) scale(.92)" /></>,
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
function Composer({ userName, send, onCreated, initialMode = "post", onBusyChange }) {
  const [expanded, setExpanded] = useState(true);
  const [format, setFormat] = useState(initialMode);
  const [mood, setMood] = useState("");
  const [shareToStory, setShareToStory] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(null);
  const textarea = useRef(null);
  useEffect(() => { onBusyChange?.(busy || reading); }, [busy, reading, onBusyChange]);
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
      const data = await send({ action: "post", id: requestId.current, content: text, image: photo, mood, format, shareToStory });
      setText(""); setPhoto(null); setExpanded(false); requestId.current = null; onCreated(data.post);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <form className={styles.composer} onSubmit={publish} aria-label="Create a post">
    <div className={styles.composeModes}>{["post", "story"].map(value => <button type="button" key={value} aria-pressed={format === value} disabled={busy} onClick={() => { dirty(); setFormat(value); }}>{value === "post" ? "Feed post" : "24-hour story"}</button>)}</div>
    <div className={styles.composerTop}><Avatar name={userName} /><div><strong>Your everyday, shared.</strong><p>A small win, a good photo, a thought worth sharing.</p></div></div>
    <textarea ref={textarea} aria-label="Post caption" placeholder={`What’s happening, ${userName?.split(" ")[0] || "friend"}?`} value={text} maxLength={2000} disabled={busy} onFocus={() => setExpanded(true)} onChange={e => { dirty(); setText(e.target.value); }} rows={expanded ? 3 : 1} />
    {expanded && !text && !photo && <div className={styles.prompts}>{["Today’s small win: ", "A little thing I loved today: ", "A question for everyone: "].map(prompt => <button type="button" key={prompt} onClick={() => { dirty(); setText(prompt); textarea.current?.focus(); }}>{prompt.trim()}</button>)}</div>}
    <div className={styles.moodPicker} role="group" aria-label="Choose a mood">{Object.entries(SOCIAL_MOODS).map(([value, info]) => <button type="button" key={value} aria-pressed={mood === value} disabled={busy} onClick={() => { dirty(); setMood(mood === value ? "" : value); }}>{info.emoji} {info.label}</button>)}</div>
    {mood && !photo && <div className={styles.moodPreview}><SocialArtwork theme={SOCIAL_MOODS[mood].art} title={SOCIAL_MOODS[mood].label} compact /><span>Your mood becomes an illustrated card.</span></div>}
    {photo && <div className={styles.photoPreview}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo} alt="Your photo ready to post" /><button className={styles.removePhoto} type="button" disabled={busy} onClick={() => { dirty(); setPhoto(null); }} aria-label="Remove photo">✕</button></div>}
    {format === "post" && <label className={styles.storyCheck}><input type="checkbox" checked={shareToStory} disabled={busy} onChange={e => { dirty(); setShareToStory(e.target.checked); }} />Also share to my story for 24 hours</label>}
    <div className={styles.composerBottom}><label className={`${styles.photoButton} ${busy || reading ? styles.disabled : ""}`}><Icon name="photo" />{reading ? "Preparing…" : "Photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Add photo to post" disabled={busy || reading} onChange={choosePhoto} /></label><span className={styles.audience}>{format === "story" ? "Disappears after 24 hours" : "Visible to members"}{text.length > 1600 && ` · ${text.length}/2000`}</span><button className={styles.publish} disabled={busy || reading || (!text.trim() && !photo)}><Icon name="send" size={17} />{busy ? "Sharing…" : format === "story" ? "Share story" : "Post"}</button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
function Post({ post, userId, send, onChange, onDelete, onProfile }) {
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
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
        onChange(post.id, { likes: data.likes, liked: data.liked, comments: data.comments, saved: data.saved });
        if (data.comment) { setComments(prev => [data.comment, ...prev.filter(c => c.id !== data.comment.id)]); setText(""); commentId.current = null; }
        if (action === "deleteComment") setComments(prev => prev.filter(c => c.id !== extra.id));
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }
  const moodInfo = SOCIAL_MOODS[post.mood];
  async function copyLink() { try { await navigator.clipboard.writeText(`${window.location.origin}/?socialPost=${encodeURIComponent(post.id)}`); setCopied(true); } catch { setError("Could not copy the link. Please try again."); } }
  return <article data-vfx-reveal id={`social-${post.id}`} className={styles.card} aria-label={`Post by ${post.authorName}`}>
    <header className={styles.postHeader}><button className={styles.authorButton} onClick={() => onProfile?.(post)} aria-label={`View ${post.authorName}'s posts`}><Avatar name={post.authorName} ai={post.ai} authorId={post.authorId} /></button><div className={styles.byline}><div><button className={styles.authorButton} onClick={() => onProfile?.(post)}>{post.authorName}</button>{post.ai && <span className={styles.aiBadge}>AI friend</span>}</div><time dateTime={post.createdAt}>{timestamp(post.createdAt)}{moodInfo && ` · ${moodInfo.emoji} ${moodInfo.label}`}</time></div>{!post.ai && post.authorId === userId ? <button className={styles.quiet} disabled={!!busy} onClick={() => setConfirmDelete(v => !v)}>Delete</button> : <button className={styles.quiet} disabled={!!busy || reported} onClick={() => act("report")}>{reported ? "Reported" : "Report"}</button>}</header>
    {(post.image || post.art) && <div className={styles.postMedia} onDoubleClick={() => { if (!post.liked && !busy) act("like", { liked: true }); }}>{post.image ? <img src={post.image} alt={post.content ? post.content.slice(0, 150) : `Photo shared by ${post.authorName}`} loading="lazy" decoding="async" /> : <SocialArtwork theme={post.art} title={post.topic || moodInfo?.label || "A moment to share"} />}{post.ai && <span className={styles.mediaBadge}>AI friend · illustrated</span>}</div>}
    <footer className={styles.actions}><button className={post.liked ? `${styles.liked} vfx-heart-liked` : ""} disabled={!!busy} aria-pressed={post.liked} aria-label={`${post.liked ? "Unlike" : "Like"} post by ${post.authorName}`} onClick={() => act("like", { liked: !post.liked })}><Icon name="heart" /><span>{post.likes || "Like"}</span></button><button aria-expanded={showComments} onClick={() => { setShowComments(v => !v); if (!showComments && !loaded) loadComments(); }}><Icon name="comment" /><span>{post.comments || "Comment"}</span></button><button onClick={copyLink} aria-label="Copy post link"><Icon name="link" /><span>{copied ? "Copied" : "Share"}</span></button><button className={`${styles.saveButton} ${post.saved ? styles.saved : ""}`} disabled={!!busy} aria-pressed={!!post.saved} aria-label={post.saved ? "Unsave post" : "Save post"} onClick={() => act("save", { saved: !post.saved })}><Icon name="bookmark" /></button></footer>
    <div className={styles.content}><p><strong>{post.authorName}</strong> {expanded || post.content.length <= 180 ? post.content : `${post.content.slice(0, 180)}…`}{post.content.length > 180 && <button className={styles.quiet} onClick={() => setExpanded(v => !v)}>{expanded ? "less" : "more"}</button>}</p>{post.ai && <span className={styles.aiFootnote}>AI-generated caption · original illustration</span>}</div>
    {confirmDelete && <div className={styles.confirm}><span>Delete this post and its comments?</span><button disabled={!!busy} onClick={() => act("delete")}>{busy === "delete" ? "Deleting…" : "Delete post"}</button><button disabled={!!busy} onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
    {showComments && <section className={styles.comments} aria-label={`Comments on ${post.authorName}'s post`}>
      <form onSubmit={e => { e.preventDefault(); if (text.trim()) { commentId.current ||= crypto.randomUUID(); act("comment", { id: commentId.current, content: text }); } }}><input aria-label={`Comment on ${post.authorName}'s post`} placeholder="Add to the conversation…" value={text} maxLength={500} disabled={!!busy} onChange={e => { commentId.current = null; setText(e.target.value); }} /><button className={styles.publish} disabled={!!busy || !text.trim()} aria-label="Send comment"><Icon name="send" size={18} /></button></form>
      {loading && <p className={styles.muted} role="status">Loading comments…</p>}
      {!loading && !loaded && <button className={styles.quiet} onClick={() => loadComments()}>Retry loading comments</button>}
      {loaded && !comments.length && <p className={styles.muted}>Be the first to say something.</p>}
      {comments.map(c => <div className={styles.comment} key={c.id}><Avatar name={c.authorName} /><div><strong>{c.authorName}</strong><p>{c.content}</p><time dateTime={c.createdAt}>{timestamp(c.createdAt)}</time>{c.authorId === userId && <button className={styles.quiet} disabled={!!busy} onClick={() => act("deleteComment", { id: c.id })}>Delete comment</button>}</div></div>)}
      {nextOffset !== null && <button className={styles.more} disabled={loading} onClick={() => loadComments(nextOffset)}>Older comments</button>}
    </section>}
    {error && <p role="alert" className={`${styles.error} ${styles.cardError}`}>{error}</p>}
  </article>;
}
export default function SocialFeed({ userId, userName, T, font, onChat }) {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextOffset, setNextOffset] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stories, setStories] = useState([]);
  const [storyLoading, setStoryLoading] = useState(true);
  const [storyError, setStoryError] = useState("");
  const [storyIndex, setStoryIndex] = useState(null);
  const [storySession, setStorySession] = useState([]);
  const [seen, setSeen] = useState({});
  const [composerMode, setComposerMode] = useState(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const activeRequest = useRef(null);
  const storyRequest = useRef(null);
  const detailRequest = useRef(null);
  const feed = useRef(null);
  const authorId = author?.authorId || "";
  const send = body => request("/api/social", { ...body, userId, userName });
  const load = useCallback(async (offset = 0) => {
    activeRequest.current?.abort(); const controller = new AbortController(); activeRequest.current = controller;
    setLoading(true); setError("");
    try {
      const data = await request(`/api/social?userId=${encodeURIComponent(userId)}&filter=${filter}&offset=${offset}${authorId ? `&authorId=${encodeURIComponent(authorId)}` : ""}`, null, controller.signal);
      if (controller.signal.aborted) return;
      setPosts(prev => [...new Map([...(offset ? prev : []), ...data.posts].map(p => [p.id, p])).values()]); setNextOffset(data.nextOffset);
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [userId, filter, authorId]);
  const loadStories = useCallback(async () => {
    storyRequest.current?.abort(); const controller = new AbortController(); storyRequest.current = controller;
    setStoryLoading(true); setStoryError("");
    try {
      const data = await request(`/api/social?userId=${encodeURIComponent(userId)}&view=stories`, null, controller.signal);
      if (!controller.signal.aborted) setStories(data.stories.filter(p => isActiveStory(p)));
    } catch (e) { if (!controller.signal.aborted) setStoryError(e.message); }
    finally { if (!controller.signal.aborted) setStoryLoading(false); }
  }, [userId]);
  const openDetail = useCallback(async id => {
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
    setStoryIndex(null); setDetail(null); setDetailLoading(true); setDetailError("");
    try { const data = await request(`/api/social?userId=${encodeURIComponent(userId)}&view=post&postId=${encodeURIComponent(id)}`, null, controller.signal); if (!controller.signal.aborted) setDetail(data.post); }
    catch (e) { if (!controller.signal.aborted) setDetailError(e.message); }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  }, [userId]);
  useEffect(() => { setPosts([]); setNextOffset(null); load(); return () => activeRequest.current?.abort(); }, [load]);
  useEffect(() => {
    loadStories();
    const refresh = () => { if (!document.hidden) loadStories(); };
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); storyRequest.current?.abort(); };
  }, [loadStories]);
  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(`rico-story-seen:${userId}`) || "{}"); setSeen(Object.fromEntries(Object.entries(stored).filter(([, date]) => typeof date === "number" && date > Date.now() - 86400000))); } catch { setSeen({}); }
    const id = new URLSearchParams(window.location.search).get("socialPost");
    if (id) openDetail(id);
    return () => detailRequest.current?.abort();
  }, [userId, openDetail]);
  function markSeen(id) {
    setSeen(previous => { const next = { ...previous, [id]: Date.now() }; try { localStorage.setItem(`rico-story-seen:${userId}`, JSON.stringify(next)); } catch {} return next; });
  }
  function changePost(id, patch) {
    setPosts(previous => previous.map(p => p.id === id ? { ...p, ...patch } : p).filter(p => filter !== "saved" || p.saved));
    setDetail(previous => previous?.id === id ? { ...previous, ...patch } : previous);
  }
  function deletePost(id) {
    setPosts(previous => previous.filter(p => p.id !== id)); setStories(previous => previous.filter(p => p.id !== id));
    setDetail(previous => previous?.id === id ? null : previous); setNextOffset(n => n === null ? null : Math.max(0, n - 1)); setNotice("Deleted.");
  }
  function viewAuthor(post) { setDetail(null); setDetailError(""); setAuthor(post); setFilter("all"); feed.current?.scrollIntoView({ behavior: "auto", block: "start" }); }
  function created(post) {
    activeRequest.current?.abort(); setLoading(false); setComposerMode(null); setComposerBusy(false); setNotice(post.format === "story" ? "Your story is live for 24 hours." : "Your post is live.");
    if (isActiveStory(post)) setStories(previous => [post, ...previous.filter(p => p.id !== post.id)]);
    if (post.format === "story") { load(); return; }
    if (filter === "ai" || filter === "saved" || author) { setAuthor(null); setFilter("all"); }
    else { setPosts(previous => [post, ...previous.filter(p => p.id !== post.id)]); setNextOffset(n => n === null ? null : n + 1); }
  }
  const visibleStories = stories.filter(p => isActiveStory(p));
  const closeDetail = () => { detailRequest.current?.abort(); setDetail(null); setDetailError(""); setDetailLoading(false); };
  return <div ref={feed} className={styles.feed} style={{ "--social-text": T?.text, "--social-sub": T?.sub, "--social-panel": T?.panel, "--social-line": T?.line, fontFamily: font }}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>LITTLE MOMENTS, GOOD COMPANY</span><h2 className="vfx-heading">Social<span> ✦</span></h2></div><div className={styles.headerActions}><button className={styles.refresh} onClick={() => { load(); loadStories(); }} disabled={loading} aria-label="Refresh feed"><Icon name="refresh" /></button><button className={styles.newPost} onClick={() => setComposerMode("post")} aria-label="Create a post"><Icon name="plus" />Create</button></div></header>
    <SocialStories stories={visibleStories} seen={seen} loading={storyLoading} error={storyError} onRetry={loadStories} onCreate={() => setComposerMode("story")} onOpen={index => { setStorySession(visibleStories); setStoryIndex(index); }} />
    <div className={styles.feedToolbar}><div className={styles.filters} aria-label="Feed filter">{[["all", "For you"], ["members", "Community"], ["ai", "AI friends"], ["saved", "Saved"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? styles.selected : ""} onClick={() => { setNotice(""); setAuthor(null); setFilter(value); }}>{label}</button>)}</div></div>
    {author && <section className={styles.authorPanel} aria-label="Author profile"><Avatar name={author.authorName} ai={author.ai} authorId={author.authorId} /><div><strong>{author.authorName}{author.ai && " · AI friend"}</strong><p>{author.ai ? AGENTS[author.authorId]?.bio : "Moments shared with the Ricomates community."}</p>{author.ai && AGENTS[author.authorId] && onChat && <button onClick={() => onChat(author.authorId)}>Chat with {author.authorName}</button>}</div><button className={styles.quiet} onClick={() => setAuthor(null)} aria-label="Clear author filter">✕</button></section>}
    {filter === "saved" && <p className={styles.muted}>Your saved posts are private. Keep the moments you want to revisit.</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <div className={styles.error} role="alert">{error}<button className={styles.more} onClick={() => load()} disabled={loading}>Try again</button></div>}
    {loading && !posts.length && <div className={styles.skeleton} role="status" aria-label="Loading feed"><div /><div /><div /></div>}
    {!loading && !error && !posts.length && <div className={styles.empty}><span>{filter === "saved" ? "♡" : "☀"}</span><h3>{filter === "saved" ? "Keep a little inspiration" : author ? "No posts here yet" : "Make the first moment yours"}</h3><p>{filter === "saved" ? "Tap the bookmark on a post to find it here later." : "Share a photo, a mood or a thought with your circle."}</p>{filter !== "saved" && <button className={styles.publish} onClick={() => setComposerMode("post")}>Create a post</button>}</div>}
    {posts.map(post => <Post key={post.id} post={post} userId={userId} send={send} onChange={changePost} onDelete={deletePost} onProfile={viewAuthor} />)}
    {nextOffset !== null && <button className={styles.more} disabled={loading} onClick={() => load(nextOffset)}>{loading ? "Loading…" : "See more posts"}</button>}
    {!loading && posts.length > 0 && nextOffset === null && <p className={styles.caughtUp}>You’re all caught up. New AI moments arrive daily. ✨</p>}
    {composerMode && <Dialog title={composerMode === "story" ? "Share your story" : "Create a post"} busy={composerBusy} onClose={() => setComposerMode(null)}><Composer key={composerMode} initialMode={composerMode} userName={userName} send={send} onCreated={created} onBusyChange={setComposerBusy} /></Dialog>}
    {storyIndex !== null && <StoryViewer stories={storySession} initialIndex={storyIndex} userId={userId} send={send} onClose={() => setStoryIndex(null)} onSeen={markSeen} onOpenPost={post => openDetail(post.id)} onDeleted={deletePost} />}
    {(detail || detailLoading || detailError) && <Dialog title="Post" onClose={closeDetail}>{detailLoading ? <p role="status">Loading post…</p> : detailError ? <p role="alert" className={styles.error}>{detailError}</p> : <Post post={detail} userId={userId} send={send} onChange={changePost} onDelete={deletePost} onProfile={viewAuthor} />}</Dialog>}
  </div>;
}

