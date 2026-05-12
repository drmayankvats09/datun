-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for task_44_training_pipeline
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses:
--   1. 3 new enums: LabelerTier, JudgeRunStatus, DataAssetKind
--   2. 2 new tables: judge_runs, data_asset_versions (CASCADE drops indexes+FKs)
--   3. 14 new columns on consultation_messages + 1 re-add of aiTokensUsed
--   4. 2 new columns on consultations (dataTrainingConsentAt/Version)
--   5. 3 new columns on training_labels (tier, agreementScore, disputedWithLabelId)
--   6. 6 explicit indexes on consultation_messages + training_labels
--
-- IMPORTANT: consultation_messages is REBUILT from scratch (DROP TABLE + recreate)
-- rather than DROP/ADD COLUMN aiTokensUsed. Why: PostgreSQL does NOT reuse the
-- original attnum when re-adding a dropped column -- it assigns a new higher one,
-- which causes information_schema.columns.ordinal_position to differ from
-- pre-state, breaking simulate-rollback.ts's byte-exact JSON fingerprint check.
-- Shadow DB has zero rows so rebuild is data-safe. CASCADE auto-drops attached
-- objects (FKs, indexes); we recreate the 0_init-era ones explicitly below.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Drop new tables (CASCADE drops their indexes + FKs)
DROP TABLE IF EXISTS "judge_runs" CASCADE;
DROP TABLE IF EXISTS "data_asset_versions" CASCADE;

-- Step 2: Drop 2 columns added to consultations by Task #44
ALTER TABLE "consultations"
  DROP COLUMN IF EXISTS "dataTrainingConsentAt",
  DROP COLUMN IF EXISTS "dataTrainingConsentVersion";

-- Step 3: Drop 3 columns added to training_labels by Task #44
-- tier MUST be dropped before LabelerTier enum (column depends on enum).
ALTER TABLE "training_labels"
  DROP COLUMN IF EXISTS "tier",
  DROP COLUMN IF EXISTS "agreementScore",
  DROP COLUMN IF EXISTS "disputedWithLabelId";

-- Step 4: Drop 3 enums (safe -- all dependent columns gone above)
DROP TYPE IF EXISTS "LabelerTier";
DROP TYPE IF EXISTS "JudgeRunStatus";
DROP TYPE IF EXISTS "DataAssetKind";

-- Step 5: Rebuild consultation_messages to match 0_init exactly
-- CASCADE auto-drops: PK, all Task #44 indexes, original index, and the FK
-- training_labels_messageId_fkey (which points INTO this table). We recreate
-- the 0_init-era objects below.
DROP TABLE "consultation_messages" CASCADE;

CREATE TABLE "consultation_messages" (
    "id" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "imageUrl" TEXT,
    "chips" JSONB,
    "selectedChip" TEXT,
    "aiLatencyMs" INTEGER,
    "aiTokensUsed" INTEGER,
    "sequenceNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_messages_pkey" PRIMARY KEY ("id")
);

-- Step 6: Recreate 0_init index on consultation_messages
CREATE INDEX "consultation_messages_consultationId_sequenceNumber_idx"
  ON "consultation_messages"("consultationId", "sequenceNumber");

-- Step 7: Recreate 0_init outgoing FK (consultation_messages -> consultations)
ALTER TABLE "consultation_messages"
  ADD CONSTRAINT "consultation_messages_consultationId_fkey"
  FOREIGN KEY ("consultationId") REFERENCES "consultations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Recreate 0_init incoming FK (training_labels -> consultation_messages)
-- This FK was auto-dropped by CASCADE in step 5; restore it.
ALTER TABLE "training_labels"
  ADD CONSTRAINT "training_labels_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "consultation_messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
