#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Fixtures stay outside public dist and are only read by the one-time importer.
docker compose -f deploy/compose.yaml exec -T -u root app mkdir -p /app/deploy/child-test-results
docker compose -f deploy/compose.yaml cp deploy/child-test-results/. app:/app/deploy/child-test-results/
docker compose -f deploy/compose.yaml exec -T app node server/import-child-tests.mjs
