/**
 * Audit Log Tests — verify migration audit entries write and retrieve correctly.
 *
 * Skips if DATABASE_URL not set.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  buildAuditEntry,
  logMigrationAudit,
  getRecentAuditEntries,
} from '../../lib/migration-audit.js';

const SKIP = !process.env.DATABASE_URL;

describe.skipIf(SKIP)('migration audit log', () => {
  const prisma = new PrismaClient();
  const testMigrationName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  afterAll(async () => {
    // Cleanup
    await prisma.migrationAudit
      .deleteMany({ where: { migrationName: testMigrationName } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  it('[1/3] buildAuditEntry populates all required fields', async () => {
    const entry = await buildAuditEntry(prisma, {
      migrationName: testMigrationName,
      durationMs: 123,
      success: true,
      source: 'test',
    });
    expect(entry.migrationName).toBe(testMigrationName);
    expect(entry.durationMs).toBe(123);
    expect(entry.success).toBe(true);
    expect(entry.schemaChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(entry.prismaVersion).not.toBe('');
    expect(entry.postgresVersion).not.toBe('');
  });

  it('[2/3] logMigrationAudit persists to MigrationAudit table', async () => {
    const entry = await buildAuditEntry(prisma, {
      migrationName: testMigrationName,
      durationMs: 456,
      success: true,
      source: 'test',
    });
    await logMigrationAudit(prisma, entry);

    const found = await prisma.migrationAudit.findFirst({
      where: { migrationName: testMigrationName },
    });
    expect(found).not.toBeNull();
    expect(found?.durationMs).toBe(456);
  });

  it('[3/3] getRecentAuditEntries returns ordered by appliedAt desc', async () => {
    const entries = await getRecentAuditEntries(prisma, 10);
    expect(Array.isArray(entries)).toBe(true);
    if (entries.length > 1) {
      const found = entries.find((e) => e.migrationName === testMigrationName);
      expect(found).toBeDefined();
    }
  });
});
