-- ═══════════════════════════════════════════════════════════════
-- TASK #49 — Feature Flag Platform Migration
-- ─────────────────────────────────────────────────────────────────
-- Creates: 4 enums + 3 tables + 12 indexes.
-- Reverses via: ROLLBACK.sql in this directory.
--
-- Patterns:
--   - Uses CITEXT-free TEXT columns (Prisma generates this)
--   - Foreign key on feature_flag_overrides → feature_flags with
--     ON DELETE CASCADE (drop a flag → drop its overrides too).
--   - All timestamp columns: TIMESTAMP(3) (millisecond precision)
--     to match the existing schema convention.
--   - Indexes follow the codebase pattern (created via @@index in
--     schema.prisma → emitted as CREATE INDEX here).
--
-- Safety:
--   This migration is ADDITIVE. It does not alter or drop any
--   existing table or column. Zero risk to running data.
-- ═══════════════════════════════════════════════════════════════

-- CreateEnum
CREATE TYPE "FeatureFlagCategory" AS ENUM ('RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'PERMISSION', 'KILL_SWITCH', 'BETA');

-- CreateEnum
CREATE TYPE "FeatureFlagStatus" AS ENUM ('OFF', 'ON', 'ROLLOUT_BUCKET', 'TARGETED');

-- CreateEnum
CREATE TYPE "FeatureFlagOverrideEntityType" AS ENUM ('USER', 'CLINIC', 'REGION', 'ROLE');

-- CreateEnum
CREATE TYPE "FeatureFlagEvaluationReason" AS ENUM ('DEFAULT', 'STATIC_ON', 'STATIC_OFF', 'ROLLOUT_HIT', 'ROLLOUT_MISS', 'TARGETED_HIT', 'TARGETED_MISS', 'OVERRIDE', 'KILLSWITCH', 'ARCHIVED', 'FALLBACK');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "FeatureFlagCategory" NOT NULL,
    "status" "FeatureFlagStatus" NOT NULL DEFAULT 'OFF',
    "defaultValue" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
    "targetingRules" JSONB NOT NULL DEFAULT '{"combinator":"AND","rules":[]}',
    "variants" JSONB NOT NULL DEFAULT '{"control":false,"treatment":true}',
    "enabledClinicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disabledClinicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evaluationCount" BIGINT NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMP(3),
    "staleAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "entityType" "FeatureFlagOverrideEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_evaluations" (
    "id" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "userId" TEXT,
    "clinicId" TEXT,
    "result" BOOLEAN NOT NULL,
    "variantKey" TEXT,
    "reason" "FeatureFlagEvaluationReason" NOT NULL,
    "bucketHash" INTEGER,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_flagKey_key" ON "feature_flags"("flagKey");

-- CreateIndex
CREATE INDEX "feature_flags_category_idx" ON "feature_flags"("category");

-- CreateIndex
CREATE INDEX "feature_flags_status_idx" ON "feature_flags"("status");

-- CreateIndex
CREATE INDEX "feature_flags_archivedAt_idx" ON "feature_flags"("archivedAt");

-- CreateIndex
CREATE INDEX "feature_flags_staleAt_idx" ON "feature_flags"("staleAt");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_entityType_entityId_idx" ON "feature_flag_overrides"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_expiresAt_idx" ON "feature_flag_overrides"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_flagId_entityType_entityId_key" ON "feature_flag_overrides"("flagId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "feature_flag_evaluations_flagKey_evaluatedAt_idx" ON "feature_flag_evaluations"("flagKey", "evaluatedAt" DESC);

-- CreateIndex
CREATE INDEX "feature_flag_evaluations_userId_idx" ON "feature_flag_evaluations"("userId");

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
