#!/usr/bin/env bash
set -euo pipefail
cd /opt/vera-prive
if [ "$(id -u)" -ne 0 ]; then
  echo 'Run as root.' >&2
  exit 1
fi
. /etc/os-release
if [ "$ID" != ubuntu ]; then
  echo 'This installer expects Ubuntu.' >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl openssl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker compose version
systemctl enable --now docker
if [ ! -f .env ]; then
  umask 077
  cp .env.example .env
  AUTH_DEPLOY_SECRET=$(openssl rand -hex 48)
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$AUTH_DEPLOY_SECRET|" .env
  unset AUTH_DEPLOY_SECRET
  sed -i 's|^APP_URL=.*|APP_URL=https://shop.example.com|' .env
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
fi
chmod 600 .env
docker compose -f deploy/compose.yaml config --quiet
docker compose -f deploy/compose.yaml up -d --build --force-recreate --wait --wait-timeout 180
docker compose -f deploy/compose.yaml ps
docker compose -f deploy/compose.yaml exec -T app node -e "fetch('http://127.0.0.1:4173/api/shop-auth').then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
echo 'Application started. HTTPS requires DNS pointing to this server and inbound TCP 80/443. Email and social login require provider settings in /opt/vera-prive/.env.'
