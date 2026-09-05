#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

SECOND_BOOT=false
JAR=""

for arg in "$@"; do
  if [[ "$arg" == "--second-boot" ]]; then
    SECOND_BOOT=true
  elif [[ -z "$JAR" ]]; then
    JAR="$arg"
  fi
done

SERVER_DIR="${SERVER_DIR:-../financeos-server}"
if [[ -z "$JAR" ]]; then
  JAR=$(ls "$SERVER_DIR"/target/backend-*.jar 2>/dev/null | head -n 1)
fi

if [[ -z "$JAR" || ! -f "$JAR" ]]; then
  echo "Error: Server jar not found. Run e2e/scripts/build-server.sh first." >&2
  exit 1
fi

mkdir -p e2e/logs

boot_jar() {
  bash e2e/scripts/stop-server.sh

  set -a
  # shellcheck source=/dev/null
  source e2e/env/server.e2e.env
  set +a

  echo "Starting server with jar: $JAR (profile: ${SPRING_PROFILES_ACTIVE})..."
  nohup java -jar "$JAR" > e2e/logs/server.log 2>&1 &
  echo $! > e2e/.server.pid
  disown || true

  local timeout=240
  local start_time
  start_time=$(date +%s)
  echo "Waiting for server to become healthy on port 6969 (up to ${timeout}s)..."
  while true; do
    if curl -sf http://localhost:6969/actuator/health >/dev/null 2>&1; then
      echo "Server is UP and healthy on port 6969."
      return 0
    fi
    local current_time
    current_time=$(date +%s)
    if (( current_time - start_time >= timeout )); then
      echo "Timeout waiting for server health. Last 40 lines of e2e/logs/server.log:" >&2
      tail -n 40 e2e/logs/server.log >&2 || true
      return 1
    fi
    sleep 3
  done
}

if [[ "$SECOND_BOOT" == "true" ]]; then
  echo "Executing --second-boot: restarting running server to verify Flyway migration idempotence..."
  boot_jar

  echo "Checking Flyway idempotence in e2e/logs/server.log..."
  if grep -E -i "(is up to date|no migration necessary|0 migrations applied)" e2e/logs/server.log; then
    echo "Flyway idempotence verified: zero migrations applied on second boot."
  else
    echo "Error: Flyway did not report schema up to date on second boot! Last 40 log lines:" >&2
    tail -n 40 e2e/logs/server.log >&2 || true
    exit 1
  fi
else
  boot_jar
fi
