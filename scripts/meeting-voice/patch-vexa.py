"""Apply the explicitly scoped Ricomates extension to a fresh Vexa v0.12.28 checkout."""
import ast
import json
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
assets = Path(__file__).resolve().parent
pending = {}

def change(relative, before, after):
    file = root / relative
    text = pending.get(file, file.read_text(encoding="utf-8"))
    if text.count(before) != 1:
        raise RuntimeError('Source mismatch; no files changed: ' + relative)
    pending[file] = text.replace(before, after, 1)

api = 'core/meetings/services/meeting-api/src/meeting_api/'
bot = 'core/meetings/services/bot/src/'
gateway = 'core/gateway/services/gateway/src/gateway/app.py'

change(api + 'bot_spawn/router.py', '                transcribe_enabled=transcribe_enabled,', '                transcribe_enabled=transcribe_enabled,\n                voice_agent_enabled=body.get("voice_agent_enabled") is True,')
change(api + 'bot_spawn/service.py', '    transcribe_enabled: bool = True,', '    transcribe_enabled: bool = True,\n    voice_agent_enabled: bool = False,')
change(api + 'bot_spawn/service.py', '        transcribe_enabled=transcribe_enabled,', '        transcribe_enabled=transcribe_enabled,\n        voice_agent_enabled=voice_agent_enabled,')
change(api + 'bot_spawn/service.py', '        meeting_data["transcribe_enabled"] = transcribe_enabled', '        meeting_data["transcribe_enabled"] = transcribe_enabled\n        meeting_data["ricomates_voice_enabled"] = voice_agent_enabled')
change(api + 'bot_spawn/service.py', '                "transcribe_enabled": transcribe_enabled,', '                "transcribe_enabled": transcribe_enabled,\n                "ricomates_voice_enabled": voice_agent_enabled,')
change(api + 'bot_spawn/invocation.py', '    transcribe_enabled: bool = True,', '    transcribe_enabled: bool = True,\n    voice_agent_enabled: bool = False,')
change(api + 'bot_spawn/invocation.py', '        "transcribeEnabled": transcribe_enabled,', '        "transcribeEnabled": transcribe_enabled,\n        "voiceAgentEnabled": voice_agent_enabled,')
change(api + 'app.py', '    app.include_router(build_stop_router(meeting_repo, command_publisher, runtime))', '    app.include_router(build_stop_router(meeting_repo, command_publisher, runtime))\n    from .lifecycle.ricomates_speak import build_ricomates_speak_router\n    app.include_router(build_ricomates_speak_router(meeting_repo, command_publisher))')
change(gateway, '    @app.post("/bots/{platform}/{native_meeting_id}/speak")', '''    @app.get("/bots/ricomates/voice-capabilities")
    async def ricomates_voice_capabilities(request: Request):
        return await _forward("GET", _meeting("/bots/ricomates/voice-capabilities"), request)

    @app.delete("/bots/{platform}/{native_meeting_id}/speak")
    async def ricomates_stop_speech(platform: str, native_meeting_id: str, request: Request):
        return await _forward("DELETE", _meeting(f"/bots/{platform}/{native_meeting_id}/speak"), request)

    @app.post("/bots/{platform}/{native_meeting_id}/speak")''')
manifest_path = root / 'core/meetings/routes.v1.json'
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
for method, path in [('GET', '/bots/ricomates/voice-capabilities'), ('DELETE', '/bots/{platform}/{native_meeting_id}/speak')]:
    if not any(r['method'] == method and r['path'] == path for r in manifest['routes']):
        manifest['routes'].append({'method': method, 'path': path, 'scopes': ['bot']})
pending[manifest_path] = json.dumps(manifest, indent=2) + '\n'
change(bot + 'index.ts', "    else if (act.action === 'speak_stop') await speak.stop();", "    else if (act.action === 'speak_audio') await speak.speakAudio(act.audioBase64 || '');\n    else if (act.action === 'speak_stop') await speak.stop();")
change(bot + 'capture-bridge.ts', 'export interface SpeakController {', 'export interface SpeakController {\n  speakAudio(audio: string): Promise<void>;')
change(bot + 'capture-bridge.ts', 'export function createSpeakController(page: Page, inv: Invocation): SpeakController {', "import { createRicomatesAudio } from './ricomates-audio.js';\n\nexport function createSpeakController(page: Page, inv: Invocation): SpeakController {\n  const audio = createRicomatesAudio();")
change(bot + 'capture-bridge.ts', '    async speak(text: string, voice?: string): Promise<void> {', '''    async speakAudio(encoded: string): Promise<void> {
      if (!enabled || platform !== 'google_meet') throw new Error('Cloned speech is not enabled for this bot');
      const setMeetMic = async (on: boolean) => {
        await page.evaluate((wantOn) => {
          const doc = (globalThis as any).document;
          const buttons = Array.from(doc.querySelectorAll('button,[role="button"]')) as any[];
          const wanted = wantOn ? /turn on microphone/i : /turn off microphone/i;
          const opposite = wantOn ? /turn off microphone/i : /turn on microphone/i;
          const button = buttons.find(b => wanted.test(b.getAttribute('aria-label') || ''));
          if (button) { button.click(); return; }
          if (!buttons.some(b => opposite.test(b.getAttribute('aria-label') || ''))) throw new Error('Meeting microphone control not found');
        }, on);
      };
      try { await setMeetMic(true); await audio.play(encoded); }
      finally { await setMeetMic(false); }
    },
    async speak(text: string, voice?: string): Promise<void> {''')
change(bot + 'capture-bridge.ts', '      tts.stop();', '      audio.stop();\n      tts.stop();')
# Keep mute intent idempotent for Google Meet on stop; the old implementation toggled blindly.
change(bot + 'capture-bridge.ts', "      if (platform === 'teams') click('#microphone-button');", '''      if (platform === 'google_meet') {
        const desired = on ? /turn on microphone/i : /turn off microphone/i;
        const btn = Array.from(doc?.querySelectorAll('button,[role="button"]') ?? []).find((b: any) => desired.test(b.getAttribute('aria-label') || '')) as any;
        btn?.click();
      }
      else if (platform === 'teams') click('#microphone-button');''')
change('core/meetings/services/bot/Dockerfile', 'FROM vexa/meet-join-env:dev AS runtime', 'FROM vexa/meet-join-env:dev AS runtime\nRUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*')
pending[root / api / 'lifecycle/ricomates_speak.py'] = (assets / 'ricomates_speak.py').read_text(encoding="utf-8")
pending[root / bot / 'ricomates-audio.ts'] = (assets / 'ricomates-audio.ts').read_text(encoding="utf-8")
for file, content in pending.items():
    if file.suffix == '.py': ast.parse(content)
for file, content in pending.items():
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding="utf-8")
print('Applied Ricomates voice extension to', len(pending), 'source files.')
