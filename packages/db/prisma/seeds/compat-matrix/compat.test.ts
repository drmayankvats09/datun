// ═══════════════════════════════════════════════════════════════
// COMPAT TEST — runs every CI invocation, ensures supported envs
// ═══════════════════════════════════════════════════════════════
import { describe, expect, it } from 'vitest';
import { checkCompatibility } from './prisma-node-compat';

describe('Compatibility matrix', () => {
  it('Prisma + Node + OS in supported set', () => {
    const r = checkCompatibility();
    expect(r.errors, `Compat errors: ${r.errors.join('; ')}`).toHaveLength(0);
  });

  it('Reports current versions', () => {
    const r = checkCompatibility();
    expect(r.prismaVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(r.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });
});
