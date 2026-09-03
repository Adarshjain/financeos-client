#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

NODE_VER=$(tr -d '[:space:]' < .nvmrc)
[[ "$NODE_VER" == v* ]] || NODE_VER="v$NODE_VER"
if [[ -d "$HOME/.nvm/versions/node/$NODE_VER/bin" ]]; then
  export PATH="$HOME/.nvm/versions/node/$NODE_VER/bin:$PATH"
fi

BUILD_JAR=false
KEEP=false
PW_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --build)
      BUILD_JAR=true
      ;;
    --keep)
      KEEP=true
      ;;
    --api)
      PW_ARGS+=(--project=api)
      export E2E_SKIP_GATES=1
      ;;
    --browser)
      PW_ARGS+=(--project=ui-desktop --project=ui-mobile)
      export E2E_SKIP_GATES=1
      ;;
    *)
      PW_ARGS+=("$arg")
      ;;
  esac
done

cleanup() {
  local code=$?
  if [[ "$KEEP" == "false" ]]; then
    echo "Tearing down E2E environment..."
    bash e2e/scripts/down.sh
  else
    echo "Keeping E2E environment running (--keep)."
  fi
  echo "Playwright HTML report is available at: e2e/playwright-report/index.html"
  exit "$code"
}
trap cleanup EXIT

echo "Starting Docker Compose services (Oracle 1522 & WireMock 8089)..."
docker compose -f e2e/docker-compose.yml up -d --wait

echo "Verifying chat_ro database user..."
bash e2e/scripts/check-chat-ro.sh

SERVER_DIR="${SERVER_DIR:-../financeos-server}"
EXISTING_JAR=$(ls "$SERVER_DIR"/target/backend-*.jar 2>/dev/null | head -n 1)
if [[ "$BUILD_JAR" == "true" || -z "$EXISTING_JAR" ]]; then
  echo "Building server jar..."
  bash e2e/scripts/build-server.sh
fi

echo "Starting server on port 6969..."
bash e2e/scripts/start-server.sh

echo "Starting client on port 6970..."
bash e2e/scripts/start-client.sh

echo "Running Playwright test suite..."
npx playwright test --config e2e/playwright.config.ts ${PW_ARGS[@]+"${PW_ARGS[@]}"}
