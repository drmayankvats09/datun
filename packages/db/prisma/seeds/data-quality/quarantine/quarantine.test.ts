import { describe, expect, it } from 'vitest';
import { withTestDb } from '../../validation/test-helpers';
import { quarantineRow, listPendingQuarantine } from './quarantine-router';

describe('Quarantine flow', () => {
  it('routes a violating row, lists pending', async () => {
    await withTestDb(async ({ prisma }) => {
      const exists =
        (await prisma.$queryRaw`SELECT to_regclass('"QuarantinedRow"')::text as t`) as Array<{
          t: string | null;
        }>;
      if (!exists[0]?.t) return; // skip if migration not applied
      await quarantineRow(
        prisma,
        'Patient',
        'p_test_1',
        { id: 'p_test_1', preferredLocale: 'INVALID' },
        [
          {
            contractTable: 'Patient',
            contractVersion: '1.0.0',
            violationKind: 'enum',
            fieldName: 'preferredLocale',
            severity: 'error',
            message: 'invalid enum',
            sampleRowIds: ['p_test_1'],
            observedAt: new Date(),
          },
        ],
      );
      const pending = await listPendingQuarantine(prisma, 'Patient');
      expect(pending.length).toBeGreaterThan(0);
    });
  }, 60_000);
});
