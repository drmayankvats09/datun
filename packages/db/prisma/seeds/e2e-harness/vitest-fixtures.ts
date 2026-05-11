// ═══════════════════════════════════════════════════════════════
// VITEST TEST CONTEXT FIXTURES — single fixture, no dependency chain
//
// DUAL MODE:
//   CI:    SKIP_TESTCONTAINERS=1 → use workflow's Postgres directly
//   Local: Docker available → start testcontainer (lazy import)
//
// TRUNCATE: dynamic — queries pg_tables, never hardcoded.
//   Schema changes can never break this fixture.
// ═══════════════════════════════════════════════════════════════

import { test as baseTest } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator.js';

const USE_CI_POSTGRES = process.env.SKIP_TESTCONTAINERS === '1' && !!process.env.DATABASE_URL;

/**
 * Truncate ALL tables in public schema except _prisma_migrations.
 * Dynamic — no hardcoded table names, never goes out of sync.
 */
async function truncateAll(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename != '_prisma_migrations'
      ) LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `);
}

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
    await truncateAll(prisma);

    // Seed with minimal strategy
    await runMainOrchestrator({
      prisma,
      env: 'test',
      scenario: 'minimal' as const,
      masterSeed: 42,
    });

    await use(prisma);

    // Cleanup after test
    await truncateAll(prisma);
    await prisma.$disconnect();
  },
});
