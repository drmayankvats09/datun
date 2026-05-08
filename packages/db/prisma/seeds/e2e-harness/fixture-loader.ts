// ═══════════════════════════════════════════════════════════════
// FIXTURE LOADER — bulk-load JSON fixtures into clean test DB
// ═══════════════════════════════════════════════════════════════

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

const FIXTURE_DIR = path.resolve(process.cwd(), 'packages/db/prisma/seeds/e2e-harness/fixtures');

export interface FixtureFile {
  readonly tableName: string;
  readonly records: readonly Record<string, unknown>[];
}

export async function loadFixture(
  prisma: PrismaClient,
  fixtureName: string,
): Promise<{ tablesLoaded: number; recordsLoaded: number }> {
  const filepath = path.join(FIXTURE_DIR, `${fixtureName}.json`);
  const content = await readFile(filepath, 'utf-8');
  const fixtures = JSON.parse(content) as readonly FixtureFile[];

  let recordsLoaded = 0;
  for (const f of fixtures) {
    const model = (
      prisma as unknown as Record<
        string,
        {
          createMany?: (a: {
            data: unknown[];
            skipDuplicates?: boolean;
          }) => Promise<{ count: number }>;
        }
      >
    )[f.tableName];
    if (!model?.createMany) continue;
    const r = await model.createMany({ data: f.records as unknown[], skipDuplicates: true });
    recordsLoaded += r.count;
  }
  return { tablesLoaded: fixtures.length, recordsLoaded };
}

export async function listFixtures(): Promise<readonly string[]> {
  try {
    const files = await readdir(FIXTURE_DIR);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}
