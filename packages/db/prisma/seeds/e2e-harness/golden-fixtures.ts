// ═══════════════════════════════════════════════════════════════
// GOLDEN FIXTURES — known-good record snapshots for regression
// ═══════════════════════════════════════════════════════════════

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const GOLDEN_DIR = path.resolve(process.cwd(), 'packages/db/prisma/seeds/e2e-harness/golden');

export interface GoldenFixture {
  readonly name: string;
  readonly tables: readonly string[];
  readonly hashByTable: Readonly<Record<string, string>>;
  readonly capturedAt: string;
}

function hashRows(rows: readonly Record<string, unknown>[]): string {
  const sorted = [...rows].sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16);
}

export async function captureGolden(
  prisma: PrismaClient,
  name: string,
  tables: readonly string[],
): Promise<GoldenFixture> {
  await fs.mkdir(GOLDEN_DIR, { recursive: true });
  const hashByTable: Record<string, string> = {};

  for (const table of tables) {
    const model = (
      prisma as unknown as Record<string, { findMany?: () => Promise<Record<string, unknown>[]> }>
    )[table];
    if (!model?.findMany) continue;
    const rows = await model.findMany();
    hashByTable[table] = hashRows(rows);
  }

  const fixture: GoldenFixture = {
    name,
    tables,
    hashByTable,
    capturedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(GOLDEN_DIR, `${name}.golden.json`),
    JSON.stringify(fixture, null, 2),
  );
  return fixture;
}

export async function compareToGolden(
  prisma: PrismaClient,
  name: string,
): Promise<{
  matches: boolean;
  diffs: readonly { table: string; expected: string; actual: string }[];
}> {
  const filepath = path.join(GOLDEN_DIR, `${name}.golden.json`);
  const content = await fs.readFile(filepath, 'utf-8');
  const expected = JSON.parse(content) as GoldenFixture;
  const diffs: { table: string; expected: string; actual: string }[] = [];

  for (const table of expected.tables) {
    const model = (
      prisma as unknown as Record<string, { findMany?: () => Promise<Record<string, unknown>[]> }>
    )[table];
    if (!model?.findMany) continue;
    const rows = await model.findMany();
    const actualHash = hashRows(rows);
    const expectedHash = expected.hashByTable[table];
    if (actualHash !== expectedHash)
      diffs.push({ table, expected: expectedHash ?? '', actual: actualHash });
  }

  return { matches: diffs.length === 0, diffs };
}
