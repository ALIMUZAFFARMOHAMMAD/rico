#!/usr/bin/env bash
# Run inside Ubuntu/WSL after enabling Docker Desktop's Ubuntu integration.
set -euo pipefail
umask 077
for tool in git docker make openssl python3; do command -v "$tool" >/dev/null || { echo "Install $tool first (see README)."; exit 1; }; done
available_kb=$(df -Pk "$HOME" | awk 'NR==2 {print $4}')
if [ "$available_kb" -lt 20971520 ]; then echo 'Free at least 20 GB on the drive holding WSL/Docker before installing.'; exit 1; fi
docker info >/dev/null
docker compose version >/dev/null
major=$(docker version --format '{{.Server.Version}}' | cut -d. -f1)
[ "$major" -ge 26 ] || { echo 'Docker Engine 26+ is required.'; exit 1; }
install_dir="$HOME/ricomates-vexa-v0.12.28"
if [ -e "$install_dir" ]; then echo "Installation directory already exists: $install_dir. Follow README restart steps; this script never overwrites an installation."; exit 1; fi
git clone --depth 1 --branch v0.12.28 https://github.com/Vexa-ai/vexa.git "$install_dir"
cd "$install_dir/deploy/compose"
cp .env.example .env
stt_token=$(openssl rand -hex 32)
export RICOMATES_STT_TOKEN="$stt_token"
python3 - <<'PY'
import os
from pathlib import Path
p=Path('.env')
values={'TRANSCRIPTION_SERVICE_URL':'http://ricomates-transcription:80','TRANSCRIPTION_SERVICE_TOKEN':os.environ['RICOMATES_STT_TOKEN'],'RECORDING_ENABLED':'false','HOST_CLAUDE_CREDENTIALS':''}
lines=p.read_text().splitlines()
for key,value in values.items():
    lines=[line for line in lines if not line.startswith(key+'=')]
    lines.append(key+'='+value)
p.write_text('\n'.join(lines)+'\n')
PY
unset RICOMATES_STT_TOKEN
# Uses upstream's published v012 images. Source is pinned; upstream image tags
# can move. Record the resolved image digests after installation below.
make up
cd ../transcription
printf 'API_TOKEN=%s\nMODEL_SIZE=small\nCPU_THREADS=4\n' "$stt_token" > .env
unset stt_token
# Compose override ports can append instead of replace. Generate a dedicated
# config with NO published STT port; only the private Docker network reaches it.
cat > docker-compose.ricomates.yml <<'YAML'
services:
  transcription-api:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - transcription-worker-1
    restart: unless-stopped
    networks:
      vexa:
        aliases: [ricomates-transcription]
  transcription-worker-1:
    build:
      context: ../..
      dockerfile: core/meetings/services/transcription/Dockerfile.cpu
    image: ricomates/vexa-transcription-cpu:0.12.28
    environment:
      WORKER_ID: '1'
      MODEL_SIZE: '${MODEL_SIZE:-small}'
      DEVICE: cpu
      COMPUTE_TYPE: int8
      CPU_THREADS: '${CPU_THREADS:-4}'
      API_TOKEN: '${API_TOKEN}'
    volumes:
      - transcription-models:/app/models
    restart: unless-stopped
    networks: [vexa]
networks:
  vexa:
    external: true
    name: vexa-v012_vexa
volumes:
  transcription-models:
YAML
docker compose -p ricomates-stt -f docker-compose.ricomates.yml up -d --build
cd ../compose
docker compose -p vexa-v012 -f docker-compose.yml images --format json > installed-images.json
printf '\nServices started. Transcription is NOT ready until its model has loaded.\n'
printf 'Read README for the model health check, local Vexa key, and Windows worker.\n'
printf 'No live call has been tested yet. Test a private meeting you control before relying on notes.\n'
