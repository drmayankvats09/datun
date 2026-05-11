// ═══════════════════════════════════════════════════════════════
// VITEST TEST CONTEXT FIXTURES — file-scoped DB, per-test reset
//
// DUAL MODE (FAANG pattern — Stripe, Linear, Vercel all do this):
//   CI:    SKIP_TESTCONTAINERS=1 → use workflow's Postgres service
//   Local: Docker available → start testcontainer per file
//
// Source: vitest.dev/guide/test-context — test.extend builder pattern
// ═══════════════════════════════════════════════════════════════

import { test as baseTest } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator';

const USE_CI_POSTGRES = process.env.SKIP_TESTCONTAINERS === '1' && !!process.env.DATABASE_URL;

interface TestDbHandle {
  connectionString: string;
  prisma: PrismaClient;
  stop(): Promise<void>;
}

interface SeedFixtures {
  readonly testDb: TestDbHandle;
  readonly seededPrisma: PrismaClient;
}

/**
 * CI mode: connect to workflow-provided Postgres (already migrated).
 * No testcontainers, no Docker dependency, no rate-limit risk.
 */
async function createCiHandle(): Promise<TestDbHandle> {
  const connectionString = process.env.DATABASE_URL!;
  const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });
  await prisma.$connect();
  return {
    connectionString,
    prisma,
    async stop() {
      await prisma.$disconnect();
    },
  };
}

/**
 * Local mode: spin up testcontainer with snapshot/restore.
 * Requires Docker Desktop running on dev machine.
 */
async function createLocalHandle(): Promise<TestDbHandle> {
  const { startTestPostgres } = await import('./postgres-snapshot.js');
  const { runMigrations } = await import('./hermetic-env.js');
  const handle = await startTestPostgres();
  await runMigrations(handle.connectionString);
  const prisma = new PrismaClient({ datasources: { db: { url: handle.connectionString } } });
  await prisma.$connect();
  await handle.snapshot();
  return {
    connectionString: handle.connectionString,
    prisma,
    async stop() {
      await prisma.$disconnect();
      await handle.stop();
    },
  };
}

// ── All tables to truncate between tests (order doesn't matter — CASCADE handles FKs) ──
const TRUNCATE_SQL = `
  TRUNCATE TABLE
    "User", "Patient", "Consultation", "ConsultationMessage",
    "Clinic", "Doctor", "DoctorClinic", "ClinicMember",
    "Appointment", "Prescription", "PrescriptionLineItem",
    "Review", "Lead", "LeadActivity",
    "Subscription", "Invoice", "InvoiceLineItem", "PaymentTransaction",
    "AuditLog", "ConsentLog", "Notification",
    "WhatsAppMessage", "EmailLog", "JobLog",
    "TrainingExample", "TrainingLabel",
    "MedicationSalt", "DentalCondition", "PatientArchetype", "SystemPrompt",
    "MediaAsset", "UserRole", "UserAuthIdentity", "UserPatientAccess",
    "NotificationPreference", "WhatsAppProviderHealth",
    "MigrationAudit", "SchemaSnapshot", "SeedAuditLog", "SeedAnonymizationAudit",
    "FineTuneRun", "PreferencePair", "PrivacyBudget", "PrivacyBudgetSpend",
    "QuarantinedRow", "DataQualityAnomaly", "SloBreach",
    "OutboxEvent", "OutboxDeadLetter",
    "DriftAlert", "GuardrailViolation",
    "PromptVersion", "PromptRolloutPlan", "ShadowComparison",
    "MedicationInteraction", "ProcessingLog", "DeletionRequest",
    "ExperimentAssignment", "ClinicInvitation"
  CASCADE
`.replace(/\n/g, ' ');

/**
 * Vitest extended test with file-scoped DB and per-test reset.
 * - testDb: file-scoped — CI postgres or testcontainer (once per file)
 * - seededPrisma: per-test — seeds data, truncates after each test
 *
 * Usage:
 *   import { test } from './vitest-fixtures';
 *   test('my test', async ({ seededPrisma }) => { ... });
 */
export const test = baseTest.extend<SeedFixtures>({
  testDb: [
    async (_ctx: object, use: (db: TestDbHandle) => Promise<void>) => {
      const handle = USE_CI_POSTGRES ? await createCiHandle() : await createLocalHandle();
      await use(handle);
      await handle.stop();
    },
  ],
  seededPrisma: async (
    { testDb }: { testDb: TestDbHandle },
    use: (p: PrismaClient) => Promise<void>,
  ) => {
    await runMainOrchestrator({
      prisma: testDb.prisma,
      env: 'test',
      scenario: 'minimal' as const,
      masterSeed: 42,
    });
    await use(testDb.prisma);
    // Reset all tables between tests
    await testDb.prisma.$executeRawUnsafe(TRUNCATE_SQL);
  },
});
