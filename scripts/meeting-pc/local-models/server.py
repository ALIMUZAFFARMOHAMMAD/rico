"""Loopback-only, offline voice clone and local reply adapter. No paid fallback."""
import os
os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1", DO_NOT_TRACK="1")
import base64
import hmac
import io
import json
import sys
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CONFIG = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
IDENTITY = json.loads(Path(CONFIG["identityPath"]).read_text(encoding="utf-8-sig"))
LOCK = threading.Lock()
MODEL = None
READY = False

def load_voice():
    global MODEL, READY
    import torch
    from chatterbox.tts_turbo import ChatterboxTurboTTS
    torch.set_num_threads(4)
    MODEL = ChatterboxTurboTTS.from_local(CONFIG["voiceModelPath"], device="cpu", nano=True)
    MODEL.prepare_conditionals(CONFIG["referencePath"])
    READY = True
    print("Local cloned voice ready. No provider API configured.", flush=True)

def reply(body):
    content = body.get("content") or {}
    # Bound prompt cost on an 8 GB PC. Keep the latest question and approved facts.
    safe = {"callName": str(content.get("callName", "Rico"))[:40], "twinProfile": str(content.get("twinProfile", ""))[:1800], "briefing": str(content.get("briefing", ""))[:1000], "transcript": str(content.get("transcript", ""))[-1600:], "latestUtterance": str(content.get("latestUtterance", ""))[:1000]}
    schema = {"type": "object", "properties": {"reply": {"anyOf": [{"type": "string", "maxLength": 240}, {"type": "null"}]}}, "required": ["reply"], "additionalProperties": False}
    payload = {"messages": [{"role": "system", "content": str(body.get("system", ""))[:2400] + " Answer in one short sentence. /no_think"}, {"role": "user", "content": json.dumps(safe)}], "temperature": 0.4, "max_tokens": 100, "stream": False, "response_format": {"type": "json_object", "schema": schema}, "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request("http://127.0.0.1:18663/v1/chat/completions", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer " + CONFIG["token"]}, method="POST")
    with urllib.request.urlopen(req, timeout=70) as response:
        data = json.load(response)
    result = json.loads(data["choices"][0]["message"]["content"])
    value = result.get("reply")
    if set(result) != {"reply"} or (value is not None and (not isinstance(value, str) or not value.strip() or len(value) > 240)):
        raise ValueError("Invalid reply")
    return {"reply": value}

def speech(body):
    import soundfile as sf
    text = body.get("text")
    if not READY or not isinstance(text, str) or not text.strip() or len(text) > 330:
        raise ValueError("Invalid local speech")
    audio = MODEL.generate(text)
    output = io.BytesIO()
    sf.write(output, audio.squeeze(0).cpu().numpy(), MODEL.sr, format="WAV", subtype="PCM_16")
    raw = output.getvalue()
    if len(raw) > 1024 * 1024:
        raise ValueError("Audio too long")
    return {"format": "wav", "audio_base64": base64.b64encode(raw).decode()}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Never log prompts, transcripts, tokens or generated audio.

    def send_json(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        return not self.headers.get("Origin") and self.headers.get("Host") == "127.0.0.1:18662" and hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + CONFIG["token"])

    def do_GET(self):
        if not self.authorized():
            return self.send_json(401, {"error": "Unauthorized"})
        if self.path != "/health":
            return self.send_json(404, {})
        llm_ready = False
        try:
            req = urllib.request.Request("http://127.0.0.1:18663/health", headers={"Authorization": "Bearer " + CONFIG["token"]})
            with urllib.request.urlopen(req, timeout=2) as response:
                llm_ready = response.status == 200
        except Exception:
            pass
        return self.send_json(200, {"ready": READY and llm_ready, "voiceHash": IDENTITY["voiceHash"], "localOnly": True})

    def do_POST(self):
        if not self.authorized():
            return self.send_json(401, {"error": "Unauthorized"})
        if self.path not in ("/reply", "/speech"):
            return self.send_json(404, {})
        if not LOCK.acquire(blocking=False):
            return self.send_json(409, {"error": "Local inference busy"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 32000:
                return self.send_json(413, {"error": "Invalid size"})
            self.connection.settimeout(10)
            body = json.loads(self.rfile.read(size))
            if body.get("voiceHash") != IDENTITY["voiceHash"]:
                return self.send_json(409, {"error": "Saved voice changed; import its current reference first"})
            result = reply(body) if self.path == "/reply" else speech(body)
            self.send_json(200, result)
        except Exception:
            self.send_json(503, {"error": "Local generation failed. No paid fallback was used."})
        finally:
            LOCK.release()

if __name__ == "__main__":
    load_voice()
    ThreadingHTTPServer(("127.0.0.1", 18662), Handler).serve_forever()
