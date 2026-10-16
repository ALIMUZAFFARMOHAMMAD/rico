// Clone the user's real voice for their AI twin (consent-gated Instant Voice Cloning).
// POST: take a recorded sample → self-hosted voice server (RICO_VOICE_URL, unlimited clones) or,
// if that isn't configured, ElevenLabs IVC → store the voice id on the twin.
// DELETE: remove the cloned voice and revert the twin to a stock voice.
import { configured, getRow, upsertRow } from "../../lib/db";
import { twinKey, twinVoice } from "../../lib/twins";
import { ownsUser } from "../../lib/auth";
import { rateLimited } from "../../lib/ratelimit";
import { selfVoiceOn, selfVoice, selfVoiceId, removeTwinVoice } from "../../lib/selfvoice";
import { randomUUID } from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const EL = "https://api.elevenlabs.io/v1";

export default async function handler(req, res) {
  if (!configured()) return res.status(500).json({ error: "Not configured" });
  if (rateLimited(req)) return res.status(429).json({ error: "Too many requests, slow down." });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey && !selfVoiceOn()) return res.status(503).json({ error: "Voice cloning isn't available right now." });

  if (req.method === "POST") {
    const { userId, userName, audio, mime, consent } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Sign in first" });
    if (!ownsUser(req, userId)) return res.status(403).json({ error: "forbidden" });
    if (consent !== true) return res.status(400).json({ error: "Please confirm consent to clone your voice." });
    if (!audio) return res.status(400).json({ error: "No recording received." });

    try {
      const row = await getRow(twinKey(userId));
      if (!row?.traits?.persona) return res.status(400).json({ error: "Create your twin first, then add your voice." });
      const buf = Buffer.from(String(audio).split(",").pop(), "base64");
      if (buf.length < 24000) return res.status(400).json({ error: "That was too short — record about 30 seconds of clear speech." });
      if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ error: "That recording is too large. Try a shorter sample." });
      const saveVoice = async (voice) => {
        try {
          await upsertRow(twinKey(userId), { traits: { ...row.traits, voice, voiceCloned: true, voiceConsentAt: new Date().toISOString() } });
        } catch (error) { await removeTwinVoice(voice); throw error; }
        if (row.traits.voiceCloned && row.traits.voice && row.traits.voice !== voice) await removeTwinVoice(row.traits.voice);
      };

      if (selfVoiceOn()) {
        const id = `${selfVoiceId(userId).slice(-40)}_${randomUUID().slice(0, 12)}`;
        const r = await selfVoice("/clone", { voice: id, audio_b64: audio }, 60000); // first call may wake a cold GPU
        if (!r.ok) {
          console.error("self clone error", r.status, (await r.text()).slice(0, 200));
          return res.status(502).json({ error: r.status === 400 ? "Couldn't read that recording — try ~30s of clear speech." : "Voice cloning is busy — try again in a minute." });
        }
        await saveVoice(`self:${id}`);
        return res.status(200).json({ ok: true, cloned: true });
      }

      const form = new FormData();
      form.append("name", `rico_twin_${(userName || "user").replace(/[^a-z0-9]/gi, "")}_${String(userId).slice(-6)}`);
      // iPhone Safari can't record webm — it sends audio/mp4, so name the file to match its real format
      const type = String(mime || "audio/webm").split(";")[0];
      const ext = /mp4|m4a|aac/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : /mpeg|mp3/.test(type) ? "mp3" : /wav/.test(type) ? "wav" : "webm";
      form.append("files", new Blob([buf], { type }), `sample.${ext}`);
      form.append("description", "Rico AI-twin voice — cloned with the owner's explicit consent.");

      const r = await fetch(`${EL}/voices/add`, { method: "POST", headers: { "xi-api-key": apiKey }, body: form });
      if (!r.ok) {
        const e = await r.text();
        console.error("clone error", r.status, e.slice(0, 300));
        if (r.status === 401 && /ivc_not_permitted|subscription_required/i.test(e))
          return res.status(409).json({ error: "Voice cloning is paused on Rico's voice plan right now — your twin speaks with a stock voice until it's back." });
        if (r.status === 403 || /can_not_use_instant_voice_cloning|voice_add_edit_limit|maximum/i.test(e))
          return res.status(409).json({ error: "Voice-clone limit reached on this plan (or cloning needs one-time verification in the ElevenLabs dashboard)." });
        return res.status(502).json({ error: "Couldn't clone that — try a clearer ~30s recording." });
      }
      const d = await r.json();
      if (!d.voice_id) throw new Error("Voice provider returned no voice");
      await saveVoice(d.voice_id);
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
    try {
      const row = await getRow(twinKey(userId));
      if (row?.traits?.voiceCloned && row.traits.voice) {
        await removeTwinVoice(row.traits.voice, { strict: true });
        await upsertRow(twinKey(userId), { traits: { ...row.traits, voice: twinVoice(userId), voiceCloned: false } });
      }
      return res.status(200).json({ ok: true });
    } catch (error) { return res.status(503).json({ error: "We couldn’t remove your voice right now. Please try again." }); }
  }

  return res.status(405).end();
}

