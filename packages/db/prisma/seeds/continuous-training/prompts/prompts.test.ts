import { describe, expect, it } from 'vitest';
import { withTestDb } from '../../validation/test-helpers';
import { PromptStore } from './prompt-store';
import { PromptRolloutOrchestrator } from './prompt-rollout';

describe('PromptStore', () => {
  it('cache key is deterministic', async () => {
    await withTestDb(async ({ prisma }) => {
      // FAANG: Cast regclass to text — Prisma can't deserialize the
      // Postgres `regclass` OID type. ::text returns NULL if table
      // doesn't exist, otherwise the table name as a string.
      const exists = (await prisma.$queryRaw`
        SELECT to_regclass('"PromptVersion"')::text as t
      `) as Array<{ t: string | null }>;
      if (!exists[0]?.t) return;

      const store = new PromptStore(prisma);
      const k1 = store.computeCacheKey('claude-sonnet-4-6', 'You are Datun.');
      const k2 = store.computeCacheKey('claude-sonnet-4-6', 'You are Datun.');
      const k3 = store.computeCacheKey('claude-sonnet-4-6', 'You are Datun!');
      expect(k1).toBe(k2);
      expect(k1).not.toBe(k3);
    });
  }, 90_000);

  it('rollout rolls back on safety regression', async () => {
    await withTestDb(async ({ prisma }) => {
      // FAANG: Same regclass cast pattern for consistency
      const exists = (await prisma.$queryRaw`
        SELECT to_regclass('"PromptVersion"')::text as t
      `) as Array<{ t: string | null }>;
      if (!exists[0]?.t) return;

      const store = new PromptStore(prisma);
      const orch = new PromptRolloutOrchestrator(prisma);
      const created = await store.createVersion({
        version: 'v9.9.9',
        modelTarget: 'claude-sonnet-4-6',
        systemPrompt: 'test',
      });
      await orch.startRollout(created.id, 10, 20, 24);
      const decision = await orch.evaluateRamp(created.id, 0.01, 0.7, 0.7);
      expect(decision.action).toBe('rollback');
    });
  }, 90_000);
});
