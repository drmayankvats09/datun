/**
 * Migration Health Tests — verify health classification logic.
 *
 * Skips if DATABASE_URL not set.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getMigrationHealth, getMigrationHealthLite } from '../../lib/migration-health.js';

const SKIP = !process.env.DATABASE_URL;

describe.skipIf(SKIP)('migration health', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('[1/3] getMigrationHealth returns full report shape', async () => {
    const health = await getMigrationHealth(prisma);
    expect(['ok', 'degraded', 'critical']).toContain(health.status);
    expect(typeof health.driftDetected).toBe('boolean');
    expect(typeof health.totalMigrationsApplied).toBe('number');
    expect(typeof health.recentFailureCount).toBe('number');
    expect(health.currentSchemaChecksum).toMatch(/^([a-f0-9]{64}|unknown)$/);
  });

  it('[2/3] getMigrationHealthLite returns minimal shape', async () => {
    const lite = await getMigrationHealthLite(prisma);
    expect(['ok', 'degraded', 'critical']).toContain(lite.status);
    expect(lite.lastAppliedAt === null || typeof lite.lastAppliedAt === 'string').toBe(true);
  });

  it("[3/3] empty audit table reports 'ok' status (fresh system)", async () => {
    // This test validates the explicit "no audit history → ok" branch
    // by reading the lite health check; in the fresh-system case the
    // status should never be 'critical' purely from absence of records.
    const lite = await getMigrationHealthLite(prisma);
    if (lite.lastAppliedAt === null) {
      expect(lite.status).toBe('ok');
    }
    // If we have audit history, status reflects most recent success state
  });
});
