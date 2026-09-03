#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

SERVER_DIR="${SERVER_DIR:-../financeos-server}"

echo "Building server jar in $SERVER_DIR..." >&2
(
  cd "$SERVER_DIR"
  ./mvnw -B -q -DskipTests package
)

JAR=$(ls "$SERVER_DIR"/target/backend-*.jar 2>/dev/null | head -n 1)
if [[ -z "$JAR" || ! -f "$JAR" ]]; then
  echo "Error: Server jar not found in $SERVER_DIR/target/" >&2
  exit 1
fi

echo "$JAR"
