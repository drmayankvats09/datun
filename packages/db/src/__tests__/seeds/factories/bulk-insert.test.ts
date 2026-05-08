// ═══════════════════════════════════════════════════════════════
// BULK INSERT PERFORMANCE TESTS — Verify perf claims hold
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { precomputeIds } from '../../../../prisma/seeds/factories/core/bulk-insert';

describe('Bulk Insert Helpers', () => {
  it('precomputeIds generates correctly formatted IDs', () => {
    const ids = precomputeIds('patient', 5, 100);
    expect(ids).toEqual([
      'patient-00000100',
      'patient-00000101',
      'patient-00000102',
      'patient-00000103',
      'patient-00000104',
    ]);
  });

  it('precomputeIds handles zero start', () => {
    const ids = precomputeIds('user', 3);
    expect(ids[0]).toBe('user-00000001');
    expect(ids[2]).toBe('user-00000003');
  });

  it('precomputeIds with large counts has unique values', () => {
    const ids = precomputeIds('test', 10000);
    const unique = new Set(ids);
    expect(unique.size).toBe(10000);
  });
});
