RICOMATES CLONED SPEECH EXTENSION - GOOGLE MEET

This is a Ricomates extension to Apache-2.0 Vexa v0.12.28:
https://github.com/Vexa-ai/vexa/tree/v0.12.28
It is not an upstream Vexa feature or officially supported Vexa release.
The installer retains upstream license files in its source checkout and images.

REQUIREMENTS
Existing Ricomates Ubuntu Vexa installation, Docker Desktop WSL integration,
paired PC config at D:\RicomatesBot\ricomates-pc.json, 20 GB free in Ubuntu,
Node.js 20+, and a saved personal voice clone in Ricomates.
The app must include the meeting-voice update before using the new connector.

INSTALL
Finish all meetings first and leave Docker running.
Run install-voice.sh inside Ubuntu with bash. It clones the pinned source into
~/ricomates-vexa-voice-v1, applies the extension, and builds separate images.
The current service remains running during builds. Tests must pass before the
installer replaces meeting-api, gateway and runtime with the voice overlay.
Database and local transcription volumes are preserved.
Only after success, stop the existing PC connector using Ctrl+C, replace its
worker with the updated ricomates-meeting-worker.cjs, and start it again using
the SAME config and state journal. Do not delete a running worker's lock.

USE
Create a new Google Meet session in Ricomates. Enable cloned speech when joining.
Participants must know the clearly named AI twin is using the owner's clone.
In Twin drafts, request a response based on the transcript, review/edit it, then
choose Speak this reply. You can also type your own response.
The bot adds an AI introduction and uses only your saved clone; no stock fallback.
The first live test must confirm the audio is audible and uses the correct voice.
An accepted API request is not proof of successful audible playback.

LIMITS
English, Google Meet, owner-approved replies only. No autonomous turn-taking,
Zoom/Teams speech, WhatsApp bot, or meeting chat sending in this version.
240 characters per reply, 1 MiB audio, maximum 30 seconds playback and 45 seconds
between replies. Stop requests travel through the PC polling connection.
Voice generation uses the configured service and may consume paid credits.
The PC must stay awake. Platform UI changes may affect microphone control.
No cloned audio is deliberately stored by this extension; provider retention is
controlled by the configured voice service. Meeting transcripts may include it.

RESTART WITH VOICE
cd ~/ricomates-vexa-v0.12.28/deploy/compose
docker compose -p vexa-v012 -f docker-compose.yml -f "$HOME/ricomates-vexa-voice-v1/compose.voice.yml" up -d --no-build

ROLLBACK TO THE ORIGINAL NOTES-ONLY SERVICES (finish meetings first)
cd ~/ricomates-vexa-v0.12.28/deploy/compose
docker compose -p vexa-v012 up -d --no-build --no-deps meeting-api gateway runtime
The updated connector is backward compatible and disables speech when the
authenticated runtime capability route is absent.
