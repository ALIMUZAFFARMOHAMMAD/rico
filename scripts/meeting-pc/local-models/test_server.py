"""Offline guard tests. No model, credentials, network or voice sample required."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("local_server", Path(__file__).with_name("server.py"))
server = importlib.util.module_from_spec(spec)
with patch.object(sys, "argv", ["server", "unused"]), patch.object(Path, "read_text", side_effect=['{"identityPath":"unused","token":"test-only"}', '{}']):
    spec.loader.exec_module(server)

class LocalReplyTests(unittest.TestCase):
    def test_echo_is_rejected(self):
        with self.assertRaises(ValueError):
            server.guarded_reply("RICO what can you help with!", "Rico, what can you help with?")

    def test_commitments_are_replaced(self):
        for value in ["I promise to finish.", "We agree to the contract.", "I'll send the payment.", "We will deliver tomorrow."]:
            with self.subTest(value=value):
                self.assertIn("owner", server.guarded_reply(value, "Can you commit?"))

    def test_discussion_and_silence_are_allowed(self):
        self.assertIsNone(server.guarded_reply(None, "Hello"))
        self.assertEqual(server.guarded_reply("I suggest testing a small prototype.", "What next?"), "I suggest testing a small prototype.")

    def test_question_is_separate_from_background(self):
        answer = io.BytesIO(json.dumps({"choices":[{"message":{"content":'{"reply":"I suggest a prototype."}'}}]}).encode())
        with patch.object(server.urllib.request, "urlopen", return_value=answer) as request:
            result = server.reply({"system":"Stay disclosed as AI.", "content":{"latestUtterance":"Rico, what next?", "twinProfile":"An engineer"}})
        sent = request.call_args.args[0]
        self.assertEqual(sent.full_url, "http://127.0.0.1:18663/v1/chat/completions")
        self.assertEqual(json.loads(sent.data)["messages"][-1], {"role":"user", "content":"Rico, what next?"})
        self.assertEqual(result["reply"], "I suggest a prototype.")

    def test_network_failure_has_no_fallback(self):
        with patch.object(server.urllib.request, "urlopen", side_effect=OSError("offline")) as request:
            with self.assertRaises(OSError):
                server.reply({"content":{"latestUtterance":"Rico, help?"}})
            self.assertEqual(request.call_count, 1)

if __name__ == "__main__":
    unittest.main()
