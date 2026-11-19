#!/usr/bin/env bash
set -euo pipefail
cd /opt/vera-prive
read -r -p 'Подтверждённая почта владельца магазина: ' OWNER_EMAIL
docker compose -f deploy/compose.yaml exec -T app node server/set-role.mjs "$OWNER_EMAIL" admin
printf '%s\n' 'Готово. Войдите в магазин заново — откроется кабинет администратора.'
