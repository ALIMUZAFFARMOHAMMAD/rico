import { getAuth } from "@clerk/nextjs/server";
import { configured } from "../../lib/db";
import { findSocialPost, validSocialId } from "../../lib/social-feed";
import { portraitBytes } from "../../lib/portrait-image";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).end();
  if (!getAuth(req).userId) return res.status(401).end();
  if (!validSocialId(req.query.postId)) return res.status(400).end();
  if (!configured()) return res.status(503).end();
  try {
    const row = await findSocialPost(req.query.postId);
    const image = portraitBytes(row?.traits?.image);
    if (!image) return res.status(404).end();
    res.setHeader("Content-Type", "image/jpeg");
    return res.status(200).send(image);
  } catch { return res.status(503).end(); }
}
