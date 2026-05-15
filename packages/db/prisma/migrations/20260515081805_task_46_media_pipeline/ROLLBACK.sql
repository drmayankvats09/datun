-- ──────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for task_46_media_pipeline
-- ──────────────────────────────────────────────────────────────────────────────
-- Reverses:
--   1. 5 new enums: MediaKind, MediaProvider, MediaModerationStatus,
--      MediaScanStatus, MediaLifecycleStatus
--   2. media_assets table extension:
--      - 19 new columns (kind, provider, status, processedAt, processingError,
--        width, height, blurhash, variants, cfImageId, originalFilename,
--        exifStripped, moderationStatus, moderationScore, moderationFlags,
--        scanStatus, consentLogId, trainingEligible, retentionExpiresAt)
--      - 4 new indexes (kind+status, status+processedAt, retentionExpiresAt,
--        consentLogId)
--      - 1 new outgoing FK (consentLogId → consent_logs.id)
--   3. 6 new FK columns on referring tables (each auto-drops its FK constraint
--      and any single-column index Prisma created for the FK):
--      - users.avatarMediaId             → media_assets.id
--      - users.mediaAssetId              → media_assets.id  (orphan Prisma back-relation; safe to drop)
--      - clinics.coverImageMediaId       → media_assets.id
--      - doctors.avatarMediaId           → media_assets.id
--      - consultations.coverPhotoMediaId → media_assets.id
--      - consultation_messages.attachedMediaId → media_assets.id
--
-- Order discipline (required for simulate-rollback.ts byte-exact fingerprint):
--   1. Drop new FK columns on the referring tables FIRST. DROP COLUMN
--      auto-drops its FK constraint and any single-column FK index, restoring
--      the original constraint+index set on each table.
--   2. Drop the 4 new indexes on media_assets. (Explicit; not strictly required
--      for single-column indexes since DROP COLUMN would auto-drop, but the
--      composite indexes (kind, status) and (status, processedAt) reference
--      multiple new columns — explicit drop is clearer and matches Task #44
--      and Task #45 baseline conventions.)
--   3. Drop the consentLogId column on media_assets. Auto-drops the outgoing
--      FK to consent_logs.
--   4. Drop all other 18 new columns on media_assets. Columns typed by the
--      new enums MUST be dropped before the enums in step 5.
--   5. Drop the 5 new enums (safe — every dependent column is gone above).
--
-- IMPORTANT — why no table rebuild is needed (unlike Task #44):
--   Task #46 is purely ADDITIVE — it adds new columns/indexes/enums/FKs and
--   does not drop, rename, or re-add any pre-existing column. PostgreSQL keeps
--   attnum stable for every column that survives an ADD-then-DROP cycle, so
--   the pre-state ordinal_position fingerprint is naturally preserved.
--
-- TODO (post-ship cleanup): The orphan `User.mediaAsset` / `MediaAsset.users[]`
-- back-relation pair (schema.prisma) is unused by application code. Remove in
-- a follow-up migration once Task #46 is verified in production. Tracking
-- in ADR-0006 (Deferred Cleanups section).
--
-- Tested locally with simulate-rollback.ts equivalent on Postgres 18.
-- Pattern source: ADR-0002 (Prisma Migrations Baseline).
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Drop new FK columns on the referring tables.
-- Each DROP COLUMN auto-drops its FK constraint and the implicit single-column
-- index Prisma generated for the FK.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "avatarMediaId",
  DROP COLUMN IF EXISTS "mediaAssetId";

ALTER TABLE "clinics"
  DROP COLUMN IF EXISTS "coverImageMediaId";

ALTER TABLE "doctors"
  DROP COLUMN IF EXISTS "avatarMediaId";

ALTER TABLE "consultations"
  DROP COLUMN IF EXISTS "coverPhotoMediaId";

ALTER TABLE "consultation_messages"
  DROP COLUMN IF EXISTS "attachedMediaId";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Drop the 4 new indexes on media_assets that Task #46 added.
-- Existing indexes from prior migrations remain untouched:
--   - media_assets_entityType_entityId_idx (0_init)
--   - media_assets_uploadedById_idx        (0_init)
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "media_assets_kind_status_idx";
DROP INDEX IF EXISTS "media_assets_status_processedAt_idx";
DROP INDEX IF EXISTS "media_assets_retentionExpiresAt_idx";
DROP INDEX IF EXISTS "media_assets_consentLogId_idx";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Drop the consentLogId FK column on media_assets.
-- Auto-drops the FK constraint to consent_logs.id.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "media_assets"
  DROP COLUMN IF EXISTS "consentLogId";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Drop the remaining 18 new columns on media_assets.
-- Columns typed by the new enums (kind, provider, status, moderationStatus,
-- scanStatus) MUST be dropped before the enums themselves in step 5.
-- The single ALTER TABLE statement is atomic — all-or-nothing per the BEGIN
-- transaction wrapping the entire rollback.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "media_assets"
  DROP COLUMN IF EXISTS "kind",
  DROP COLUMN IF EXISTS "provider",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "processedAt",
  DROP COLUMN IF EXISTS "processingError",
  DROP COLUMN IF EXISTS "width",
  DROP COLUMN IF EXISTS "height",
  DROP COLUMN IF EXISTS "blurhash",
  DROP COLUMN IF EXISTS "variants",
  DROP COLUMN IF EXISTS "cfImageId",
  DROP COLUMN IF EXISTS "originalFilename",
  DROP COLUMN IF EXISTS "exifStripped",
  DROP COLUMN IF EXISTS "moderationStatus",
  DROP COLUMN IF EXISTS "moderationScore",
  DROP COLUMN IF EXISTS "moderationFlags",
  DROP COLUMN IF EXISTS "scanStatus",
  DROP COLUMN IF EXISTS "trainingEligible",
  DROP COLUMN IF EXISTS "retentionExpiresAt";

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Drop the 5 new enums.
-- Order doesn't matter here (no inter-enum deps) — listed in reverse declaration
-- order for symmetry with the forward migration.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS "MediaLifecycleStatus";
DROP TYPE IF EXISTS "MediaScanStatus";
DROP TYPE IF EXISTS "MediaModerationStatus";
DROP TYPE IF EXISTS "MediaProvider";
DROP TYPE IF EXISTS "MediaKind";

COMMIT;