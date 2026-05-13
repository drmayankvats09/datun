-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for add_csp_violation (Task #45)
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses:
--   1. 1 new table: csp_violations (CASCADE drops 4 indexes automatically)
--
-- Safety:
--   CspViolation is a write-only telemetry sink. No foreign keys point INTO
--   it, no other tables depend on it. Safe to drop unconditionally.
--
-- Why CASCADE on DROP TABLE:
--   PostgreSQL CASCADE auto-drops the 4 @@index entries:
--     - csp_violations_createdAt_idx
--     - csp_violations_effectiveDirective_createdAt_idx
--     - csp_violations_severity_createdAt_idx
--     - csp_violations_ipHash_createdAt_idx
--   Plus the primary key constraint csp_violations_pkey.
--
-- Data loss on rollback:
--   ALL csp_violations rows are DROPPED. This is INTENTIONAL — the data is
--   security telemetry. If preservation is needed, export to S3/Sentry before
--   running this rollback (see docs/runbooks/csp-violation-spike.md).
--
-- Pattern: matches task_44_training_pipeline ROLLBACK.sql (BEGIN/COMMIT,
-- explicit IF EXISTS guards, no destructive ops outside transaction).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Drop the csp_violations table (CASCADE drops all 4 indexes + PK)
DROP TABLE IF EXISTS "csp_violations" CASCADE;

COMMIT;
