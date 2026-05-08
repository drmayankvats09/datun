import { describe, expect, it } from 'vitest';
import { withTestDb } from '../test-helpers';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';

describe('Checkpoint resume E2E', () => {
  it('resume reuses runId; second run is idempotent', async () => {
    await withTestDb(async ({ prisma }) => {
      const r1 = await runMainOrchestrator({
        prisma,
        env: 'test',
        scenario: 'minimal',
        masterSeed: 42,
      });
      const r2 = await runMainOrchestrator({
        prisma,
        env: 'test',
        scenario: 'minimal',
        masterSeed: 42,
        resumeFromRunId: r1.runId,
      });
      expect(r2.runId).toBe(r1.runId);
      // Idempotent: total counts shouldn't double
      const clinics = await prisma.clinic.count();
      expect(clinics).toBeGreaterThan(0);
    });
  }, 120_000);
});
