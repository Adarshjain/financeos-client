#!/usr/bin/env bash
# Fails when a foreign-key column has no index leading with it (run after the server applied its migrations).
# Oracle locks the whole child table while a parent row is deleted if the FK is unindexed, so concurrent
# deletes deadlock (ORA-00060; server V133 indexed the ones that existed on 2026-11-04).
set -euo pipefail

res=$(docker exec -i financeos-e2e-oracle sqlplus -S FINANCEOS/E2eApp12345@localhost/FREEPDB1 <<'SQL'
set heading off feedback off pagesize 0 linesize 200
select c.table_name || '.' || cc.column_name || ' -> ' || p.table_name
from user_constraints c
join user_constraints p on p.constraint_name = c.r_constraint_name
join user_cons_columns cc on cc.constraint_name = c.constraint_name
where c.constraint_type = 'R'
  and not exists (select 1 from user_ind_columns ic
                  where ic.table_name = c.table_name and ic.column_name = cc.column_name and ic.column_position = 1)
order by 1;
exit;
SQL
2>&1)
res=$(echo "$res" | sed '/^[[:space:]]*$/d')
if [[ -n "$res" ]]; then
  if echo "$res" | grep -q "ORA-\|SP2-"; then
    echo "::error::Could not check foreign-key indexes: $res" >&2
    exit 1
  fi
  echo "::error::Foreign keys without an index (add one in a server migration; unindexed FKs deadlock on parent deletes):" >&2
  echo "$res" >&2
  exit 1
fi
echo "All foreign keys are indexed."
