-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for task_44_training_pipeline
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses:
--   1. 3 new enums: LabelerTier, JudgeRunStatus, DataAssetKind
--   2. 2 new tables: judge_runs, data_asset_versions (CASCADE drops indexes+FKs)
--   3. 14 new columns on consultation_messages (incl. FK consultation_messages_judgeRunId_fkey)
--   4. 2 new columns on consultations (dataTrainingConsentAt/Version)
--   5. 3 new columns on training_labels (tier, agreementScore, disputedWithLabelId)
--   6. 6 explicit indexes on consultation_messages + training_labels
--   7. Re-adds aiTokensUsed column (INTEGER, nullable) to consultation_messages
--
-- Order rationale (dependency-safe):
--   FKs → indexes → table-drop with CASCADE → column-drop on existing tables →
--   enum-drop (only after all dependent columns are gone) → re-add dropped column
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Drop foreign key added on consultation_messages → judge_runs
--    (Will also auto-drop when judgeRunId column is dropped below, but explicit is safer.)
ALTER TABLE "consultation_messages" DROP CONSTRAINT IF EXISTS "consultation_messages_judgeRunId_fkey";

-- 2. Drop explicit indexes on consultation_messages
--    (Some would be auto-dropped with their column, but IF EXISTS makes this idempotent.)
DROP INDEX IF EXISTS "consultation_messages_role_judgeScore_idx";
DROP INDEX IF EXISTS "consultation_messages_exportedToTrainingAt_idx";
DROP INDEX IF EXISTS "consultation_messages_correlationId_idx";
DROP INDEX IF EXISTS "consultation_messages_judgeScore_createdAt_idx";

-- 3. Drop explicit indexes on training_labels
DROP INDEX IF EXISTS "training_labels_tier_qualityScore_idx";
DROP INDEX IF EXISTS "training_labels_messageId_tier_idx";

-- 4. Drop new tables (CASCADE removes their indexes + FK constraints automatically)
DROP TABLE IF EXISTS "judge_runs" CASCADE;
DROP TABLE IF EXISTS "data_asset_versions" CASCADE;

-- 5. Drop 14 columns added to consultation_messages by Task #44
ALTER TABLE "consultation_messages"
  DROP COLUMN IF EXISTS "aiCostUsd",
  DROP COLUMN IF EXISTS "aiModel",
  DROP COLUMN IF EXISTS "aiProvider",
  DROP COLUMN IF EXISTS "aiTokensInput",
  DROP COLUMN IF EXISTS "aiTokensOutput",
  DROP COLUMN IF EXISTS "correlationId",
  DROP COLUMN IF EXISTS "embeddingId",
  DROP COLUMN IF EXISTS "exportBatchId",
  DROP COLUMN IF EXISTS "exportedToTrainingAt",
  DROP COLUMN IF EXISTS "judgeReasoning",
  DROP COLUMN IF EXISTS "judgeRunId",
  DROP COLUMN IF EXISTS "judgeScore",
  DROP COLUMN IF EXISTS "piiRedactionVersion",
  DROP COLUMN IF EXISTS "promptVersion",
  DROP COLUMN IF EXISTS "redactedContent";

-- 6. Drop 2 columns added to consultations by Task #44
ALTER TABLE "consultations"
  DROP COLUMN IF EXISTS "dataTrainingConsentAt",
  DROP COLUMN IF EXISTS "dataTrainingConsentVersion";

-- 7. Drop 3 columns added to training_labels by Task #44
--    NOTE: tier column must be dropped BEFORE LabelerTier enum (column depends on enum).
ALTER TABLE "training_labels"
  DROP COLUMN IF EXISTS "tier",
  DROP COLUMN IF EXISTS "agreementScore",
  DROP COLUMN IF EXISTS "disputedWithLabelId";

-- 8. Drop 3 enums created by Task #44
--    Safe to drop now — all columns referencing them have been dropped above.
DROP TYPE IF EXISTS "LabelerTier";
DROP TYPE IF EXISTS "JudgeRunStatus";
DROP TYPE IF EXISTS "DataAssetKind";

-- 9. Re-add aiTokensUsed column on consultation_messages (was dropped by Task #44)
--    Original definition from 0_init/migration.sql line 392: "aiTokensUsed" INTEGER (nullable).
ALTER TABLE "consultation_messages" ADD COLUMN "aiTokensUsed" INTEGER;

COMMIT;