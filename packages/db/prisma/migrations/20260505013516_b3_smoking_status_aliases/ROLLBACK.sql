-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for b3_smoking_status_aliases
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses: SmokingStatus enum extensions
--   Removes: NEVER_SMOKER, CURRENT_SMOKER, FORMER_SMOKER, OCCASIONAL_SMOKER
--   Restores: NEVER, FORMER, CURRENT (0_init originals)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TYPE "SmokingStatus" RENAME TO "SmokingStatus_old";
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT');
ALTER TABLE "patients" ALTER COLUMN "smokingStatus" TYPE "SmokingStatus"
  USING "smokingStatus"::text::"SmokingStatus";
DROP TYPE "SmokingStatus_old";

COMMIT;