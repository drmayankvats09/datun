-- CreateTable
CREATE TABLE "csp_violations" (
    "id" TEXT NOT NULL,
    "blockedUri" VARCHAR(2048) NOT NULL,
    "documentUri" VARCHAR(2048) NOT NULL,
    "violatedDirective" VARCHAR(256) NOT NULL,
    "effectiveDirective" VARCHAR(256) NOT NULL,
    "originalPolicy" TEXT NOT NULL,
    "disposition" VARCHAR(16) NOT NULL,
    "statusCode" INTEGER,
    "scriptSample" VARCHAR(2048),
    "sourceFile" VARCHAR(2048),
    "lineNumber" INTEGER,
    "columnNumber" INTEGER,
    "userAgent" VARCHAR(1024),
    "ipHash" CHAR(64) NOT NULL,
    "requestId" VARCHAR(64),
    "severity" VARCHAR(16) NOT NULL,
    "dedupCount" INTEGER NOT NULL DEFAULT 1,
    "sentryEventId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csp_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csp_violations_createdAt_idx" ON "csp_violations"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "csp_violations_effectiveDirective_createdAt_idx" ON "csp_violations"("effectiveDirective", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "csp_violations_severity_createdAt_idx" ON "csp_violations"("severity", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "csp_violations_ipHash_createdAt_idx" ON "csp_violations"("ipHash", "createdAt" DESC);
