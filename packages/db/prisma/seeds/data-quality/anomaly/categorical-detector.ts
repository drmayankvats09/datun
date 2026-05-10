// ═══════════════════════════════════════════════════════════════
// CATEGORICAL DETECTOR — chi-squared distribution shift
// ═══════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import type { Anomaly } from './anomaly.types';

export function chiSquaredShift(
  baseline: Record<string, number>,
  observed: Record<string, number>,
  table: string,
  column: string,
  alpha = 0.01,
): Anomaly | null {
  const totalBaseline = Object.values(baseline).reduce((s, v) => s + v, 0);
  const totalObserved = Object.values(observed).reduce((s, v) => s + v, 0);
  if (totalBaseline === 0 || totalObserved === 0) return null;
  let chiSq = 0;
  const keys = new Set([...Object.keys(baseline), ...Object.keys(observed)]);
  for (const k of keys) {
    const baselineProportion = (baseline[k] ?? 0) / totalBaseline;
    const expected = baselineProportion * totalObserved;
    const obs = observed[k] ?? 0;
    if (expected < 5) continue; // chi-sq invalid for low expected counts
    chiSq += (obs - expected) ** 2 / expected;
  }
  // Critical value approx for df=keys.size-1 at alpha=0.01
  const dfMinusOne = Math.max(keys.size - 1, 1);
  const critical = dfMinusOne * 6.635; // rough approx for alpha=0.01
  if (chiSq < critical) return null;
  return {
    id: randomUUID(),
    kind: 'categorical-shift',
    tableName: table,
    columnName: column,
    observedValue: chiSq,
    expectedRange: { min: 0, max: critical },
    severity: chiSq > critical * 2 ? 'critical' : 'warning',
    detectedAt: new Date(),
    message: `Distribution shift in ${column}: χ² = ${chiSq.toFixed(2)} (critical ${critical.toFixed(2)})`,
  };
}
