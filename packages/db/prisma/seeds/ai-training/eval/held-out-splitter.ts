// ═══════════════════════════════════════════════════════════════
// HELD-OUT SPLITTER — 90/10 deterministic split with stratification
// Stratify by urgency to avoid imbalanced eval set
// ═══════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import type { Urgency } from './eval.types';

export interface SplitOptions {
  readonly testFraction: number; // 0.10 = 10% held out
  readonly stratifyBy: 'urgency' | 'category' | 'locale' | 'none';
  readonly seed: number;
}

export interface SplitResult<T> {
  readonly train: readonly T[];
  readonly test: readonly T[];
  readonly stratification: Record<string, { trainCount: number; testCount: number }>;
}

export function deterministicSplit<
  T extends { id: string; urgency?: Urgency; category?: string; locale?: string },
>(records: readonly T[], opts: SplitOptions): SplitResult<T> {
  const train: T[] = [];
  const test: T[] = [];
  const strat: Record<string, { trainCount: number; testCount: number }> = {};

  // Group by stratification key
  const groups = new Map<string, T[]>();
  for (const rec of records) {
    const key =
      opts.stratifyBy === 'none' ? '_all' : String(rec[opts.stratifyBy as keyof T] ?? '_unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }

  // Per group, deterministic hash-based split
  for (const [key, items] of groups) {
    strat[key] = { trainCount: 0, testCount: 0 };
    for (const item of items) {
      const h = createHash('sha256').update(`${opts.seed}-${item.id}`).digest();
      const bucket = h.readUInt32BE(0) / 0xffffffff; // 0-1
      if (bucket < opts.testFraction) {
        test.push(item);
        strat[key].testCount++;
      } else {
        train.push(item);
        strat[key].trainCount++;
      }
    }
  }

  return { train, test, stratification: strat };
}
