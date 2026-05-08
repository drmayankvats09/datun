// ═══════════════════════════════════════════════════════════════
// BASELINE COMPARISON — pin a baseline, fail if new run regresses >X%
// Source: Netflix Mantis pattern + Vercel Speed Insights baselines
// ═══════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_FILE = './packages/db/tmp/bench-baseline.json';

export interface BenchBaseline {
  capturedAt: string;
  gitSha?: string;
  metrics: Record<string, { medianMs: number; p99Ms: number; rowsPerSec: number }>;
}

export interface RegressionReport {
  passed: boolean;
  regressions: Array<{ metric: string; baseline: number; observed: number; deltaPct: number }>;
  improvements: Array<{ metric: string; baseline: number; observed: number; deltaPct: number }>;
}

const REGRESSION_THRESHOLD_PCT = 15; // fail if >15% slower than baseline

export function loadBaseline(): BenchBaseline | null {
  if (!existsSync(BASELINE_FILE)) return null;
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as BenchBaseline;
}

export function saveBaseline(b: BenchBaseline): void {
  writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 2));
}

export function compareToBaseline(observed: BenchBaseline): RegressionReport {
  const baseline = loadBaseline();
  if (!baseline) return { passed: true, regressions: [], improvements: [] };
  const regressions: RegressionReport['regressions'] = [];
  const improvements: RegressionReport['improvements'] = [];
  for (const [metric, obs] of Object.entries(observed.metrics)) {
    const base = baseline.metrics[metric];
    if (!base) continue;
    const deltaPct = ((obs.medianMs - base.medianMs) / base.medianMs) * 100;
    if (deltaPct > REGRESSION_THRESHOLD_PCT) {
      regressions.push({
        metric,
        baseline: base.medianMs,
        observed: obs.medianMs,
        deltaPct: Math.round(deltaPct * 10) / 10,
      });
    } else if (deltaPct < -10) {
      improvements.push({
        metric,
        baseline: base.medianMs,
        observed: obs.medianMs,
        deltaPct: Math.round(deltaPct * 10) / 10,
      });
    }
  }
  return { passed: regressions.length === 0, regressions, improvements };
}
