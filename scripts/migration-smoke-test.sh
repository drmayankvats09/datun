#!/usr/bin/env bash
# scripts/migration-smoke-test.sh
#
# Post-migration smoke test — verifies the application boots and core
# endpoints respond correctly with the new schema in place.
#
# Runs in Railway build phase BEFORE allowing the app to receive traffic.
# Exits non-zero on any failure → Railway marks deploy as failed → rollback.
#
# Endpoints tested:
#   1. GET /health (liveness)
#   2. GET /internal/migration/status (migration system health)
#   3. GET /api/auth/me (auth subsystem still works)
#   4. GET /internal/queues (BullMQ dashboard accessible)
#   5. GET /internal/metrics (Prometheus endpoint)
#
# @see docs/runbooks/migration-deploy.md

set -euo pipefail

: "${API_URL:?API_URL required}"
: "${BULL_BOARD_USER:?}"
: "${BULL_BOARD_PASSWORD:?}"

declare -a FAILURES=()

check() {
  local name="$1"
  local url="$2"
  local auth="${3:-}"
  local expect="${4:-200}"

  local args=(-s -o /dev/null -w "%{http_code}" --max-time 10)
  if [[ -n "$auth" ]]; then
    args+=(-u "$auth")
  fi

  local http_code
  http_code=$(curl "${args[@]}" "$url" || echo "000")

  if [[ "$http_code" == "$expect" ]] || [[ "$http_code" == "401" && "$expect" == "401" ]]; then
    echo "✓ ${name}: ${http_code}"
  else
    echo "✗ ${name}: got ${http_code} expected ${expect}"
    FAILURES+=("$name")
  fi
}

echo "==> Running migration smoke test against ${API_URL}"
echo ""

check "health"             "${API_URL}/health"
check "migration-status"   "${API_URL}/internal/migration/status"   "${BULL_BOARD_USER}:${BULL_BOARD_PASSWORD}"
check "auth-me-unauth"     "${API_URL}/api/auth/me"                 ""    "401"
check "queues-dashboard"   "${API_URL}/internal/queues"             "${BULL_BOARD_USER}:${BULL_BOARD_PASSWORD}"
check "metrics"            "${API_URL}/internal/metrics"            "${BULL_BOARD_USER}:${BULL_BOARD_PASSWORD}"

echo ""
if [[ ${#FAILURES[@]} -eq 0 ]]; then
  echo "✓ All smoke tests passed — deploy verified."
  exit 0
else
  echo "✗ ${#FAILURES[@]} smoke test(s) failed: ${FAILURES[*]}"
  exit 1
fi