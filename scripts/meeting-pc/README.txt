RICOMATES — YOUR PC MEETING COMPANION

Status: integration prepared, not yet tested on this PC. Docker/WSL and free disk
space are required. The Windows PC must stay awake while a bot is in a meeting.
This package does not buy subscriptions, open public ports, or install Recall.

1. PREPARE WINDOWS
Run PowerShell in this folder:
  powershell -NoProfile -File .\check-pc.ps1
Free at least 20 GB on the Docker/WSL data drive (more is recommended for updates).
For another data drive, run check-pc.ps1 -StorageDrive D, and install WSL/Docker
data on that drive. Windows itself still needs working space on C:.
Install WSL 2 / Ubuntu using Microsoft's instructions:
  https://learn.microsoft.com/windows/wsl/install
An Administrator PowerShell can run: wsl --install -d Ubuntu
Reboot if asked, open Ubuntu, and finish creating your Linux account.
Install Docker Desktop from https://docs.docker.com/desktop/setup/install/windows-install/
Review its license, open it, select Linux containers, and enable Ubuntu under
Settings > Resources > WSL integration. Use Docker Engine 26+ and Node.js 20+.
In Ubuntu: sudo apt update && sudo apt install -y git make openssl python3

2. INSTALL VEXA + LOCAL SPEECH TRANSCRIPTION
Open Ubuntu. Change to this extracted folder (Windows C: is /mnt/c/ in Ubuntu).
  bash setup-vexa.sh
The script creates ~/ricomates-vexa-v0.12.28 and refuses to overwrite it.
It clones Apache-2.0 Vexa source tag v0.12.28, runs the official Compose installer,
and builds its CPU speech service with the small Whisper model. Upstream control
plane images use the published v012 channel; those tags can change. The installed
image inventory is saved in deploy/compose/installed-images.json. This is an
evaluation setup, not a tested production server. CPU speed/accuracy vary; several
simultaneous meetings may overwhelm a PC. Start with one meeting at a time.
The large downloads/builds may take a while. No PC files or existing containers
are removed. Do not share the .env files or local API key printed by Vexa.
Ricomates does not need Vexa's optional Claude-agent credentials.

Wait for the speech model:
  cd ~/ricomates-vexa-v0.12.28/deploy/transcription
  docker compose -p ricomates-stt -f docker-compose.ricomates.yml logs --tail=40 transcription-worker-1
Look for "Model loaded successfully". Check from the private Docker network:
  docker compose -p ricomates-stt -f docker-compose.ricomates.yml exec transcription-api wget -qO- http://127.0.0.1/health
The speech service has NO published host port. Vexa's own host ports bind to
127.0.0.1. Do not change them to 0.0.0.0 or add a public tunnel.
Open http://localhost:13000 for the local Vexa dashboard.
Vexa API gateway: http://127.0.0.1:18056
Get the self-host API key printed by make up (bot and tx scopes). If you missed it,
follow Vexa's documented provision-token command inside deploy/compose; never
paste that key or the admin token into a chat or commit it to GitHub.

3. PAIR RICOMATES
Open https://ricomates.si/meetings > Set up PC > Download paired config.
Move ricomates-pc.json into this extracted folder. Edit only its vexaApiKey field
with your local Vexa key. Leave appUrl and vexaUrl unchanged.
In Windows PowerShell in this folder:
  node .\ricomates-meeting-worker.cjs .\ricomates-pc.json
The page shows connected after the worker authenticates to local Vexa.
The connection check separately shows meeting-runtime and speech-model health.
If a reboot leaves speech unavailable, open Ubuntu before restarting the stopped
services. Docker can start before Ubuntu's bind-mounted files are available.
Use the numeric 127.0.0.1 address for the speech gateway health check; localhost
may resolve to IPv6 while nginx is listening only on IPv4.
Keep this window open and the PC awake. Ctrl+C attempts to leave tracked calls.
Configuration and state files are private: do not sync them to a public drive.
Pairing expires after 30 days. Finish meetings before downloading a new pairing.

4. VERIFY A PRIVATE TEST MEETING
Use a meeting you control, tell everyone an AI note-taker is present, and obtain
permission. Prepare the link in Ricomates, click Send AI note-taker and admit it.
Say a short test sentence, check the transcript, leave, and verify notes.
Zoom/Teams may need platform authorization or browser sign-in configured in Vexa;
use the upstream documentation/dashboard if admission or joining fails.
https://github.com/Vexa-ai/vexa/tree/v0.12.28
No real meeting has been joined as part of creating this setup package.

LIMITATIONS AND COSTS
Joining + transcription + AI notes work with standard Vexa. Optional Google Meet
cloned speech requires the Ricomates voice extension (meeting-voice/README.txt)
and either reviewed speech or opt-in automatic replies. WhatsApp/phone use transcript imports.
CPU speech runs locally without a paid speech API. AI notes/drafts use the app's
configured Anthropic API and its existing credit balance. Vexa and the PC retain
local transcript data; Ricomates also stores synced text privately in the cloud.
Audio/video recording storage is disabled in worker bot requests.
The app accepts at most 100,000 transcript characters / 5,000 confirmed segments.
Larger transcripts remain available locally in Vexa; import shorter portions.

RECOVERY / RESTART
The worker journals a job before joining. If a request times out, it never repeats
that join automatically: check the local Vexa dashboard before starting a new bot.
Restart with the SAME config and .state.json; do not discard that journal.
Only one worker may run from this folder. After an unexpected crash, confirm no
worker process is running before removing the .lock file next to the config.
Unacknowledged results retry on restart. If a job was claimed but never reached
the worker, inspect local Vexa and the app; use Resolve interrupted action only after confirming the bot is stopped.
If Docker restarts, from Ubuntu:
  cd ~/ricomates-vexa-v0.12.28/deploy/compose
  docker compose -p vexa-v012 up -d --no-build
  cd ../transcription
  docker compose -p ricomates-stt -f docker-compose.ricomates.yml up -d --no-build
Then restart the Windows worker as in step 3.

STOPPING / DELETION
Leave meetings before stopping Docker. Delete finished meetings in Ricomates
while the PC worker is connected: it removes Vexa artifacts before cloud notes.
Disconnect PC revokes its token. On its next successful contact, the worker tries
to leave tracked calls; if offline, stop bots in the local dashboard yourself.
Account deletion removes cloud data and revokes pairing but cannot delete data
on an offline PC. Remove local records in Vexa and private config/state files.
Docker volume removal permanently destroys Vexa data; this package never does it.

AUTOMATIC MEETING REPLIES
Update both the app and Windows worker; the existing voice images need no rebuild.
Join Google Meet with cloned speech, then choose Enable automatic replies in the
meeting workspace. Review your twin profile/briefing and confirm participant
consent once per session. Address the twin by its chosen call name (default Rico).
The connector waits for six seconds of stable, completed transcription. Replies
use the configured Anthropic service and your saved voice clone. Every utterance
identifies the AI twin. Answers are limited to 240 characters, 45 seconds apart,
and 40 replies or one hour per enabled session. Pause & stop speaking remains
available while generation runs. Allow a few seconds for the PC to stop audio.
Generation/delivery failures pause replies; uncertain speech is never replayed.
Changing your profile requires enabling again. Do not rely on the twin for
commitments or facts you have not provided. English/Google Meet only.
