// ═══════════════════════════════════════════════════════════════
// DATA QUALITY ORCHESTRATOR
//
// Single entry point for the full quality sweep.
// Composes: contracts → expectations → soda → anomalies → SLOs.
// ═══════════════════════════════════════════════════════════════

import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { validateContract, ALL_CONTRACTS } from './contracts';
import type { DataContract, ContractViolation } from './contracts';
import { runAllExpectations, type ExpectationSuiteResult } from './expectations/expectation-runner';
import { runSodaScan, type SodaScanResult } from './soda/soda-runner';
import { detectZScoreAnomalies, detectIqrAnomalies } from './anomaly/statistical-detector';
import { chiSquaredShift } from './anomaly/categorical-detector';
import { AnomalyStore } from './anomaly/anomaly-store';
import type { Anomaly } from './anomaly/anomaly.types';
import { evaluateAllSlos } from './slo/slo-evaluator';
import { ALL_SLOS } from './slo/datun-slos';
import type { SloStatus } from './slo/slo.types';

export type LayerVerdict = 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';

export interface LayerSummary {
  readonly verdict: LayerVerdict;
  readonly durationMs: number;
  readonly findingsCount: number;
  readonly errorMessage?: string;
}

export interface ContractCheckResult {
  readonly contract: DataContract;
  readonly violations: readonly ContractViolation[];
}

export interface OrchestratorReport {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly totalDurationMs: number;
  readonly overallVerdict: LayerVerdict;
  readonly layerSummaries: {
    readonly contracts: LayerSummary;
    readonly expectations: LayerSummary;
    readonly soda: LayerSummary;
    readonly anomalies: LayerSummary;
    readonly slos: LayerSummary;
  };
  readonly contracts: readonly ContractCheckResult[];
  readonly expectations: ExpectationSuiteResult;
  readonly soda: SodaScanResult | null;
  readonly anomalies: readonly Anomaly[];
  readonly slos: readonly SloStatus[];
  readonly criticalFindings: readonly string[];
}

export interface OrchestratorOptions {
  readonly prisma: PrismaClient;
  /** Skip Soda scan (default true — Soda needs Python toolchain). */
  readonly runSoda?: boolean;
  /** Persist detected anomalies to DataQualityAnomaly table. */
  readonly persistAnomalies?: boolean;
  /** Throw if overallVerdict === FAIL (CI gate mode). */
  readonly strict?: boolean;
  /** Soda config + checks file paths (only used if runSoda). */
  readonly sodaConfigPath?: string;
  readonly sodaChecksPath?: string;
}

function timeIt<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const t0 = Date.now();
  return fn().then((value) => ({ value, durationMs: Date.now() - t0 }));
}

export async function runDataQualityOrchestration(
  opts: OrchestratorOptions,
): Promise<OrchestratorReport> {
  const runId = `dq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date();
  const t0 = Date.now();
  logger.info({ runId }, 'Data quality orchestration started');

  // ─── Layer 1: Contracts ─────────────────────────────────────
  let contractsOut: ContractCheckResult[] = [];
  let contractsSummary: LayerSummary = {
    verdict: 'SKIPPED',
    durationMs: 0,
    findingsCount: 0,
  };
  try {
    const { value, durationMs } = await timeIt(async () => {
      const results: ContractCheckResult[] = [];
      for (const contract of ALL_CONTRACTS) {
        const violations = await validateContract(opts.prisma, contract);
        results.push({ contract, violations });
      }
      return results;
    });
    contractsOut = value;
    const totalViolations = value.reduce((s, r) => s + r.violations.length, 0);
    const hasCritical = value.some((r) =>
      r.violations.some((v) => v.severity === 'critical' || v.severity === 'error'),
    );
    const hasWarning = value.some((r) => r.violations.some((v) => v.severity === 'warning'));
    contractsSummary = {
      verdict: hasCritical ? 'FAIL' : hasWarning ? 'WARN' : 'PASS',
      durationMs,
      findingsCount: totalViolations,
    };
  } catch (err) {
    contractsSummary = {
      verdict: 'FAIL',
      durationMs: 0,
      findingsCount: 0,
      errorMessage: (err as Error).message,
    };
    logger.error({ err, runId }, 'Contracts layer threw');
  }

  // ─── Layer 2: Expectations ──────────────────────────────────
  let expectationsOut: ExpectationSuiteResult = {
    results: [],
    summary: { total: 0, passed: 0, failed: 0, criticalFailures: 0, totalDurationMs: 0 },
  };
  let expectationsSummary: LayerSummary = {
    verdict: 'SKIPPED',
    durationMs: 0,
    findingsCount: 0,
  };
  try {
    const { value, durationMs } = await timeIt(() => runAllExpectations(opts.prisma));
    expectationsOut = value;
    expectationsSummary = {
      verdict:
        value.summary.criticalFailures > 0 ? 'FAIL' : value.summary.failed > 0 ? 'WARN' : 'PASS',
      durationMs,
      findingsCount: value.summary.failed,
    };
  } catch (err) {
    expectationsSummary = {
      verdict: 'FAIL',
      durationMs: 0,
      findingsCount: 0,
      errorMessage: (err as Error).message,
    };
    logger.error({ err, runId }, 'Expectations layer threw');
  }

  // ─── Layer 3: Soda ──────────────────────────────────────────
  let sodaOut: SodaScanResult | null = null;
  let sodaSummary: LayerSummary = {
    verdict: 'SKIPPED',
    durationMs: 0,
    findingsCount: 0,
  };
  if (opts.runSoda === true) {
    try {
      const dataSource = process.env.SODA_DATA_SOURCE ?? 'datun_postgres';
      const checksFile =
        opts.sodaChecksPath ??
        path.join(
          process.cwd(),
          'packages/db/prisma/seeds/data-quality/soda/checks-consultation.yml',
        );
      const { value, durationMs } = await timeIt(() =>
        opts.sodaConfigPath
          ? runSodaScan(dataSource, checksFile, opts.sodaConfigPath)
          : runSodaScan(dataSource, checksFile),
      );
      sodaOut = value;
      sodaSummary = {
        verdict: value.hasCritical ? 'FAIL' : value.hasFailures ? 'WARN' : 'PASS',
        durationMs,
        findingsCount: value.checks.filter((c) => c.outcome !== 'pass').length,
      };
    } catch (err) {
      sodaSummary = {
        verdict: 'FAIL',
        durationMs: 0,
        findingsCount: 0,
        errorMessage: (err as Error).message,
      };
      logger.error({ err, runId }, 'Soda layer threw');
    }
  }

  // ─── Layer 4: Anomalies ─────────────────────────────────────
  // Real detector API: detectZScore(values, observed, table, column, threshold) → Anomaly | null
  // Strategy: pull baseline values + today's representative value, then call.
  const anomalies: Anomaly[] = [];
  let anomaliesSummary: LayerSummary = {
    verdict: 'SKIPPED',
    durationMs: 0,
    findingsCount: 0,
  };
  try {
    const { durationMs } = await timeIt(async () => {
      // Consultation latency anomaly (aiLatencyMs)
      const today = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const baselineRows = await opts.prisma.consultation.findMany({
        where: { aiLatencyMs: { not: null }, createdAt: { lt: today } },
        select: { aiLatencyMs: true },
        take: 5_000,
      });
      const todayRows = await opts.prisma.consultation.findMany({
        where: { aiLatencyMs: { not: null }, createdAt: { gte: today } },
        select: { aiLatencyMs: true },
        take: 5_000,
      });
      const baseline = baselineRows
        .map((r) => r.aiLatencyMs)
        .filter((v): v is number => typeof v === 'number');
      const todayValues = todayRows
        .map((r) => r.aiLatencyMs)
        .filter((v): v is number => typeof v === 'number');
      if (baseline.length >= 50 && todayValues.length >= 5) {
        const observedMean = todayValues.reduce((s, v) => s + v, 0) / todayValues.length;
        const zResult = detectZScoreAnomalies(
          baseline,
          observedMean,
          'consultation',
          'aiLatencyMs',
        );
        if (zResult) anomalies.push(zResult);
        const iqrResult = detectIqrAnomalies(baseline, observedMean, 'consultation', 'aiLatencyMs');
        if (iqrResult) anomalies.push(iqrResult);
      }

      // Categorical: language shift on consultation (real field name is `language`, not `preferredLocale`)
      const todayLangs = await opts.prisma.consultation.groupBy({
        by: ['language'],
        _count: true,
        where: { createdAt: { gte: today } },
      });
      const baselineLangs = await opts.prisma.consultation.groupBy({
        by: ['language'],
        _count: true,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lt: today,
          },
        },
      });
      if (todayLangs.length > 0 && baselineLangs.length > 0) {
        const baselineMap: Record<string, number> = {};
        for (const r of baselineLangs) baselineMap[r.language] = r._count;
        const observedMap: Record<string, number> = {};
        for (const r of todayLangs) observedMap[r.language] = r._count;
        const shift = chiSquaredShift(baselineMap, observedMap, 'consultation', 'language');
        if (shift) anomalies.push(shift);
      }
    });
    if (opts.persistAnomalies && anomalies.length > 0) {
      const store = new AnomalyStore(opts.prisma);
      for (const a of anomalies) await store.record(a);
    }
    anomaliesSummary = {
      verdict: anomalies.some((a) => a.severity === 'critical')
        ? 'FAIL'
        : anomalies.length > 0
          ? 'WARN'
          : 'PASS',
      durationMs,
      findingsCount: anomalies.length,
    };
  } catch (err) {
    anomaliesSummary = {
      verdict: 'FAIL',
      durationMs: 0,
      findingsCount: 0,
      errorMessage: (err as Error).message,
    };
    logger.error({ err, runId }, 'Anomalies layer threw');
  }

  // ─── Layer 5: SLOs ──────────────────────────────────────────
  let slosOut: readonly SloStatus[] = [];
  let slosSummary: LayerSummary = {
    verdict: 'SKIPPED',
    durationMs: 0,
    findingsCount: 0,
  };
  try {
    const { value, durationMs } = await timeIt(() => evaluateAllSlos(opts.prisma, ALL_SLOS));
    slosOut = value;
    const breaches = value.filter((s) => s.status === 'breached').length;
    const warnings = value.filter((s) => s.status === 'at-risk').length;
    slosSummary = {
      verdict: breaches > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'PASS',
      durationMs,
      findingsCount: breaches + warnings,
    };
  } catch (err) {
    slosSummary = {
      verdict: 'FAIL',
      durationMs: 0,
      findingsCount: 0,
      errorMessage: (err as Error).message,
    };
    logger.error({ err, runId }, 'SLO layer threw');
  }

  // ─── Aggregate ──────────────────────────────────────────────
  const allLayers = [
    contractsSummary,
    expectationsSummary,
    sodaSummary,
    anomaliesSummary,
    slosSummary,
  ];
  const overallVerdict: LayerVerdict = allLayers.some((l) => l.verdict === 'FAIL')
    ? 'FAIL'
    : allLayers.some((l) => l.verdict === 'WARN')
      ? 'WARN'
      : 'PASS';

  const criticalFindings: string[] = [];
  for (const c of contractsOut) {
    for (const v of c.violations) {
      if (v.severity === 'critical' || v.severity === 'error') {
        criticalFindings.push(`contract:${c.contract.tableName}: ${v.message}`);
      }
    }
  }
  for (const e of expectationsOut.results) {
    if (!e.passed && (e.severity === 'critical' || e.severity === 'error')) {
      criticalFindings.push(`expectation:${e.name}: ${e.message}`);
    }
  }
  for (const a of anomalies) {
    if (a.severity === 'critical') {
      criticalFindings.push(`anomaly:${a.tableName}.${a.columnName}: ${a.message}`);
    }
  }
  if (sodaOut?.hasCritical) {
    criticalFindings.push(
      `soda: ${sodaOut.checks.filter((c) => c.outcome === 'fail').length} critical checks failed`,
    );
  }

  const finishedAt = new Date();
  const totalDurationMs = Date.now() - t0;

  const report: OrchestratorReport = {
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totalDurationMs,
    overallVerdict,
    layerSummaries: {
      contracts: contractsSummary,
      expectations: expectationsSummary,
      soda: sodaSummary,
      anomalies: anomaliesSummary,
      slos: slosSummary,
    },
    contracts: contractsOut,
    expectations: expectationsOut,
    soda: sodaOut,
    anomalies,
    slos: slosOut,
    criticalFindings,
  };

  logger.info(
    {
      runId,
      overallVerdict,
      totalDurationMs,
      criticalFindings: criticalFindings.length,
    },
    'Data quality orchestration complete',
  );

  if (opts.strict && overallVerdict === 'FAIL') {
    throw new Error(
      `Data quality orchestration FAILED with ${criticalFindings.length} critical findings`,
    );
  }

  return report;
}
