import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { withTestDb } from '../test-helpers';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';

const hashRows = (rows: ReadonlyArray<Record<string, unknown>>) =>
  createHash('sha256')
    .update(JSON.stringify(rows.map((r) => ({ ...r, createdAt: undefined, updatedAt: undefined }))))
    .digest('hex');

describe('Determinism with masterSeed', () => {
  it('same masterSeed → identical clinic signatures', async () => {
    const sigs: string[] = [];
    for (let i = 0; i < 2; i++) {
      await withTestDb(async ({ prisma }) => {
        await runMainOrchestrator({ prisma, env: 'test', scenario: 'minimal', masterSeed: 1234 });
        const clinics = await prisma.clinic.findMany({
          select: { id: true, name: true, slug: true },
          orderBy: { id: 'asc' },
        });
        sigs.push(hashRows(clinics));
      });
    }
    expect(sigs[0]).toBe(sigs[1]);
  }, 180_000);
});
