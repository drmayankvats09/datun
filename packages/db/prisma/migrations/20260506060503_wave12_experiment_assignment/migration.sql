-- CreateTable
CREATE TABLE "experiment_assignments" (
    "id" TEXT NOT NULL,
    "experimentKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "bucketHash" INTEGER NOT NULL,
    "assignmentReason" TEXT NOT NULL DEFAULT 'NEW_RANDOM',
    "metricExposed" BOOLEAN NOT NULL DEFAULT false,
    "conversionEvents" JSONB NOT NULL DEFAULT '[]',
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiment_assignments_experimentKey_variantKey_idx" ON "experiment_assignments"("experimentKey", "variantKey");

-- CreateIndex
CREATE INDEX "experiment_assignments_userId_idx" ON "experiment_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignments_experimentKey_userId_key" ON "experiment_assignments"("experimentKey", "userId");
