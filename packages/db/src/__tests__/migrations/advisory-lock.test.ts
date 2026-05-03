/**
 * Advisory Lock Tests — verify mutual exclusion behavior.
 *
 * Skips automatically if DATABASE_URL is not set (so this can run in
 * pure-unit test environments without a Postgres dependency).
 */

import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  withMigrationLock,
  tryAcquireLock,
  releaseLock,
  DATUN_MIGRATION_LOCK_KEY,
} from '../../lib/migration-lock.js';

const SKIP = !process.env.DATABASE_URL;

describe.skipIf(SKIP)('advisory lock', () => {
  it('[1/2] lock can be acquired, then released, then re-acquired', async () => {
    const prisma = new PrismaClient();
    try {
      const acq1 = await tryAcquireLock(prisma);
      expect(acq1).toBe(true);
      await releaseLock(prisma);
      const acq2 = await tryAcquireLock(prisma);
      expect(acq2).toBe(true);
      await releaseLock(prisma);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('[2/2] withMigrationLock auto-releases even if fn throws', async () => {
    const prisma = new PrismaClient();
    try {
      await expect(
        withMigrationLock(prisma, async () => {
          throw new Error('simulated failure');
        }),
      ).rejects.toThrow('simulated failure');

      // Lock should have been released — re-acquisition succeeds
      const acq = await tryAcquireLock(prisma, DATUN_MIGRATION_LOCK_KEY);
      expect(acq).toBe(true);
      await releaseLock(prisma);
    } finally {
      await prisma.$disconnect();
    }
  });
});
