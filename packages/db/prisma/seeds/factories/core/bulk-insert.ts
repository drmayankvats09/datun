// ═══════════════════════════════════════════════════════════════
// BULK INSERT OPTIMIZER — Prisma createMany batched at 1000
//
// Source: Prisma official docs + getuplaced commit story
//   "switching .upsert loop → createMany → 10x speedup"
// Memory leak workaround: Issue #26805 — chunked + explicit GC hint
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';

/** Default batch size — Prisma recommended 1000 for createMany */
export const DEFAULT_BATCH_SIZE = 1000;

/** Result of a bulk insert */
export interface BulkInsertResult {
  readonly totalRequested: number;
  readonly totalInserted: number;
  readonly totalSkipped: number;
  readonly batchCount: number;
  readonly durationMs: number;
}

/**
 * Bulk-insert records with skipDuplicates fallback.
 * Chunks into batches to avoid memory pressure on large seeds.
 *
 * @example
 * const result = await bulkInsert(prisma, 'user', users, { batchSize: 500 });
 * // → { totalRequested: 10000, totalInserted: 9985, batchCount: 10 }
 */
export async function bulkInsert<TModel extends keyof PrismaClient>(
  prisma: PrismaClient,
  modelName: TModel,
  records: ReadonlyArray<unknown>,
  options: { batchSize?: number; skipDuplicates?: boolean } = {},
): Promise<BulkInsertResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const skipDuplicates = options.skipDuplicates ?? true;
  const startTime = Date.now();

  const model = prisma[modelName] as unknown as {
    createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
  };

  let totalInserted = 0;
  let batchCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const result = await model.createMany({
      data: batch as unknown[],
      skipDuplicates,
    });
    totalInserted += result.count;
    batchCount++;

    // Memory hint — V8 will GC between batches
    if (i + batchSize < records.length && global.gc) {
      global.gc();
    }
  }

  return {
    totalRequested: records.length,
    totalInserted,
    totalSkipped: records.length - totalInserted,
    batchCount,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Bulk upsert via raw COPY-style — read existing IDs, filter, then bulk insert.
 * Use when records have ID conflicts but we want to insert ONLY new ones.
 */
export async function bulkInsertWithUpsert<TModel extends keyof PrismaClient>(
  prisma: PrismaClient,
  modelName: TModel,
  records: ReadonlyArray<{ id: string }>,
  options: { batchSize?: number } = {},
): Promise<BulkInsertResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const startTime = Date.now();

  const model = prisma[modelName] as unknown as {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: { id: true };
    }) => Promise<{ id: string }[]>;
    createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
  };

  // Find existing IDs in chunks
  const existingIds = new Set<string>();
  const ids = records.map((r) => r.id);
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const found = await model.findMany({
      where: { id: { in: chunk } },
      select: { id: true },
    });
    found.forEach((r) => existingIds.add(r.id));
  }

  // Filter to only new records
  const newRecords = records.filter((r) => !existingIds.has(r.id));

  // Bulk insert new
  let totalInserted = 0;
  let batchCount = 0;
  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);
    const result = await model.createMany({
      data: batch as unknown[],
      skipDuplicates: true,
    });
    totalInserted += result.count;
    batchCount++;
  }

  return {
    totalRequested: records.length,
    totalInserted,
    totalSkipped: existingIds.size,
    batchCount,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Pre-compute IDs to avoid post-insert findMany.
 * Returns IDs in deterministic order matching records array.
 * Use when downstream factories need IDs immediately.
 */
export function precomputeIds(
  prefix: string,
  count: number,
  startSequence: number = 1,
): readonly string[] {
  return Array.from(
    { length: count },
    (_, i) => `${prefix}-${String(startSequence + i).padStart(8, '0')}`,
  );
}
