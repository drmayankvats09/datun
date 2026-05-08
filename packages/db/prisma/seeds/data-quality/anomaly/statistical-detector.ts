// ═══════════════════════════════════════════════════════════════
// STATISTICAL DETECTOR — z-score + IQR
// ═══════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import type { Anomaly } from './anomaly.types';

export function detectZScoreAnomalies(
  values: readonly number[],
  observed: number,
  table: string,
  column: string,
  threshold = 3,
): Anomaly | null {
  if (values.length < 10) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return null;
  const z = (observed - mean) / stddev;
  if (Math.abs(z) < threshold) return null;
  return {
    id: randomUUID(),
    kind: 'zscore',
    tableName: table,
    columnName: column,
    observedValue: observed,
    expectedRange: { min: mean - threshold * stddev, max: mean + threshold * stddev },
    zScore: z,
    severity: Math.abs(z) > 4 ? 'critical' : 'warning',
    detectedAt: new Date(),
    message: `${column} = ${observed.toFixed(2)} is ${z.toFixed(2)} σ from mean ${mean.toFixed(2)}`,
  };
}

export function detectIqrAnomalies(
  values: readonly number[],
  observed: number,
  table: string,
  column: string,
  k = 1.5,
): Anomaly | null {
  if (values.length < 10) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  const iqr = q3 - q1;
  const lower = q1 - k * iqr;
  const upper = q3 + k * iqr;
  if (observed >= lower && observed <= upper) return null;
  return {
    id: randomUUID(),
    kind: 'iqr',
    tableName: table,
    columnName: column,
    observedValue: observed,
    expectedRange: { min: lower, max: upper },
    severity: 'warning',
    detectedAt: new Date(),
    message: `${column} = ${observed.toFixed(2)} outside IQR [${lower.toFixed(2)}, ${upper.toFixed(2)}]`,
  };
}
