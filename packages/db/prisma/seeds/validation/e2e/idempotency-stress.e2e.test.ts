import { describe, expect, it } from 'vitest';
import { withTestDb } from '../test-helpers';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';

describe('Idempotency stress', () => {
  it('5 sequential minimal runs produce stable counts', async () => {
    await withTestDb(async ({ prisma }) => {
      const counts: number[] = [];
      for (let i = 0; i < 5; i++) {
        await runMainOrchestrator({ prisma, env: 'test', scenario: 'minimal', masterSeed: 42 });
        counts.push(await prisma.clinic.count());
      }
      expect(new Set(counts).size).toBe(1);
    });
  }, 240_000);
});
