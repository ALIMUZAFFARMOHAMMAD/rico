import { sb, getRow, upsertRow, deleteRow } from "./db";

export const SOCIAL_PAGE_SIZE = 12;
export const validSocialId = value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const fields = "user_id,traits,updated_at";
const postFilter = "/conversations?traits->>kind=eq.social-post";
export const socialKey = (owner, kind, id) => `${owner}::social::${kind}::${id}`;
export const publicPost = p => ({ id: p.id, authorId: p.authorId, authorName: p.authorName, ai: p.ai === true, content: p.content, image: p.image ? `/api/social-image?postId=${encodeURIComponent(p.id)}` : null, topic: p.topic || null, createdAt: p.createdAt });

export async function findSocialPost(id) {
  const rows = await sb(`${postFilter}&traits->>id=eq.${encodeURIComponent(id)}&select=${fields}&limit=1`);
  return rows?.[0] || null;
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
  const summary = Object.fromEntries(ids.map(id => [id, { likes: 0, comments: 0, liked: false }]));
  if (!ids.length) return summary;
  const seen = new Set();
  // Read only public counters, never private conversation bodies or photo data.
  for (let offset = 0; ; offset += 1000) {
    const rows = await sb(`/conversations?traits->>kind=in.(social-like,social-comment)&traits->>postId=in.(${ids.join(",")})&select=user_id,traits->postId,traits->kind,traits->authorId,traits->active&order=updated_at.desc,id.desc&limit=1000&offset=${offset}`);
    for (const row of rows || []) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      const s = summary[row.postId];
      if (!s) continue;
      if (row.kind === "social-comment") s.comments++;
      if (row.kind === "social-like" && row.active === true) {
        s.likes++;
        if (row.authorId === userId) s.liked = true;
      }
    }
    if (!rows || rows.length < 1000) break;
  }
  return summary;
}

export async function listSocialPosts(userId, filter, offset) {
  const audience = filter === "ai" ? "&traits->>ai=eq.true" : filter === "members" ? "&traits->>ai=eq.false" : "";
  const rows = await sb(`${postFilter}${audience}&select=${fields}&order=updated_at.desc,id.desc&limit=${SOCIAL_PAGE_SIZE + 1}&offset=${offset}`);
  const page = (rows || []).slice(0, SOCIAL_PAGE_SIZE);
  const posts = [...new Map(page.map(row => [row.traits.id, publicPost(row.traits)])).values()];
  const activity = await socialActivity(posts.map(p => p.id), userId);
  return { posts: posts.map(p => ({ ...p, ...activity[p.id] })), nextOffset: rows?.length > SOCIAL_PAGE_SIZE ? offset + SOCIAL_PAGE_SIZE : null };
}

export async function listSocialComments(postId, offset) {
  const rows = await sb(`/conversations?traits->>kind=eq.social-comment&traits->>postId=eq.${encodeURIComponent(postId)}&select=traits&order=updated_at.desc,id.desc&limit=21&offset=${offset}`);
  return { comments: [...new Map((rows || []).slice(0, 20).map(({ traits: c }) => [c.id, { id: c.id, authorId: c.authorId, authorName: c.authorName, content: c.content, createdAt: c.createdAt }])).values()], nextOffset: rows?.length > 20 ? offset + 20 : null };
}

export async function deleteSocialPost(row) {
  // Remove the post first so it is immediately unavailable to readers.
  await deleteRow(row.user_id);
  await sb(`/conversations?traits->>kind=in.(social-like,social-comment)&traits->>postId=eq.${encodeURIComponent(row.traits.id)}`, "DELETE");
}
