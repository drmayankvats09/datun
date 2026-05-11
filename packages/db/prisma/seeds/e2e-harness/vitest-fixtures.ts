// VITEST TEST CONTEXT FIXTURES — single fixture, no dependency chain
//
// WHY THIS PATTERN:
//   Previous version used testDb → seededPrisma fixture chain.
//   Vitest's fixture resolution with [fn] array syntax caused
//   testDb.prisma to be undefined in the seededPrisma consumer.
//   Fix: single seededPrisma fixture, no intermediate testDb.
//
// DUAL MODE:
//   CI:    SKIP_TESTCONTAINERS=1 → use workflow's Postgres directly
//   Local: Docker available → start testcontainer (lazy import)
// ═══════════════════════════════════════════════════════════════

import { test as baseTest } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator.js';

const USE_CI_POSTGRES = process.env.SKIP_TESTCONTAINERS === '1' && !!process.env.DATABASE_URL;

// ── All 59 tables — CASCADE handles FK order ──
const TRUNCATE_ALL = `TRUNCATE TABLE
  "User", "Patient", "UserPatientAccess", "UserRole", "UserAuthIdentity",
  "Clinic", "ClinicMember", "ClinicInvitation", "Doctor", "DoctorClinic",
  "Consultation", "ConsultationMessage", "TrainingLabel",
  "Appointment", "Prescription", "PrescriptionLineItem",
  "Review", "Lead", "LeadActivity",
  "Subscription", "Invoice", "InvoiceLineItem", "PaymentTransaction",
  "AuditLog", "Notification", "NotificationPreference",
  "WhatsAppMessage", "ConsentLog", "MediaAsset", "EmailLog",
  "WhatsAppProviderHealth", "JobLog",
  "MigrationAudit", "SchemaSnapshot", "SeedAuditLog", "SeedAnonymizationAudit",
  "TrainingExample", "FineTuneRun", "PreferencePair",
  "PrivacyBudget", "PrivacyBudgetSpend",
  "QuarantinedRow", "DataQualityAnomaly", "SloBreach",
  "OutboxEvent", "OutboxDeadLetter",
  "DriftAlert", "GuardrailViolation",
  "PromptVersion", "PromptRolloutPlan", "ShadowComparison",
  "MedicationSalt", "MedicationInteraction",
  "DentalCondition", "PatientArchetype", "SystemPrompt",
  "ProcessingLog", "DeletionRequest", "ExperimentAssignment"
CASCADE`;

interface SeedFixtures {
  readonly seededPrisma: PrismaClient;
}

export const test = baseTest.extend<SeedFixtures>({
  seededPrisma: async ({}, use) => {
    let prisma: PrismaClient;

    if (USE_CI_POSTGRES) {
      // CI mode: workflow already started Postgres + ran migrations
      prisma = new PrismaClient();
      await prisma.$connect();
    } else {
      // Local mode: start testcontainer + run migrations
      const { startTestPostgres } = await import('./postgres-snapshot.js');
      const { runMigrations } = await import('./hermetic-env.js');
      const handle = await startTestPostgres();
      await runMigrations(handle.connectionString);
      prisma = new PrismaClient({ datasources: { db: { url: handle.connectionString } } });
      await prisma.$connect();
    }

    // Clean slate — workflow's seed step may have left data
    await prisma.$executeRawUnsafe(TRUNCATE_ALL);

    // Seed with minimal strategy (5 consultations, ~200 records)
    await runMainOrchestrator({
      prisma,
      env: 'test',
      scenario: 'minimal' as const,
      masterSeed: 42,
    });

    await use(prisma);

    // Cleanup after test
    await prisma.$executeRawUnsafe(TRUNCATE_ALL);
    await prisma.$disconnect();
  },
});
