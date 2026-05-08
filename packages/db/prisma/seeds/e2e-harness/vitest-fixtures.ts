// ═══════════════════════════════════════════════════════════════
// VITEST TEST CONTEXT FIXTURES — file-scoped DB, per-test snapshot reset
// Source: vitest.dev/guide/test-context — test.extend builder pattern
// ═══════════════════════════════════════════════════════════════

import { test as baseTest } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { StartedTestContainer } from 'testcontainers';
import { startTestPostgres } from './postgres-snapshot';
import { runMigrations } from './hermetic-env';
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator';

interface SeedFixtures {
  readonly testDb: {
    connectionString: string;
    prisma: PrismaClient;
    container: StartedTestContainer;
  };
  readonly seededPrisma: PrismaClient;
}

/**
 * Vitest extended test with file-scoped DB and per-test snapshot reset.
 * - testDb: file-scoped, applied migrations once
 * - seededPrisma: per-test, resets to snapshot after each test
 *
 * Usage:
 *   import { test } from '@/seeds/e2e-harness/vitest-fixtures';
 *   test('my test', async ({ seededPrisma }) => { ... });
 */
export const test = baseTest.extend<SeedFixtures>({
  testDb: [
    async (
      _ctx: object,
      use: (db: {
        connectionString: string;
        prisma: PrismaClient;
        container: StartedTestContainer;
      }) => Promise<void>,
    ) => {
      const handle = await startTestPostgres();
      await runMigrations(handle.connectionString);
      const prisma = new PrismaClient({ datasources: { db: { url: handle.connectionString } } });
      await prisma.$connect();
      await handle.snapshot();
      await use({ connectionString: handle.connectionString, prisma, container: handle.container });
      await prisma.$disconnect();
      await handle.stop();
    },
  ],
  seededPrisma: async (
    {
      testDb,
    }: {
      testDb: { connectionString: string; prisma: PrismaClient; container: StartedTestContainer };
    },
    use: (p: PrismaClient) => Promise<void>,
  ) => {
    await runMainOrchestrator({
      prisma: testDb.prisma,
      env: 'test',
      scenario: 'minimal' as const,
      masterSeed: 42,
    });
    await use(testDb.prisma);
    // Reset to snapshot after each test
    await testDb.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "User", "Patient", "Consultation" CASCADE',
    );
  },
});
