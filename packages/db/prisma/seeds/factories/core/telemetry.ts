// ═══════════════════════════════════════════════════════════════
// TELEMETRY — Aggregate metrics across factory + module runs
// Output format compatible with OpenTelemetry/Datadog ingestion.
// ═══════════════════════════════════════════════════════════════

interface FactoryMetric {
  readonly factoryName: string;
  readonly count: number;
  readonly totalMs: number;
  readonly avgMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly errorCount: number;
}

const allDurations = new Map<string, number[]>();
const errorCounts = new Map<string, number>();

export function recordFactoryRun(name: string, durationMs: number, success: boolean = true): void {
  const arr = allDurations.get(name) ?? [];
  arr.push(durationMs);
  allDurations.set(name, arr);
  if (!success) {
    errorCounts.set(name, (errorCounts.get(name) ?? 0) + 1);
  }
}

export function getMetricsForFactory(name: string): FactoryMetric | null {
  const durations = allDurations.get(name);
  if (!durations || durations.length === 0) return null;

  const sorted = [...durations].sort((a, b) => a - b);
  const total = durations.reduce((s, d) => s + d, 0);

  return {
    factoryName: name,
    count: durations.length,
    totalMs: total,
    avgMs: total / durations.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    errorCount: errorCounts.get(name) ?? 0,
  };
}

export function getAllMetrics(): readonly FactoryMetric[] {
  return Array.from(allDurations.keys())
    .map((name) => getMetricsForFactory(name))
    .filter((m): m is FactoryMetric => m !== null);
}

export function resetAllMetrics(): void {
  allDurations.clear();
  errorCounts.clear();
}

function percentile(sortedArr: readonly number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))]!;
}

/** Export for OpenTelemetry-compatible JSON */
export function exportMetricsJson(): string {
  const metrics = getAllMetrics();
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      datunSeedVersion: '2.0',
      metrics,
    },
    null,
    2,
  );
}
