import { sb, getRow, upsertRow, deleteRow } from "./db";
import { isActiveStory, isVisiblePost, SOCIAL_MOODS, SOCIAL_ART, STORY_LIFETIME_MS, dailyPresentation } from "./social-content";

export const SOCIAL_PAGE_SIZE = 12;
export const validSocialId = value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const fields = "user_id,traits,updated_at";
const postFilter = "/conversations?traits->>kind=eq.social-post";
export const socialKey = (owner, kind, id) => `${owner}::social::${kind}::${id}`;
export function publicPost(p) {
  const fallback = p.ai === true ? dailyPresentation(p.authorId, p.createdAt?.slice(0, 10)) : {};
  const expires = p.ai === true && Number.isFinite(Date.parse(p.createdAt)) ? new Date(Date.parse(p.createdAt) + STORY_LIFETIME_MS).toISOString() : null;
  return { id: p.id, authorId: p.authorId, authorName: p.authorName, ai: p.ai === true, content: p.content, image: p.image ? `/api/social-image?postId=${encodeURIComponent(p.id)}` : null, topic: p.topic || null, createdAt: p.createdAt, mood: Object.hasOwn(SOCIAL_MOODS, p.mood) ? p.mood : fallback.mood || null, art: SOCIAL_ART.includes(p.art) ? p.art : fallback.art || null, format: p.format === "story" ? "story" : "post", storyExpiresAt: p.storyExpiresAt || expires };
}

export async function findSocialPost(id) {
  const rows = await sb(`${postFilter}&traits->>id=eq.${encodeURIComponent(id)}&select=${fields}&limit=1`);
  const row = rows?.[0];
  return row && isVisiblePost(row.traits) ? row : null;
}

// One record per post/comment/member reaction: unrelated writers never replace
// a shared messages array. Stable request IDs make client retries idempotent.
export async function saveSocialPost(owner, post) {
  const key = socialKey(owner, "post", post.id);
  const existing = await getRow(key);
  if (existing) return publicPost(existing.traits);
  await upsertRow(key, { traits: { ...post, kind: "social-post" }, updated_at: post.createdAt });
  return publicPost(post);
}

export async function socialActivity(ids, userId) {
  const summary = Object.fromEntries(ids.map(id => [id, { likes: 0, comments: 0, liked: false, saved: false }]));
  if (!ids.length) return summary;
  const seen = new Set();
  // Read only public counters, never private conversation bodies or photo data.
  for (let offset = 0; ; offset += 1000) {
    const rows = await sb(`/conversations?traits->>kind=in.(social-like,social-comment,social-save)&traits->>postId=in.(${ids.join(",")})&select=user_id,traits->postId,traits->kind,traits->authorId,traits->active&order=updated_at.desc,id.desc&limit=1000&offset=${offset}`);
    for (const row of rows || []) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      const s = summary[row.postId];
      if (!s) continue;
      if (row.kind === "social-comment") s.comments++;
      if (row.kind === "social-save" && row.authorId === userId && row.active === true) s.saved = true;
      if (row.kind === "social-like" && row.active === true) {
        s.likes++;
        if (row.authorId === userId) s.liked = true;
      }
    }
    if (!rows || rows.length < 1000) break;
  }
  return summary;
}

export async function listSocialPosts(userId, filter, offset, authorId = null) {
  const audience = filter === "ai" ? "&traits->>ai=eq.true" : filter === "members" ? "&traits->>ai=eq.false" : "";
  const author = authorId ? `&traits->>authorId=eq.${encodeURIComponent(authorId)}` : "";
  let savedFilter = "";
  if (filter === "saved") {
    const savedRows = await sb(`/conversations?traits->>kind=eq.social-save&traits->>authorId=eq.${encodeURIComponent(userId)}&traits->>active=eq.true&select=user_id,traits->postId&order=updated_at.desc&limit=1000`);
    const ids = [...new Set((savedRows || []).filter(r => r.user_id.startsWith(`${userId}::social::save::`) && validSocialId(r.postId)).map(r => r.postId))];
    if (!ids.length) return { posts: [], nextOffset: null };
    savedFilter = `&traits->>id=in.(${ids.join(",")})`;
  }
  const rows = await sb(`${postFilter}&or=(traits->>format.is.null,traits->>format.neq.story)${audience}${author}${savedFilter}&select=${fields}&order=updated_at.desc,id.desc&limit=${SOCIAL_PAGE_SIZE + 1}&offset=${offset}`);
  const page = (rows || []).slice(0, SOCIAL_PAGE_SIZE);
  const posts = [...new Map(page.map(row => [row.traits.id, publicPost(row.traits)])).values()];
  const activity = await socialActivity(posts.map(p => p.id), userId);
  return { posts: posts.map(p => ({ ...p, ...activity[p.id] })), nextOffset: rows?.length > SOCIAL_PAGE_SIZE ? offset + SOCIAL_PAGE_SIZE : null };
}

export async function listSocialStories() {
  const now = new Date();
  const [explicit, daily] = await Promise.all([
    sb(`${postFilter}&traits->>storyExpiresAt=gt.${encodeURIComponent(now.toISOString())}&select=${fields}&order=updated_at.desc,id.desc&limit=100`),
    // Includes the first daily posts made before the story metadata upgrade.
    sb(`${postFilter}&traits->>ai=eq.true&traits->>createdAt=gt.${encodeURIComponent(new Date(now.getTime() - STORY_LIFETIME_MS).toISOString())}&select=${fields}&order=updated_at.desc,id.desc&limit=20`),
  ]);
  return [...new Map([...(explicit || []), ...(daily || [])].map(row => publicPost(row.traits)).filter(p => isActiveStory(p)).map(p => [p.id, p])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSocialComments(postId, offset) {
  const rows = await sb(`/conversations?traits->>kind=eq.social-comment&traits->>postId=eq.${encodeURIComponent(postId)}&select=traits&order=updated_at.desc,id.desc&limit=21&offset=${offset}`);
  return { comments: [...new Map((rows || []).slice(0, 20).map(({ traits: c }) => [c.id, { id: c.id, authorId: c.authorId, authorName: c.authorName, content: c.content, createdAt: c.createdAt }])).values()], nextOffset: rows?.length > 20 ? offset + 20 : null };
}

export async function deleteSocialPost(row) {
  // Remove the post first so it is immediately unavailable to readers.
  await deleteRow(row.user_id);
  await sb(`/conversations?traits->>kind=in.(social-like,social-comment,social-save)&traits->>postId=eq.${encodeURIComponent(row.traits.id)}`, "DELETE");
}
