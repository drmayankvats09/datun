// ═══════════════════════════════════════════════════════════════
// MODULE TELEMETRY — OpenTelemetry-compatible metrics aggregator
// ═══════════════════════════════════════════════════════════════

import type { ModuleResult } from './module.types';

const MODULE_RESULTS: ModuleResult[] = [];

export function recordModuleResult(result: ModuleResult): void {
  MODULE_RESULTS.push(result);
}

export interface ModuleSummaryMetric {
  readonly moduleName: string;
  readonly runs: number;
  readonly totalRecordsCreated: number;
  readonly totalRecordsSkipped: number;
  readonly totalRecordsFailed: number;
  readonly totalDurationMs: number;
  readonly avgDurationMs: number;
  readonly p50DurationMs: number;
  readonly p95DurationMs: number;
  readonly p99DurationMs: number;
  readonly avgMemoryMb: number;
  readonly peakMemoryMb: number;
  readonly successRate: number;
  readonly compensationRate: number;
  readonly avgRecordsPerSec: number;
}

export function getModuleSummary(): readonly ModuleSummaryMetric[] {
  const grouped = new Map<string, ModuleResult[]>();
  for (const r of MODULE_RESULTS) {
    const arr = grouped.get(r.moduleName) ?? [];
    arr.push(r);
    grouped.set(r.moduleName, arr);
  }

  return Array.from(grouped.entries()).map(([name, results]) => {
    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const totalDurationMs = durations.reduce((s, d) => s + d, 0);
    const totalRecordsCreated = results.reduce((s, r) => s + r.recordsCreated, 0);
    const totalRecordsSkipped = results.reduce((s, r) => s + r.recordsSkipped, 0);
    const totalRecordsFailed = results.reduce((s, r) => s + r.recordsFailed, 0);
    const totalCompensated = results.reduce((s, r) => s + r.recordsCompensated, 0);
    const failures = results.filter((r) => r.status === 'FAILED').length;
    const memValues = results.map((r) => r.memoryPeakMb);

    return {
      moduleName: name,
      runs: results.length,
      totalRecordsCreated,
      totalRecordsSkipped,
      totalRecordsFailed,
      totalDurationMs,
      avgDurationMs: totalDurationMs / results.length,
      p50DurationMs: percentile(durations, 50),
      p95DurationMs: percentile(durations, 95),
      p99DurationMs: percentile(durations, 99),
      avgMemoryMb: memValues.reduce((s, m) => s + m, 0) / memValues.length,
      peakMemoryMb: Math.max(...memValues),
      successRate: 1 - failures / results.length,
      compensationRate: totalCompensated / Math.max(1, totalRecordsCreated),
      avgRecordsPerSec: totalDurationMs > 0 ? totalRecordsCreated / (totalDurationMs / 1000) : 0,
    };
  });
}

export function resetModuleMetrics(): void {
  MODULE_RESULTS.length = 0;
}

function percentile(sortedArr: readonly number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))]!;
}

export function exportMetricsJson(): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      datunSeedVersion: '2.0',
      moduleSummary: getModuleSummary(),
    },
    null,
    2,
  );
}
