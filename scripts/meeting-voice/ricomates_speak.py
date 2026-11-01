"""Owner-scoped Ricomates audio extension for Vexa v0.12.28 (Google Meet)."""
import base64
import binascii
import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Request
from .stop_router import _resolve_user_id

MAX_BYTES = 1024 * 1024

def decode_audio(value, audio_format):
    if not isinstance(value, str) or len(value) > 1400000:
        raise HTTPException(413, "Audio is missing or exceeds 1 MiB")
    try:
        audio = base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(422, "Invalid audio encoding")
    if not audio or len(audio) > MAX_BYTES:
        raise HTTPException(413, "Audio must be 1 byte to 1 MiB")
    wav = len(audio) >= 44 and audio[:4] == b'RIFF' and audio[8:12] == b'WAVE'
    mp3 = audio[:3] == b'ID3' or (len(audio) > 2 and audio[0] == 255 and audio[1] & 224 == 224)
    if not ((audio_format == 'wav' and wav) or (audio_format == 'mp3' and mp3)):
        raise HTTPException(422, "Only WAV and MP3 audio are supported")
    return value

def build_ricomates_speak_router(repo, publisher):
    router = APIRouter()

    @router.get('/bots/ricomates/voice-capabilities')
    async def capabilities(x_user_id: Optional[str] = Header(default=None)):
        _resolve_user_id(x_user_id)
        return {'version': 1, 'platforms': ['google_meet'], 'formats': ['mp3', 'wav'], 'max_bytes': MAX_BYTES}

    async def owned(platform, native, x_user_id):
        owner = _resolve_user_id(x_user_id)
        if platform != 'google_meet':
            raise HTTPException(422, 'Ricomates voice currently supports Google Meet')
        row = await repo.find_active(owner, platform, native)
        if not row or row.get('status') != 'active':
            raise HTTPException(409, 'The owned bot must be active in the meeting')
        if not (row.get('data') or {}).get('ricomates_voice_enabled'):
            raise HTTPException(409, 'Create a new meeting with voice explicitly enabled')
        return row

    async def publish(row, act):
        listeners = await publisher.publish('bot_commands:meeting:' + str(row['id']), json.dumps(act))
        if not listeners:
            raise HTTPException(503, 'No active bot listener; speech was not delivered')
        return {'accepted': True, 'meeting_id': row['id'], 'playback_verified': False}

    @router.post('/bots/{platform}/{native_meeting_id}/speak', status_code=202)
    async def speak(platform: str, native_meeting_id: str, request: Request, x_user_id: Optional[str] = Header(default=None)):
        row = await owned(platform, native_meeting_id, x_user_id)
        body = await request.json()
        if body.get('meeting_id') != row['id']:
            raise HTTPException(409, 'Meeting identity changed')
        audio = decode_audio(body.get('audio_base64'), body.get('format'))
        return await publish(row, {'action': 'speak_audio', 'audioBase64': audio})

    @router.delete('/bots/{platform}/{native_meeting_id}/speak', status_code=202)
    async def stop(platform: str, native_meeting_id: str, meeting_id: int, x_user_id: Optional[str] = Header(default=None)):
        row = await owned(platform, native_meeting_id, x_user_id)
        if meeting_id != row['id']:
            raise HTTPException(409, 'Meeting identity changed')
        return await publish(row, {'action': 'speak_stop'})

    return router
