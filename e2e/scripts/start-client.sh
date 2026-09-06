#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

NODE_VER=$(tr -d '[:space:]' < .nvmrc)
[[ "$NODE_VER" == v* ]] || NODE_VER="v$NODE_VER"
if [[ -d "$HOME/.nvm/versions/node/$NODE_VER/bin" ]]; then
  export PATH="$HOME/.nvm/versions/node/$NODE_VER/bin:$PATH"
fi

bash e2e/scripts/stop-client.sh

mkdir -p e2e/logs

if [[ "${SKIP_CLIENT_BUILD:-0}" != "1" ]]; then
  echo "Building Next.js client for production..."
  NEXT_PUBLIC_FARO_URL="" NEXT_PUBLIC_FARO_APP_KEY="" npm run build
fi

echo "Starting Next.js production client on port 6970..."
export API_ORIGIN="http://localhost:6969"
export API_BASE_URL="http://localhost:6969"
export NEXT_PUBLIC_FARO_URL=""
export NEXT_PUBLIC_FARO_APP_KEY=""

nohup npm run start -- -p 6970 > e2e/logs/client.log 2>&1 &
echo $! > e2e/.client.pid
disown || true

timeout=60
start_time=$(date +%s)
echo "Waiting for client to respond on http://localhost:6970/login..."
while true; do
  if curl -sf http://localhost:6970/login >/dev/null 2>&1; then
    echo "Client is UP and responding on http://localhost:6970/login."
    break
  fi
  current_time=$(date +%s)
  if (( current_time - start_time >= timeout )); then
    echo "Timeout waiting for client. Last 40 lines of e2e/logs/client.log:" >&2
    tail -n 40 e2e/logs/client.log >&2 || true
    exit 1
  fi
  sleep 2
done
