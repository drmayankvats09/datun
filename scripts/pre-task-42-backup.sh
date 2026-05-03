#!/usr/bin/env bash
# scripts/pre-task-42-backup.sh
# 
# Documents the Railway production DB backup procedure executed before Task #42
# baseline migration. This is living documentation — not auto-executed.
#
# Backup details:
#   Date: 2026-05-03
#   Snapshot name: pre-task-42-baseline-2026-05-03
#   Service: datun-db-prod (Railway)
#   Schema state: 31 tables pre-baseline (db:push managed, no migrations folder)
#
# Restore procedure (if Task #42 fails catastrophically):
#   1. Open Railway dashboard → datun project → datun-db-prod
#   2. Click "Data" → "Snapshots"
#   3. Find snapshot: pre-task-42-baseline-2026-05-03
#   4. Click "Restore" → confirm
#   5. Wait ~3-5 minutes for restore
#   6. Verify via /health endpoint and SELECT count(*) on critical tables
#
# Author: Mayank Vats (Datun, Day 16)
# Linked: docs/adr/0002-prisma-migrations-baseline.md

set -euo pipefail

echo "==> Datun Task #42 Pre-Migration Backup Documentation"
echo "==> Snapshot: pre-task-42-baseline-2026-05-03"
echo "==> Created via Railway dashboard manual snapshot (procedure documented above)"
echo "==> This script is documentation — does not execute backup automatically."
echo "==> Always verify snapshot exists in Railway dashboard before proceeding."
echo ""
echo "Procedure verified: $(date -u +%Y-%m-%dT%H:%M:%SZ)"