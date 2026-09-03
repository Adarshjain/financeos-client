#!/usr/bin/env bash
set -euo pipefail

res=$(docker exec -i financeos-e2e-oracle sqlplus -S chat_ro/E2eChatRo12345@localhost/FREEPDB1 <<'EOF'
set heading off feedback off pagesize 0
select 1 from dual;
exit;
EOF
2>&1)
if [[ "$(echo "$res" | tr -d '[:space:]')" == "1" ]]; then
  echo "1"
else
  echo "Failed to query dual as chat_ro: $res" >&2
  exit 1
fi
