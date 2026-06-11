// Dev-only helper: saves mascot pose SVGs from /mascot's export row into public/mascot/.
// Returns 404 in production.
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (process.env.NODE_ENV === "production") return res.status(404).end();
  if (req.method !== "POST") return res.status(405).end();
  const { files } = req.body || {};
  if (!Array.isArray(files)) return res.status(400).json({ error: "No files" });
  const dir = path.join(process.cwd(), "public", "mascot");
  fs.mkdirSync(dir, { recursive: true });
  let saved = 0;
  for (const f of files) {
    if (!/^[a-z0-9-]+$/.test(f.name) || typeof f.svg !== "string" || !f.svg.startsWith("<svg")) continue;
    fs.writeFileSync(path.join(dir, f.name + ".svg"), f.svg, "utf8");
    saved++;
  }
  res.json({ saved });
}
