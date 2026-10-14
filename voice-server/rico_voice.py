"""Rico voice server: self-hosted voice cloning on Modal (replaces ElevenLabs Instant Voice Cloning).

Chatterbox Multilingual (MIT license, Resemble AI) clones zero-shot from a ~10-30s clip, so there
are no per-user "voice slots": a clone is just the user's reference clip saved on a Modal Volume.
Scales to zero when idle and bills per GPU-second.

Endpoints (all POST, JSON, header `x-rico-key: <RICO_VOICE_KEY>`):
  /clone   {voice, audio_b64}        save the reference clip (any format ffmpeg reads)
  /tts     {voice, text, language}   → audio/mpeg
  /delete  {voice}                   remove the clip
  /warm    {}                        wake a container ahead of a call (cold start ~30-60s)

Deploy:  modal secret create rico-voice RICO_VOICE_KEY=<long random string>
         modal deploy voice-server/rico_voice.py
"""
import base64, os, re, subprocess, tempfile
import modal

app = modal.App("rico-voice")
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("chatterbox-tts==0.1.7", "fastapi[standard]")
)
voices = modal.Volume.from_name("rico-voices", create_if_missing=True)

# app language → Chatterbox language_id (bn/te aren't supported: the app falls back to a stock voice)
LANGS = {"en", "hi", "es", "zh", "de", "fr", "pt", "ja", "ko", "ar"}


def clip_path(voice):
    if not re.fullmatch(r"[A-Za-z0-9_-]{6,64}", voice or ""):
        raise ValueError("bad voice id")
    return f"/voices/{voice}.wav"


@app.cls(gpu="L4", image=image, volumes={"/voices": voices}, secrets=[modal.Secret.from_name("rico-voice")],
         scaledown_window=300, timeout=120)
class Voice:
    @modal.enter()
    def load(self):
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        # English → Turbo (350M, one-step decoder, several times faster); other languages → Multilingual (500M).
        self.models = {
            "turbo": ChatterboxTurboTTS.from_pretrained(device="cuda"),
            "mtl": ChatterboxMultilingualTTS.from_pretrained(device="cuda"),  # ponytail: PyPI 0.1.7 predates the v3 checkpoint (git master only); bump the pin when a release ships it
        }
        self.loaded = {}  # model name → clip whose speaker is cached. ponytail: one speaker per model per container; per-voice cache if containers juggle many callers

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI, Header, HTTPException
        from fastapi.responses import Response

        api = FastAPI()

        def auth(key):
            if not key or key != os.environ["RICO_VOICE_KEY"]:
                raise HTTPException(401)

        @api.post("/warm")
        def warm(body: dict, x_rico_key: str = Header(None)):
            auth(x_rico_key)
            return {"ok": True}

        @api.post("/clone")
        def clone(body: dict, x_rico_key: str = Header(None)):
            auth(x_rico_key)
            path = clip_path(body.get("voice"))
            raw = base64.b64decode(str(body.get("audio_b64", "")).split(",")[-1])
            if len(raw) < 20_000:
                raise HTTPException(400, "clip too short")
            with tempfile.NamedTemporaryFile() as src:
                src.write(raw); src.flush()
                # normalise any browser recording (webm/opus, mp4/aac…) to mono 24 kHz wav, max 30 s
                r = subprocess.run(["ffmpeg", "-y", "-i", src.name, "-ac", "1", "-ar", "24000", "-t", "30", path], capture_output=True)
            if r.returncode != 0:
                raise HTTPException(400, "unreadable audio")
            voices.commit()
            self.loaded = {m: p for m, p in self.loaded.items() if p != path}
            return {"ok": True}

        @api.post("/tts")
        def tts(body: dict, x_rico_key: str = Header(None)):
            auth(x_rico_key)
            path = clip_path(body.get("voice"))
            lang = body.get("language") or "en"
            text = str(body.get("text", "")).strip()[:600]
            if lang not in LANGS or not text:
                raise HTTPException(400, "unsupported language or empty text")
            if not os.path.exists(path):
                voices.reload()
                if not os.path.exists(path):
                    raise HTTPException(404, "no such voice")
            name = "turbo" if lang == "en" else "mtl"
            model = self.models[name]
            prompt = None if self.loaded.get(name) == path else path  # reuse speaker conditioning when the same twin keeps talking
            if name == "turbo":
                wav = model.generate(text, audio_prompt_path=prompt)
            else:
                wav = model.generate(text, language_id=lang, audio_prompt_path=prompt)
            self.loaded[name] = path
            pcm = (wav.squeeze().clamp(-1, 1) * 32767).short().cpu().numpy().tobytes()
            mp3 = subprocess.run(["ffmpeg", "-f", "s16le", "-ar", str(model.sr), "-ac", "1", "-i", "pipe:0",
                                  "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1"],
                                 input=pcm, capture_output=True, check=True).stdout
            return Response(mp3, media_type="audio/mpeg")

        @api.post("/delete")
        def delete(body: dict, x_rico_key: str = Header(None)):
            auth(x_rico_key)
            path = clip_path(body.get("voice"))
            if os.path.exists(path):
                os.remove(path)
                voices.commit()
            self.loaded = {m: p for m, p in self.loaded.items() if p != path}
            return {"ok": True}

        return api
