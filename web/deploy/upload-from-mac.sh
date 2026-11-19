#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DEPLOY_KEY="$PROJECT_DIR/data/deploy/vera_prive_ed25519"
DEPLOY_ARCHIVE="$PROJECT_DIR/data/deploy/vera-prive-server.tar.gz"
if [ ! -f "$DEPLOY_KEY" ]; then
  echo 'Deployment SSH key not found.' >&2
  exit 1
fi
COPYFILE_DISABLE=1 tar -czf "$DEPLOY_ARCHIVE" -C "$PROJECT_DIR" Dockerfile .dockerignore .env.example package.json package-lock.json server dist deploy
scp -o IdentitiesOnly=yes -i "$DEPLOY_KEY" "$DEPLOY_ARCHIVE" root@192.0.2.10:/root/vera-prive-deploy.tar.gz
ssh -o IdentitiesOnly=yes -i "$DEPLOY_KEY" root@192.0.2.10 'bash -s' <<'REMOTE'
set -euo pipefail
install -d -m 700 /opt/vera-prive
tar -xzf /root/vera-prive-deploy.tar.gz -C /opt/vera-prive
bash /opt/vera-prive/deploy/install-server.sh
cd /opt/vera-prive
docker compose -f deploy/compose.yaml exec -T app node server/normalize-photo-archive.mjs --apply
REMOTE
