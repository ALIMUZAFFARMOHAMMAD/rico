// Clone the user's real voice for their AI twin (consent-gated Instant Voice Cloning).
// POST: take a recorded sample → ElevenLabs IVC → store voice_id on the twin.
// DELETE: remove the cloned voice and revert the twin to a stock voice.
import { configured, getRow, upsertRow } from "../../lib/db";
import { twinKey, twinVoice } from "../../lib/twins";
import { ownsUser } from "../../lib/auth";
import { rateLimited } from "../../lib/ratelimit";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const EL = "https://api.elevenlabs.io/v1";

async function removeVoice(apiKey, voiceId) {
  if (!voiceId) return;
  try { await fetch(`${EL}/voices/${voiceId}`, { method: "DELETE", headers: { "xi-api-key": apiKey } }); } catch (e) {}
}

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Voice cloning isn't available right now." });

  if (req.method === "POST") {
    const { userId, userName, audio, mime, consent } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Sign in first" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    if (!consent) return res.status(400).json({ error: "Please confirm consent to clone your voice." });
    if (!audio) return res.status(400).json({ error: "No recording received." });

    const row = await getRow(twinKey(userId));
    if (!row?.traits?.persona) return res.status(400).json({ error: "Create your twin first, then add your voice." });

    try {
      const buf = Buffer.from(String(audio).split(",").pop(), "base64");
      if (buf.length < 24000) return res.status(400).json({ error: "That was too short — record about 30 seconds of clear speech." });

      // replace any previous clone for this user (don't leak voice slots)
      if (row.traits.voiceCloned && row.traits.voice) await removeVoice(apiKey, row.traits.voice);

      const form = new FormData();
      form.append("name", `rico_twin_${(userName || "user").replace(/[^a-z0-9]/gi, "")}_${String(userId).slice(-6)}`);
      form.append("files", new Blob([buf], { type: mime || "audio/webm" }), "sample.webm");
      form.append("description", "Rico AI-twin voice — cloned with the owner's explicit consent.");

      const r = await fetch(`${EL}/voices/add`, { method: "POST", headers: { "xi-api-key": apiKey }, body: form });
      if (!r.ok) {
        const e = await r.text();
        console.error("clone error", r.status, e.slice(0, 300));
        if (r.status === 403 || /can_not_use_instant_voice_cloning|voice_add_edit_limit|maximum/i.test(e))
          return res.status(409).json({ error: "Voice-clone limit reached on this plan (or cloning needs one-time verification in the ElevenLabs dashboard)." });
        return res.status(502).json({ error: "Couldn't clone that — try a clearer ~30s recording." });
      }
      const d = await r.json();
      await upsertRow(twinKey(userId), { traits: { ...row.traits, voice: d.voice_id, voiceCloned: true } });
      return res.status(200).json({ ok: true, cloned: true });
    } catch (e) {
      console.error("twin-voice POST", e.message);
      return res.status(500).json({ error: "Something went wrong cloning your voice." });
    }
  }

  if (req.method === "DELETE") {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "No userId" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    const row = await getRow(twinKey(userId));
    if (row?.traits?.voiceCloned && row.traits.voice) {
      await removeVoice(apiKey, row.traits.voice);
      await upsertRow(twinKey(userId), { traits: { ...row.traits, voice: twinVoice(userId), voiceCloned: false } });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
