/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "ageYears" INTEGER,
ADD COLUMN     "alcoholUse" BOOLEAN,
ADD COLUMN     "comorbidConditionsIcd10" JSONB,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "homeClinicId" UUID,
ADD COLUMN     "insuranceId" TEXT,
ADD COLUMN     "knownAllergies" JSONB,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferredLocale" TEXT,
ADD COLUMN     "primaryConditionIcd10" TEXT,
ADD COLUMN     "referralChannel" TEXT,
ADD COLUMN     "residence" TEXT,
ADD COLUMN     "safetyConstraints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sesTier" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appleId" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "role" "UserPrimaryRole",
ALTER COLUMN "name" SET DEFAULT '';

-- CreateTable
CREATE TABLE "seed_audit_log" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "prevHash" TEXT,
    "rowHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionTier" TEXT NOT NULL DEFAULT 'HOT',
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "seed_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_anonymization_audit" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "rowsAffected" INTEGER NOT NULL,
    "complianceProfile" TEXT NOT NULL,
    "saltHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_anonymization_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_example" (
    "id" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "patientContext" JSONB NOT NULL,
    "expectedResponse" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "difficulty" INTEGER,
    "category" TEXT,
    "source" TEXT NOT NULL,
    "parentId" TEXT,
    "generatorModel" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "usedInRuns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fine_tune_run" (
    "id" TEXT NOT NULL,
    "modelBase" TEXT NOT NULL,
    "trainingExampleIds" TEXT[],
    "evalSuiteId" TEXT,
    "hyperparameters" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "resultMetrics" JSONB,
    "status" TEXT NOT NULL,

    CONSTRAINT "fine_tune_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preference_pair" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "responseA" TEXT NOT NULL,
    "responseB" TEXT NOT NULL,
    "preferred" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "rationale" TEXT,
    "reviewerId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptExampleId" TEXT,
    "modelA" TEXT NOT NULL,
    "modelB" TEXT NOT NULL,
    "difficultyTag" TEXT,
    "safetyRelevant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "preference_pair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_budget" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "consumedEpsilon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingEpsilon" DOUBLE PRECISION NOT NULL,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_budget_spend" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "epsilonSpent" DOUBLE PRECISION NOT NULL,
    "mechanism" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_budget_spend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantined_row" (
    "id" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceRowId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remediatedAt" TIMESTAMP(3),
    "remediatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quarantined_row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_quality_anomaly" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "observedValue" DOUBLE PRECISION NOT NULL,
    "expectedMin" DOUBLE PRECISION NOT NULL,
    "expectedMax" DOUBLE PRECISION NOT NULL,
    "zScore" DOUBLE PRECISION,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "data_quality_anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slo_breach" (
    "id" TEXT NOT NULL,
    "sloName" TEXT NOT NULL,
    "budgetBurnPct" DOUBLE PRECISION NOT NULL,
    "observedValue" DOUBLE PRECISION NOT NULL,
    "thresholdValue" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "slo_breach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" TEXT NOT NULL,
    "sequenceId" BIGSERIAL NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "partitionKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_dead_letter" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "finalError" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retriedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_dead_letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drift_alert" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "observedValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "actionRequired" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "drift_alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardrail_violation" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT,
    "side" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "redactedExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardrail_violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_version" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "modelTarget" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "cacheKey" TEXT,

    CONSTRAINT "prompt_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_rollout_plan" (
    "id" TEXT NOT NULL,
    "promptVersionId" TEXT NOT NULL,
    "startTrafficPct" INTEGER NOT NULL DEFAULT 10,
    "rampStepPct" INTEGER NOT NULL DEFAULT 20,
    "rampIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "currentTrafficPct" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rollbackReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "prompt_rollout_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadow_comparison" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "productionResponse" TEXT NOT NULL,
    "candidateResponse" TEXT NOT NULL,
    "productionModel" TEXT NOT NULL,
    "candidateModel" TEXT NOT NULL,
    "compositeDelta" DOUBLE PRECISION NOT NULL,
    "safetyDelta" DOUBLE PRECISION NOT NULL,
    "latencyDelta" INTEGER NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "comparedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "shadow_comparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seed_audit_log_runId_occurredAt_idx" ON "seed_audit_log"("runId", "occurredAt");

-- CreateIndex
CREATE INDEX "seed_audit_log_module_occurredAt_idx" ON "seed_audit_log"("module", "occurredAt");

-- CreateIndex
CREATE INDEX "seed_audit_log_retentionTier_idx" ON "seed_audit_log"("retentionTier");

-- CreateIndex
CREATE INDEX "seed_anonymization_audit_runId_idx" ON "seed_anonymization_audit"("runId");

-- CreateIndex
CREATE INDEX "seed_anonymization_audit_complianceProfile_occurredAt_idx" ON "seed_anonymization_audit"("complianceProfile", "occurredAt");

-- CreateIndex
CREATE INDEX "training_example_source_idx" ON "training_example"("source");

-- CreateIndex
CREATE INDEX "training_example_parentId_idx" ON "training_example"("parentId");

-- CreateIndex
CREATE INDEX "training_example_approvedAt_idx" ON "training_example"("approvedAt");

-- CreateIndex
CREATE INDEX "fine_tune_run_startedAt_idx" ON "fine_tune_run"("startedAt");

-- CreateIndex
CREATE INDEX "fine_tune_run_status_idx" ON "fine_tune_run"("status");

-- CreateIndex
CREATE INDEX "preference_pair_reviewerId_reviewedAt_idx" ON "preference_pair"("reviewerId", "reviewedAt");

-- CreateIndex
CREATE INDEX "preference_pair_safetyRelevant_idx" ON "preference_pair"("safetyRelevant");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_budget_scope_key" ON "privacy_budget"("scope");

-- CreateIndex
CREATE INDEX "privacy_budget_spend_budgetId_occurredAt_idx" ON "privacy_budget_spend"("budgetId", "occurredAt");

-- CreateIndex
CREATE INDEX "privacy_budget_spend_runId_idx" ON "privacy_budget_spend"("runId");

-- CreateIndex
CREATE INDEX "quarantined_row_sourceTable_status_idx" ON "quarantined_row"("sourceTable", "status");

-- CreateIndex
CREATE INDEX "quarantined_row_createdAt_idx" ON "quarantined_row"("createdAt");

-- CreateIndex
CREATE INDEX "data_quality_anomaly_tableName_detectedAt_idx" ON "data_quality_anomaly"("tableName", "detectedAt");

-- CreateIndex
CREATE INDEX "data_quality_anomaly_severity_acknowledgedAt_idx" ON "data_quality_anomaly"("severity", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "slo_breach_sloName_detectedAt_idx" ON "slo_breach"("sloName", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_event_sequenceId_key" ON "outbox_event"("sequenceId");

-- CreateIndex
CREATE INDEX "outbox_event_status_nextAttemptAt_idx" ON "outbox_event"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "outbox_event_aggregateType_aggregateId_idx" ON "outbox_event"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "outbox_event_createdAt_idx" ON "outbox_event"("createdAt");

-- CreateIndex
CREATE INDEX "outbox_dead_letter_aggregateType_createdAt_idx" ON "outbox_dead_letter"("aggregateType", "createdAt");

-- CreateIndex
CREATE INDEX "drift_alert_metric_detectedAt_idx" ON "drift_alert"("metric", "detectedAt");

-- CreateIndex
CREATE INDEX "drift_alert_severity_acknowledgedAt_idx" ON "drift_alert"("severity", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "guardrail_violation_consultationId_createdAt_idx" ON "guardrail_violation"("consultationId", "createdAt");

-- CreateIndex
CREATE INDEX "guardrail_violation_kind_severity_idx" ON "guardrail_violation"("kind", "severity");

-- CreateIndex
CREATE INDEX "guardrail_violation_createdAt_idx" ON "guardrail_violation"("createdAt");

-- CreateIndex
CREATE INDEX "prompt_version_modelTarget_active_idx" ON "prompt_version"("modelTarget", "active");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_version_version_modelTarget_key" ON "prompt_version"("version", "modelTarget");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_rollout_plan_promptVersionId_key" ON "prompt_rollout_plan"("promptVersionId");

-- CreateIndex
CREATE INDEX "shadow_comparison_candidateModel_comparedAt_idx" ON "shadow_comparison"("candidateModel", "comparedAt");

-- CreateIndex
CREATE INDEX "shadow_comparison_recommendedAction_idx" ON "shadow_comparison"("recommendedAction");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");

-- AddForeignKey
ALTER TABLE "privacy_budget_spend" ADD CONSTRAINT "privacy_budget_spend_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "privacy_budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_rollout_plan" ADD CONSTRAINT "prompt_rollout_plan_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "prompt_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
