#!/usr/bin/env bash
# scripts/verify-migration-applied.sh
#
# Post-deploy verification — calls /internal/migration/status and confirms
# the migration system is healthy. Returns:
#   0 — all healthy (status: ok)
#   1 — degraded or critical
#   2 — endpoint unreachable / network error
#
# Usage:
#   API_URL=https://api.datunai.com \
#   BULL_BOARD_USER=admin \
#   BULL_BOARD_PASSWORD=xxxxx \
#   bash scripts/verify-migration-applied.sh
#
# Used by: Railway smoke test, manual operator verification, CI post-deploy.
#
# @see docs/runbooks/migration-deploy.md

set -euo pipefail

: "${API_URL:?API_URL required}"
: "${BULL_BOARD_USER:?BULL_BOARD_USER required}"
: "${BULL_BOARD_PASSWORD:?BULL_BOARD_PASSWORD required}"

ENDPOINT="${API_URL}/internal/migration/status"

echo "==> GET ${ENDPOINT}"

http_code=$(curl -s -o /tmp/migration-status.json -w "%{http_code}" \
  -u "${BULL_BOARD_USER}:${BULL_BOARD_PASSWORD}" \
  --max-time 10 \
  "${ENDPOINT}" || echo "000")

if [[ "$http_code" == "000" ]]; then
  echo "✗ Endpoint unreachable (network error)"
  exit 2
fi

if [[ "$http_code" != "200" ]]; then
  echo "✗ Endpoint returned HTTP ${http_code}"
  cat /tmp/migration-status.json || true
  exit 2
fi

# Extract status field via jq if available, else grep fallback
if command -v jq >/dev/null 2>&1; then
  status=$(jq -r '.status' /tmp/migration-status.json)
else
  status=$(grep -o '"status":"[^"]*"' /tmp/migration-status.json | head -1 | cut -d'"' -f4)
fi

echo "==> Migration system status: ${status}"

case "$status" in
  ok)
    echo "✓ Migration system healthy"
    exit 0
    ;;
  degraded)
    echo "⚠ Migration system degraded — drift or recent failures detected"
    cat /tmp/migration-status.json
    exit 1
    ;;
  critical)
    echo "✗ Migration system CRITICAL — last migration failed"
    cat /tmp/migration-status.json
    exit 1
    ;;
  *)
    echo "✗ Unknown status: ${status}"
    cat /tmp/migration-status.json
    exit 1
    ;;
esac