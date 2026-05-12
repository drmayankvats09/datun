/*
  Warnings:

  - You are about to drop the column `aiTokensUsed` on the `consultation_messages` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LabelerTier" AS ENUM ('HUMAN_EXPERT', 'LLM_JUDGE', 'CROWD');

-- CreateEnum
CREATE TYPE "JudgeRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DataAssetKind" AS ENUM ('TRAINING_EXAMPLES', 'PREFERENCE_PAIRS', 'EVAL_SET', 'FINE_TUNE_INPUT', 'RAG_INDEX');

-- AlterTable
ALTER TABLE "consultation_messages" DROP COLUMN "aiTokensUsed",
ADD COLUMN     "aiCostUsd" DECIMAL(10,6),
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiProvider" TEXT,
ADD COLUMN     "aiTokensInput" INTEGER,
ADD COLUMN     "aiTokensOutput" INTEGER,
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "embeddingId" TEXT,
ADD COLUMN     "exportBatchId" TEXT,
ADD COLUMN     "exportedToTrainingAt" TIMESTAMP(3),
ADD COLUMN     "judgeReasoning" TEXT,
ADD COLUMN     "judgeRunId" TEXT,
ADD COLUMN     "judgeScore" DOUBLE PRECISION,
ADD COLUMN     "piiRedactionVersion" TEXT,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "redactedContent" JSONB;

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "dataTrainingConsentAt" TIMESTAMP(3),
ADD COLUMN     "dataTrainingConsentVersion" TEXT;

-- AlterTable
ALTER TABLE "training_labels" ADD COLUMN     "agreementScore" DOUBLE PRECISION,
ADD COLUMN     "disputedWithLabelId" UUID,
ADD COLUMN     "tier" "LabelerTier" NOT NULL DEFAULT 'HUMAN_EXPERT';

-- CreateTable
CREATE TABLE "judge_runs" (
    "id" TEXT NOT NULL,
    "consultationMessageId" UUID NOT NULL,
    "judgeModel" TEXT NOT NULL,
    "judgePromptVersion" TEXT NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "parsedScore" INTEGER NOT NULL,
    "rawScore" DOUBLE PRECISION,
    "reasoning" TEXT NOT NULL,
    "flags" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "latencyMs" INTEGER,
    "status" "JudgeRunStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "judge_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_asset_versions" (
    "id" TEXT NOT NULL,
    "assetKind" "DataAssetKind" NOT NULL,
    "semver" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "manifestUrl" TEXT,
    "metadata" JSONB,
    "parentVersionId" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "data_asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "judge_runs_consultationMessageId_startedAt_idx" ON "judge_runs"("consultationMessageId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "judge_runs_status_startedAt_idx" ON "judge_runs"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "judge_runs_parsedScore_status_idx" ON "judge_runs"("parsedScore", "status");

-- CreateIndex
CREATE INDEX "data_asset_versions_assetKind_createdAt_idx" ON "data_asset_versions"("assetKind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "data_asset_versions_parentVersionId_idx" ON "data_asset_versions"("parentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "data_asset_versions_assetKind_semver_key" ON "data_asset_versions"("assetKind", "semver");

-- CreateIndex
CREATE UNIQUE INDEX "data_asset_versions_assetKind_contentHash_key" ON "data_asset_versions"("assetKind", "contentHash");

-- CreateIndex
CREATE INDEX "consultation_messages_role_judgeScore_idx" ON "consultation_messages"("role", "judgeScore");

-- CreateIndex
CREATE INDEX "consultation_messages_exportedToTrainingAt_idx" ON "consultation_messages"("exportedToTrainingAt");

-- CreateIndex
CREATE INDEX "consultation_messages_correlationId_idx" ON "consultation_messages"("correlationId");

-- CreateIndex
CREATE INDEX "consultation_messages_judgeScore_createdAt_idx" ON "consultation_messages"("judgeScore", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "training_labels_tier_qualityScore_idx" ON "training_labels"("tier", "qualityScore");

-- CreateIndex
CREATE INDEX "training_labels_messageId_tier_idx" ON "training_labels"("messageId", "tier");

-- AddForeignKey
ALTER TABLE "consultation_messages" ADD CONSTRAINT "consultation_messages_judgeRunId_fkey" FOREIGN KEY ("judgeRunId") REFERENCES "judge_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_runs" ADD CONSTRAINT "judge_runs_consultationMessageId_fkey" FOREIGN KEY ("consultationMessageId") REFERENCES "consultation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_asset_versions" ADD CONSTRAINT "data_asset_versions_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "data_asset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_asset_versions" ADD CONSTRAINT "data_asset_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_asset_versions" ADD CONSTRAINT "data_asset_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
