#!/usr/bin/env bash
set -euo pipefail
umask 077
assets="$(cd "$(dirname "$0")" && pwd)"
original="$HOME/ricomates-vexa-v0.12.28"
upgrade="$HOME/ricomates-vexa-voice-v1"
for tool in docker git make python3; do command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool"; exit 1; }; done
docker info >/dev/null
test -f "$original/deploy/compose/.env" || { echo 'Original Vexa setup was not found in this Ubuntu account.'; exit 1; }
free_kb=$(df -Pk "$HOME" | awk 'NR==2 {print $4}')
[ "$free_kb" -ge 20971520 ] || { echo 'At least 20 GB free is required for the source build.'; exit 1; }
# Refuse service restarts while any bot is active. Read only; never print credentials.
python3 "$assets/check-runtime.py" idle
if [ ! -d "$upgrade" ]; then
  git clone --depth 1 --branch v0.12.28 https://github.com/Vexa-ai/vexa.git "$upgrade"
fi
if [ ! -f "$upgrade/.ricomates-voice-patched" ]; then
  python3 "$assets/patch-vexa.py" "$upgrade"
  touch "$upgrade/.ricomates-voice-patched"
fi
python3 "$assets/prepare-build.py" "$upgrade"
echo 'Building the isolated voice extension. Your current note-taking service stays running during the build.'
docker build -f "$upgrade/core/meetings/modules/join/Dockerfile.env" -t vexa/meet-join-env:dev "$upgrade/core/meetings/modules/join"
docker build -f "$upgrade/core/meetings/services/bot/Dockerfile" -t ricomates/vexa-bot:voice-v1 --build-arg VEXA_IMAGE_VERSION=ricomates-voice-v1 "$upgrade"
docker build -f "$upgrade/core/meetings/services/meeting-api/Dockerfile" -t ricomates/vexa-meeting-api:voice-v1 "$upgrade"
docker build -f "$upgrade/core/gateway/services/gateway/Dockerfile" -t ricomates/vexa-gateway:voice-v1 "$upgrade"
docker run --rm --entrypoint python -v "$assets:/checks:ro" ricomates/vexa-meeting-api:voice-v1 /checks/test_voice_routes.py
cat > "$upgrade/compose.voice.yml" <<'YAML'
services:
  meeting-api:
    image: ricomates/vexa-meeting-api:voice-v1
  gateway:
    image: ricomates/vexa-gateway:voice-v1
  runtime:
    environment:
      BROWSER_IMAGE: ricomates/vexa-bot:voice-v1
YAML
python3 "$assets/check-runtime.py" idle
cd "$original/deploy/compose"
if ! docker compose -p vexa-v012 -f docker-compose.yml -f "$upgrade/compose.voice.yml" up -d --no-build --no-deps meeting-api gateway runtime || ! python3 "$assets/check-runtime.py" ready; then
  echo 'Voice startup failed. Restoring the original notes-only service images.'
  docker compose -p vexa-v012 up -d --no-build --no-deps meeting-api gateway runtime
  exit 1
fi
echo 'Voice images installed. Existing data and local transcription volumes were retained.'
echo 'Restart the updated Ricomates connector. Google Meet speaking still needs a live audible test.'
echo "Rollback: cd $original/deploy/compose && docker compose -p vexa-v012 up -d --no-build --no-deps meeting-api gateway runtime"
