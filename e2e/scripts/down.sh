#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Tearing down E2E client and server..."
bash e2e/scripts/stop-client.sh || true
bash e2e/scripts/stop-server.sh || true

echo "Tearing down Docker Compose containers..."
docker compose -f e2e/docker-compose.yml down -v --remove-orphans || true
echo "E2E stack is down."
