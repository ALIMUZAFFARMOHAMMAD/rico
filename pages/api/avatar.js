// Turn a selfie into a cartoon avatar using Claude vision: analyze appearance → avatar
// palette for the SVG character rig. The raw photo is NEVER stored — only derived colors.
import { configured, getRow, upsertRow } from "../../lib/db";
import { twinKey } from "../../lib/twins";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const PROMPT = `Look at this person's photo and design a friendly cartoon avatar resembling them. Return ONLY this JSON, nothing else:
{"skin":"#rrggbb","skinD":"#rrggbb","hair":"#rrggbb","beard":true,"hoodie":"#rrggbb","hoodieD":"#rrggbb"}
- skin: their approximate skin tone (hex). skinD: a slightly darker shade of the same tone.
- hair: their hair colour (hex).
- beard: true if they have visible facial hair, else false.
- hoodie: a clothing colour that suits them (hex). hoodieD: a darker shade of it.
Estimate from what you can see. Output only the JSON object.`;

const isHex = v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!configured()) return res.status(500).json({ error: "Not configured" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { userId, image, mime } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Sign in first" });
  if (!image) return res.status(400).json({ error: "No photo received." });

  try {
    const data = String(image).split(",").pop();
    const media = /png|webp|gif/.test(mime || "") ? mime : "image/jpeg";
    const ctrl = new AbortController();
    const killer = setTimeout(() => ctrl.abort(), 25000); // never hang the request
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 200,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: media, data } },
            { type: "text", text: PROMPT },
          ] }],
        }),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(killer); }
    if (!r.ok) { console.error("avatar vision", r.status, (await r.text()).slice(0, 200)); return res.status(502).json({ error: "Couldn't read that photo — try a clear, well-lit selfie." }); }
    const d = await r.json();
    let look;
    try { look = JSON.parse(d.content[0].text.replace(/```json|```/g, "").trim()); } catch (e) { return res.status(502).json({ error: "Try a clearer photo." }); }
    if (!isHex(look.skin) || !isHex(look.hair) || !isHex(look.hoodie)) return res.status(502).json({ error: "Try a clearer, front-facing photo." });

    const clean = {
      skin: look.skin, skinD: isHex(look.skinD) ? look.skinD : look.skin,
      hair: look.hair, beard: !!look.beard,
      hoodie: look.hoodie, hoodieD: isHex(look.hoodieD) ? look.hoodieD : look.hoodie,
    };
    // apply to the user's twin avatar if it exists (raw image discarded — only colours saved).
    // avatar:null clears any stale generated-image URL so the SVG cartoon is used.
    const row = await getRow(twinKey(userId));
    if (row?.traits?.persona) await upsertRow(twinKey(userId), { traits: { ...row.traits, look: clean, avatar: null } });
    return res.status(200).json({ look: clean, applied: !!(row?.traits?.persona) });
  } catch (e) {
    console.error("avatar error:", e.message);
    return res.status(500).json({ error: "Something went wrong reading your photo." });
  }
}
