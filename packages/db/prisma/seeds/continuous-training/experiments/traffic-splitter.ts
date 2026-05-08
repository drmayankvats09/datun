// ═══════════════════════════════════════════════════════════════
// TRAFFIC SPLITTER — deterministic hash-based assignment
// Same userId always gets same variant within an experiment
// ═══════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import type { ExperimentDefinition, Variant } from './experiment.types';

export function assignVariant(experiment: ExperimentDefinition, userId: string): Variant {
  const hash = createHash('sha256').update(`${experiment.key}:${userId}`).digest();
  const bucket = hash.readUInt32BE(0) / 0xffffffff; // 0-1
  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);
  let cumulative = 0;
  for (const v of experiment.variants) {
    cumulative += v.weight / totalWeight;
    if (bucket < cumulative) return v;
  }
  return experiment.variants[experiment.variants.length - 1]!;
}

export function bucketHash100(experiment: ExperimentDefinition, userId: string): number {
  const hash = createHash('sha256').update(`${experiment.key}:${userId}`).digest();
  return hash.readUInt32BE(0) % 100;
}
