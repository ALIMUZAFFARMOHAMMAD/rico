Ricomates strict local meeting replies

The paired PC uses a loopback-only model adapter (127.0.0.1:18662), a private
llama.cpp server (127.0.0.1:18663), Qwen3 0.6B Q8, and Chatterbox Nano.
The original voice reference is downloaded from the owner's saved instant
clone through /api/meeting-local. Export only reads existing sample audio;
it never synthesizes speech. Local files must remain outside the public repo
and restricted to the current Windows user.

The PC config selects localOnly=true, localUrl=http://127.0.0.1:18662 and a
private localToken. Do not put that token, identity.json or recorded audio in
GitHub. The model adapter uses runtime.json for local paths and that token.
No model or voice-generation API key is required by the local adapter.

The website continues to store meeting transcripts and coordinate the paired
PC. Local-only refers to inference: it does not make the meeting or Ricomates
account completely offline. Existing hosting quotas, electricity and internet
usage still apply. Paid meeting notes and drafts are disabled for a PC that
reports strict local mode. A local-only meeting cannot fall back to paid
generation after reconnection. Other app features retain their own settings.

The bot is disclosed as AI. Each meeting requires participant permission and
explicit activation. Replies use only the approved twin profile, briefing and
meeting context. They require the call name, a pause, current meeting/voice
identity and a fresh authorization immediately before playback. Pause stops
pending replies. Local generation failure pauses the session without replay.

Small local models can mishear, hallucinate or give weak answers. Benchmark
your machine and verify an audible live reply before relying on meetings.
No guarantee is made of the owner's exact judgment or real-time performance.

Pinned upstreams for this installation:
llama.cpp b12024 (official Windows CPU archive; SHA256 verified)
Qwen/Qwen3-0.6B-GGUF 23749fefcc72300e3a2ad315e1317431b06b590a
ResembleAI/chatterbox-nano 71ccd1d0081b430592cea481f4307e764e07bc64
resemble-ai/chatterbox 5de7a54aa4e5e2baadb0182dde554908b48b85c2
