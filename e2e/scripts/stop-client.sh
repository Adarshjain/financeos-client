#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [[ -f e2e/.client.pid ]]; then
  PID=$(cat e2e/.client.pid 2>/dev/null || true)
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "Stopping client (PID $PID)..."
    kill "$PID" 2>/dev/null || true
    for _ in {1..10}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null || true
    fi
  fi
  rm -f e2e/.client.pid
fi

# Ensure port 6970 is free
if lsof -ti:6970 >/dev/null 2>&1; then
  lsof -ti:6970 | xargs kill -9 2>/dev/null || true
fi
