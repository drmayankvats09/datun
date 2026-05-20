-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for task_49_feature_flag_platform
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses:
--   1. 3 tables: feature_flags, feature_flag_overrides, feature_flag_evaluations
--      (CASCADE drops 12 indexes + 1 FK constraint automatically)
--   2. 4 enums:  FeatureFlagCategory, FeatureFlagStatus,
--                FeatureFlagOverrideEntityType, FeatureFlagEvaluationReason
--
-- Safety:
--   No other table holds a foreign key pointing INTO these tables. The
--   tables are write-and-read by `flag-evaluator.service.ts` and the
--   admin router only — both gracefully fall back to in-memory defaults
--   when the tables are missing (defence-in-depth, evaluator file).
--
--   That means ROLLBACK is safe to run while the API is up — the
--   evaluator will start returning DEFAULT results within 1 cache
--   refresh (60s) without any 500s.
--
-- Why CASCADE on DROP TABLE:
--   PostgreSQL CASCADE auto-drops:
--     feature_flags             — 5 indexes + PK
--     feature_flag_overrides    — 3 indexes + PK + FK to feature_flags
--     feature_flag_evaluations  — 2 indexes + PK
--   No manual `DROP INDEX` needed.
--
-- Data loss on rollback:
--   - All flag definitions are DROPPED. The PostHog admin console
--     remains the upstream source of truth, so re-running the
--     migration + the sync worker repopulates within 60 seconds.
--   - All override rows are DROPPED. Re-apply via admin UI after
--     re-running the migration.
--   - All evaluation audit rows are DROPPED. These are sampled
--     telemetry — recovery is not required.
--
-- Order:
--   Drop the dependent table (`overrides`) BEFORE the parent
--   (`feature_flags`) for clarity, even though CASCADE would do it
--   automatically. Then evaluations (no FK), then enums last.
--
-- Pattern: matches add_csp_violation ROLLBACK.sql + task_44_training
--          ROLLBACK.sql (BEGIN/COMMIT envelope, explicit IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Drop dependent override table first (CASCADE belt-and-braces)
DROP TABLE IF EXISTS "feature_flag_overrides" CASCADE;

-- Step 2: Drop the parent flag definition table
DROP TABLE IF EXISTS "feature_flags" CASCADE;

-- Step 3: Drop the sampled audit table
DROP TABLE IF EXISTS "feature_flag_evaluations" CASCADE;

-- Step 4: Drop enums in any order — no inter-enum dependency
DROP TYPE IF EXISTS "FeatureFlagEvaluationReason";
DROP TYPE IF EXISTS "FeatureFlagOverrideEntityType";
DROP TYPE IF EXISTS "FeatureFlagStatus";
DROP TYPE IF EXISTS "FeatureFlagCategory";

COMMIT;
