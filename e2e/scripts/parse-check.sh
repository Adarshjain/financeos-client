#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="${SERVER_DIR:-$REPO_ROOT/../financeos-server}"

JAR=$(ls "$SERVER_DIR"/target/backend-*.jar 2>/dev/null | head -n 1)
if [[ -z "$JAR" || ! -f "$JAR" ]]; then
  echo "Error: Server jar not found in $SERVER_DIR/target/. Run bash e2e/scripts/build-server.sh first." >&2
  exit 1
fi

java -cp "$JAR" -Dloader.main=com.financeos.statement.parser.ParseStatementCli org.springframework.boot.loader.launch.PropertiesLauncher "$@"
