import { configured, getRow } from "../../lib/db";
import { twinKey } from "../../lib/twins";
import { portraitBytes } from "../../lib/portrait-image";

// Twin portraits are public, like the twin profile they appear on.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).end();
  const id = req.query.id;
  if (typeof id !== "string" || !/^twin__[A-Za-z0-9_-]{1,160}$/.test(id)) return res.status(404).end();
  if (!configured()) return res.status(503).end();
  try {
    const row = await getRow(twinKey(id.slice(6)));
    const bytes = row?.traits?.persona && row.traits.avatarKind === "ai-portrait" && portraitBytes(row.traits.portrait);
    if (!bytes) return res.status(404).end();
    res.setHeader("Content-Type", "image/jpeg");
    return res.status(200).send(bytes);
  } catch { return res.status(503).end(); }
}
