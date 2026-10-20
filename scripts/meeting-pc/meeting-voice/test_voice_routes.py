import asyncio
import base64
import unittest
from fastapi import HTTPException
from meeting_api.lifecycle.ricomates_speak import build_ricomates_speak_router, decode_audio

class Repo:
    def __init__(self):
        self.row = {'id': 7, 'status': 'active', 'data': {'ricomates_voice_enabled': True}}
    async def find_active(self, owner, platform, native):
        return self.row if owner == 42 and native == 'abc-defg-hij' else None

class Publisher:
    def __init__(self): self.messages = []; self.listeners = 1
    async def publish(self, channel, message):
        self.messages.append((channel, message)); return self.listeners

class Request:
    async def json(self):
        return {'meeting_id': 7, 'audio_base64': base64.b64encode(b'ID3test').decode(), 'format': 'mp3'}

class VoiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.repo, self.pub = Repo(), Publisher()
        router = build_ricomates_speak_router(self.repo, self.pub)
        self.speak = next(r.endpoint for r in router.routes if 'POST' in r.methods)
        self.stop = next(r.endpoint for r in router.routes if 'DELETE' in r.methods)
    async def test_owner_and_occurrence(self):
        with self.assertRaises(HTTPException): await self.speak('google_meet', 'abc-defg-hij', Request(), '43')
        self.repo.row['id'] = 8
        with self.assertRaises(HTTPException): await self.speak('google_meet', 'abc-defg-hij', Request(), '42')
        self.assertEqual(self.pub.messages, [])
    async def test_requires_active_opted_in_bot(self):
        self.repo.row['data']['ricomates_voice_enabled'] = False
        with self.assertRaises(HTTPException): await self.speak('google_meet', 'abc-defg-hij', Request(), '42')
        self.repo.row['data']['ricomates_voice_enabled'] = True
        self.repo.row['status'] = 'completed'
        with self.assertRaises(HTTPException): await self.speak('google_meet', 'abc-defg-hij', Request(), '42')
    async def test_audio_publishes_only_to_owned_bot(self):
        result = await self.speak('google_meet', 'abc-defg-hij', Request(), '42')
        self.assertEqual(result['meeting_id'], 7)
        self.assertFalse(result['playback_verified'])
        self.assertEqual(self.pub.messages[0][0], 'bot_commands:meeting:7')
        with self.assertRaises(HTTPException): await self.stop('google_meet', 'abc-defg-hij', 8, '42')
        await self.stop('google_meet', 'abc-defg-hij', 7, '42')
        self.assertIn('speak_stop', self.pub.messages[-1][1])
    async def test_absent_bot_listener_is_not_success(self):
        self.pub.listeners = 0
        with self.assertRaises(HTTPException) as error: await self.speak('google_meet', 'abc-defg-hij', Request(), '42')
        self.assertEqual(error.exception.status_code, 503)
    def test_malformed_and_oversized_audio(self):
        for payload, kind in [('!', 'mp3'), ('A' * 1400001, 'mp3'), (base64.b64encode(b'not audio').decode(), 'wav')]:
            with self.assertRaises(HTTPException): decode_audio(payload, kind)

if __name__ == '__main__': unittest.main()
