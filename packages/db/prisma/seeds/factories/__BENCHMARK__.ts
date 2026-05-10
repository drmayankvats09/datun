// ═══════════════════════════════════════════════════════════════
// WAVE 3 v2 BENCHMARK — Validates factory performance claims
// Run: pnpm tsx packages/db/prisma/seeds/factories/__BENCHMARK__.ts
// ═══════════════════════════════════════════════════════════════

import { performance } from 'node:perf_hooks';
import { resetSequences } from './core/sequence';
import { resetAllMetrics, getAllMetrics } from './core/telemetry';
import { patientFactory } from './patient/patient.factory';
import { consultationFactory } from './clinical/consultation.factory';
import { appointmentFactory } from './operational/appointment.factory';

interface BenchResult {
  readonly factory: string;
  readonly count: number;
  readonly totalMs: number;
  readonly opsPerSec: number;
  readonly avgMs: number;
}

async function bench(name: string, count: number, fn: () => void): Promise<BenchResult> {
  const start = performance.now();
  for (let i = 0; i < count; i++) fn();
  const totalMs = performance.now() - start;
  return {
    factory: name,
    count,
    totalMs,
    opsPerSec: count / (totalMs / 1000),
    avgMs: totalMs / count,
  };
}

async function main() {
  console.log('🏁 Wave 3 v2 Factory Benchmark');
  console.log('═══════════════════════════════════════════════════════════════');

  resetSequences(42);
  resetAllMetrics();

  const results: BenchResult[] = [];

  results.push(
    await bench('patient.build', 1000, () => {
      patientFactory.build();
    }),
  );

  results.push(
    await bench('consultation.build', 1000, () => {
      consultationFactory.build(undefined, { patientId: 'p-test' });
    }),
  );

  results.push(
    await bench('appointment.build', 1000, () => {
      appointmentFactory.build(undefined, { patientId: 'p-test', clinicId: 'c-test' });
    }),
  );

  console.log('\n📊 Results:');
  console.log('Factory                  | Count  | Total(ms) | Ops/sec   | Avg(ms)');
  console.log('-'.repeat(75));
  for (const r of results) {
    console.log(
      `${r.factory.padEnd(24)} | ${String(r.count).padStart(6)} | ${r.totalMs.toFixed(2).padStart(9)} | ${r.opsPerSec.toFixed(0).padStart(9)} | ${r.avgMs.toFixed(3).padStart(7)}`,
    );
  }

  console.log('\n📈 Telemetry from getAllMetrics():');
  console.table(
    getAllMetrics().map((m) => ({
      name: m.factoryName,
      count: m.count,
      avgMs: m.avgMs.toFixed(2),
      p95Ms: m.p95Ms.toFixed(2),
      p99Ms: m.p99Ms.toFixed(2),
    })),
  );

  console.log('\n✅ Benchmark complete');
}

main().catch((e) => {
  console.error('❌ Benchmark failed:', e);
  process.exit(1);
});
