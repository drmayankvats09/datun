// ═══════════════════════════════════════════════════════════════
// GOLDEN FIXTURES — pinned outputs catch silent regressions
//
// Strategy: Auto-generate fixture file if missing.
// Subsequent runs lock to that pinned shape. This is the standard
// pattern for snapshot-style tests in Stripe / Linear / Vercel codebases.
//
// To regenerate after intentional schema changes:
//   1. Delete: prisma/seeds/validation/golden/fixtures/regression-clinics.json
//   2. Run: pnpm exec vitest run golden-fixtures.test.ts
//   3. Test will auto-create the file on first run, then pin on subsequent runs
// ═══════════════════════════════════════════════════════════════
import { describe, expect, it } from 'vitest';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { withTestDb } from '../test-helpers';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';
import { regressionStrategy } from '../../strategies/specialty.strategies';

describe('Golden fixtures', () => {
  it('matches pinned regression strategy output (clinic count + first clinic shape)', async () => {
    await withTestDb(async ({ prisma }) => {
      await runMainOrchestrator({
        prisma,
        env: regressionStrategy.env,
        scenario: 'minimal',
        masterSeed: regressionStrategy.masterSeedOverride ?? 42,
        stopOnError: regressionStrategy.stopOnError,
        compensateOnFailure: regressionStrategy.compensateOnFailure,
      });
      const clinics = await prisma.clinic.findMany({ orderBy: { id: 'asc' } });
      const fixturesDir = path.join(__dirname, 'fixtures');
      const fixturePath = path.join(fixturesDir, 'regression-clinics.json');

      // Auto-create fixture if missing (first run after intentional schema change)
      if (!existsSync(fixturePath)) {
        await mkdir(fixturesDir, { recursive: true });
        const fixture = clinics.map((c) => ({ name: c.name, tier: c.tier }));
        await writeFile(fixturePath, JSON.stringify(fixture, null, 2), 'utf8');
        console.log(`📌 Golden fixture created at ${fixturePath} (${fixture.length} clinics)`);
        // Self-validate against newly-created fixture
        expect(clinics.length).toBe(fixture.length);
        expect({ name: clinics[0]!.name, tier: clinics[0]!.tier }).toEqual(fixture[0]);
        return;
      }

      const golden = JSON.parse(await readFile(fixturePath, 'utf8')) as Array<{
        name: string;
        tier: string;
      }>;
      expect(clinics.length).toBe(golden.length);
      expect({ name: clinics[0]!.name, tier: clinics[0]!.tier }).toEqual(golden[0]);
    });
  }, 120_000);
});
