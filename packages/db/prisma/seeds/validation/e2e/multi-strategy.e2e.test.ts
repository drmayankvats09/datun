import { describe, expect, it } from 'vitest';
import { withTestDb } from '../test-helpers';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';
import { ALL_STRATEGIES } from '../../strategies';

describe.each([['minimal'], ['e2e-test'], ['regression']] as const)('Strategy: %s', (name) => {
  it('runs to completion within memory budget', async () => {
    const spec = ALL_STRATEGIES[name];
    await withTestDb(async ({ prisma }) => {
      const heapBefore = process.memoryUsage().heapUsed;
      const result = await runMainOrchestrator({
        prisma,
        env: spec.env,
        scenario: name === 'e2e-test' ? 'minimal' : 'minimal',
        masterSeed: spec.masterSeedOverride ?? 42,
        stopOnError: true,
        compensateOnFailure: true,
      });
      const heapMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;
      expect(result.status).toBe('COMPLETED');
      expect(heapMb).toBeLessThan(spec.memoryBudgetMb);
    });
  }, 120_000);
});
