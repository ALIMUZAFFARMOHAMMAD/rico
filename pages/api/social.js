import { createHash } from "crypto";
import { ownsUser } from "../../lib/auth";
import { configured, getRow, upsertRow } from "../../lib/db";
import { rateLimited } from "../../lib/ratelimit";
import { portraitBytes } from "../../lib/portrait-image";
import { validSocialId, socialKey, findSocialPost, saveSocialPost, listSocialPosts, listSocialComments, socialActivity, deleteSocialPost } from "../../lib/social-feed";

export const config = { api: { bodyParser: { sizeLimit: "450kb" } } };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const userId = req.method === "GET" ? req.query.userId : req.body?.userId;
  if (!ownsUser(req, userId)) return res.status(403).json({ error: "Please sign in again to use Social." });
  if (!configured()) return res.status(503).json({ error: "Social is temporarily unavailable. Please try again." });
  if (rateLimited(req, { limit: 90 })) return res.status(429).json({ error: "Please wait a moment before trying again." });
  try {
    if (req.method === "GET") {
      const offset = Number(req.query.offset || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 100000) return res.status(400).json({ error: "Invalid page." });
      if (req.query.postId) {
        if (!validSocialId(req.query.postId)) return res.status(400).json({ error: "Invalid post." });
        if (!await findSocialPost(req.query.postId)) return res.status(404).json({ error: "This post was removed." });
        return res.status(200).json({ ok: true, ...await listSocialComments(req.query.postId, offset) });
      }
      const filter = req.query.filter || "all";
      if (!["all", "ai", "members"].includes(filter)) return res.status(400).json({ error: "Invalid feed." });
      return res.status(200).json({ ok: true, ...await listSocialPosts(userId, filter, offset) });
    }
    const { action, id, postId, content, image, liked } = req.body || {};
    // Display names are user-chosen, but author IDs and AI labels are server-owned.
    const authorName = typeof req.body.userName === "string" ? req.body.userName.trim().slice(0, 60) || "Member" : "Member";
    if (action === "post") {
      if (!validSocialId(id)) return res.status(400).json({ error: "Invalid post ID. Please refresh and try again." });
      if (typeof content !== "string" || content.length > 2000 || (!content.trim() && !image)) return res.status(400).json({ error: "Add a photo or a caption (up to 2,000 characters)." });
      if (image && !portraitBytes(image)) return res.status(400).json({ error: "Use a smaller JPEG photo, up to 256 KB after resizing." });
      const storedId = createHash("sha256").update(`${userId}:${id}`).digest("hex");
      const post = await saveSocialPost(userId, { id: storedId, content: content.trim(), image: image || null, authorId: userId, authorName, ai: false, createdAt: new Date().toISOString() });
      return res.status(200).json({ ok: true, post: { ...post, ...(await socialActivity([post.id], userId))[post.id] } });
    }
    if (!["comment", "like", "delete", "report"].includes(action) || !validSocialId(postId)) return res.status(400).json({ error: "Invalid action." });
    const row = await findSocialPost(postId);
    if (!row) return res.status(404).json({ error: "This post was removed. Refresh your feed." });
    if (action === "delete") {
      if (row.traits.ai || row.traits.authorId !== userId) return res.status(403).json({ error: "You can only delete your own posts." });
      await deleteSocialPost(row);
      return res.status(200).json({ ok: true });
    }
    if (action === "report") {
      await upsertRow(socialKey(userId, "report", postId), { traits: { kind: "social-report", postId, authorId: userId, reportedAt: new Date().toISOString() } });
      return res.status(200).json({ ok: true });
    }
    if (action === "like") {
      if (typeof liked !== "boolean") return res.status(400).json({ error: "Invalid reaction." });
      await upsertRow(socialKey(userId, "like", postId), { traits: { kind: "social-like", postId, authorId: userId, active: liked } });
    }
    let comment;
    if (action === "comment") {
      if (!validSocialId(id) || typeof content !== "string" || !content.trim() || content.length > 500) return res.status(400).json({ error: "Write a comment of up to 500 characters." });
      const key = socialKey(userId, "comment", id);
      const existing = await getRow(key);
      if (existing && existing.traits.postId !== postId) return res.status(409).json({ error: "Please refresh before commenting." });
      comment = existing?.traits || { kind: "social-comment", id, postId, content: content.trim(), authorId: userId, authorName, createdAt: new Date().toISOString() };
      if (!existing) await upsertRow(key, { traits: comment, updated_at: comment.createdAt });
    }
    return res.status(200).json({ ok: true, comment, ...(await socialActivity([postId], userId))[postId] });
  } catch (error) {
    console.error("Social operation failed", { action: req.body?.action || "read" });
    return res.status(503).json({ error: "Could not save or load Social. Your draft is kept — please retry." });
  }
}
