// ═══════════════════════════════════════════════════════════════
// BENCH HARNESS — runs perf-bench × N iterations, outputs JSON
// ═══════════════════════════════════════════════════════════════
import { withTestDb } from '../validation/test-helpers';
import { runMainOrchestrator } from '@seeds/modules/orchestrator';
import { writeFileSync } from 'node:fs';

interface BenchIteration {
  iteration: number;
  durationMs: number;
  rowsCreated: number;
  rowsPerSec: number;
  heapPeakMb: number;
}

async function main(): Promise<void> {
  const iterations = Number(process.env.BENCH_ITERATIONS ?? 5);
  const results: BenchIteration[] = [];
  for (let i = 1; i <= iterations; i++) {
    await withTestDb(async ({ prisma }) => {
      const start = performance.now();
      const heapBefore = process.memoryUsage().heapUsed;
      let heapPeak = heapBefore;
      const peakInterval = setInterval(() => {
        heapPeak = Math.max(heapPeak, process.memoryUsage().heapUsed);
      }, 100);

      const result = await runMainOrchestrator({
        prisma,
        env: 'staging',
        scenario: 'load-test',
        masterSeed: 42,
        stopOnError: true,
        compensateOnFailure: true,
      });

      clearInterval(peakInterval);
      const durationMs = Math.round(performance.now() - start);

      // Sum rowsCreated across all module results
      const rowsCreated =
        (
          result as unknown as { moduleResults?: Array<{ recordsCreated?: number }> }
        ).moduleResults?.reduce((s, m) => s + (m.recordsCreated ?? 0), 0) ?? 0;

      results.push({
        iteration: i,
        durationMs,
        rowsCreated,
        rowsPerSec: Math.round((rowsCreated / durationMs) * 1000),
        heapPeakMb: Math.round((heapPeak - heapBefore) / 1024 / 1024),
      });
    });
  }

  const median = (xs: number[]): number =>
    xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
  const p99 = (xs: number[]): number =>
    xs.slice().sort((a, b) => a - b)[Math.floor(xs.length * 0.99)] ?? 0;
  const summary = {
    iterations,
    medianDurationMs: median(results.map((r) => r.durationMs)),
    p99DurationMs: p99(results.map((r) => r.durationMs)),
    medianHeapMb: median(results.map((r) => r.heapPeakMb)),
    medianRowsPerSec: median(results.map((r) => r.rowsPerSec)),
  };
  writeFileSync('./tmp/bench-report.json', JSON.stringify({ results, summary }, null, 2));
  console.table(results);
  console.log('SUMMARY:', summary);
}

if (require.main === module) main().catch(console.error);
