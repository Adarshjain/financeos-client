#!/usr/bin/env bash
# Posts the nightly E2E result to Slack: pass/fail, counts, and the failing tests (from Playwright's
# JUnit report) with a link to the run.
# Usage: slack-e2e-report.sh <junit.xml>
# Requires SLACK_WEBHOOK_URL. Optional: E2E_OUTCOME (job.status: success|failure|cancelled),
# SERVER_SHA (the financeos-server commit under test).
set -euo pipefail

junit="${1:?usage: slack-e2e-report.sh <junit.xml>}"

# A missing secret must be visible in the run summary, not an invisibly skipped step.
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
  echo "::warning title=Slack notification skipped::SLACK_WEBHOOK_URL is not set on this repository. Add it under Settings -> Secrets and variables -> Actions -> Repository secrets."
  exit 0
fi

# summary line, then one "• project › file › title" line per failing test (at most 15, then "…and N more").
report="$(python3 - "$junit" <<'PY'
import sys, xml.etree.ElementTree as ET
try:
    root = ET.parse(sys.argv[1]).getroot()
except (OSError, ET.ParseError):
    print("NOREPORT")
    sys.exit(0)
tests = failed = skipped = 0
failing = []
for suite in root.iter("testsuite"):
    project = suite.get("hostname") or ""
    for case in suite.iter("testcase"):
        tests += 1
        if case.find("skipped") is not None:
            skipped += 1
        elif case.find("failure") is not None or case.find("error") is not None:
            failed += 1
            failing.append(f"• `{project}` {case.get('classname', '')} › {case.get('name', '')}")
seconds = int(float(root.get("time") or 0))
print(f"{tests - failed - skipped} passed, {failed} failed, {skipped} skipped ({seconds // 60}m {seconds % 60}s)")
for line in failing[:15]:
    print(line)
if len(failing) > 15:
    print(f"…and {len(failing) - 15} more")
PY
)"

summary="${report%%$'\n'*}"
details=""
[ "$report" != "$summary" ] && details="${report#*$'\n'}"

outcome="${E2E_OUTCOME:-failure}"
if [ "$summary" = "NOREPORT" ]; then
  summary="no test report: the run stopped before the tests finished"
  [ "$outcome" = "success" ] && outcome="failure"
fi

case "$outcome" in
  success)   emoji=":white_check_mark:"      title="Nightly E2E passed"    color="#2eb886" ;;
  cancelled) emoji=":black_square_for_stop:" title="Nightly E2E cancelled" color="#6b7280" ;;
  *)         emoji=":x:"                     title="Nightly E2E failed"    color="#e01e5a" ;;
esac

run_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
client_sha="$(git rev-parse --short=7 HEAD 2>/dev/null || echo "${GITHUB_SHA:0:7}")"
server_sha="${SERVER_SHA:0:7}"

text="$emoji *$title* — $summary"
text="$text"$'\n'"client \`$client_sha\` · server \`${server_sha:-?}\` · <$run_url|view run>"
if [ -n "$details" ]; then
  text="$text"$'\n'"$details"
fi

# jq builds the JSON so test titles with quotes/newlines can't break the payload.
payload="$(jq -n \
  --arg text "${text:0:2900}" \
  --arg color "$color" \
  --arg fallback "$title — $summary" \
  '{
     text: $fallback,
     attachments: [
       { color: $color,
         blocks: [ { type: "section", text: { type: "mrkdwn", text: $text } } ] }
     ]
   }')"

curl -sS --fail-with-body -X POST \
  -H 'Content-Type: application/json' \
  --data "$payload" \
  "$SLACK_WEBHOOK_URL"
