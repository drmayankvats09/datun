// ═══════════════════════════════════════════════════════════════
// DRIFT ORCHESTRATOR
//
// Composes input + concept drift detection into a single call.
// Used by:
//   - apps/worker/src/processors/drift-check-hourly.processor.ts
//   - .github/workflows/ct-drift-hourly.yml
//   - pnpm drift:detect via CLI wrapper
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { detectAgeDrift } from './input-drift';
import { detectUrgencyDistributionDrift } from './concept-drift';
import { DriftStore } from './drift-store';
import type { DriftAlert, DriftKind } from './drift.types';

export type OrchestratorVerdict = 'OK' | 'WARN' | 'CRITICAL' | 'ERROR';

export interface DriftLayerSummary {
  readonly verdict: OrchestratorVerdict;
  readonly durationMs: number;
  readonly alertsCount: number;
  readonly errorMessage?: string;
}

export interface DriftOrchestratorReport {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly totalDurationMs: number;
  readonly overallVerdict: OrchestratorVerdict;
  readonly layerSummaries: {
    readonly inputDrift: DriftLayerSummary;
    readonly conceptDrift: DriftLayerSummary;
  };
  readonly alerts: readonly DriftAlert[];
  readonly criticalAlerts: readonly string[];
}

export interface DriftOrchestratorOptions {
  readonly prisma: PrismaClient;
  /** Baseline window in days. Default 30. */
  readonly baselineDays?: number;
  /** Current/comparison window in days. Default 7. */
  readonly comparisonDays?: number;
  /** Persist alerts to DriftAlert table. Default true. */
  readonly persistAlerts?: boolean;
  /** Throw if overallVerdict === CRITICAL. Default false. */
  readonly strict?: boolean;
}

function classifyVerdict(alerts: readonly DriftAlert[]): OrchestratorVerdict {
  if (alerts.some((a) => a.severity === 'critical')) return 'CRITICAL';
  if (alerts.some((a) => a.severity === 'warning')) return 'WARN';
  return 'OK';
}

function timeIt<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const t0 = Date.now();
  return fn().then((value) => ({ value, durationMs: Date.now() - t0 }));
}

export async function runDriftOrchestration(
  opts: DriftOrchestratorOptions,
): Promise<DriftOrchestratorReport> {
  const runId = `drift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date();
  const t0 = Date.now();
  const baselineDays = opts.baselineDays ?? 30;
  const comparisonDays = opts.comparisonDays ?? 7;

  logger.info(
    { runId, baselineDays, comparisonDays, persistAlerts: opts.persistAlerts ?? true },
    'Drift orchestration started',
  );

  const allAlerts: DriftAlert[] = [];

  // ─── Layer 1: Input drift ────────────────────────────────────
  let inputDriftSummary: DriftLayerSummary = { verdict: 'OK', durationMs: 0, alertsCount: 0 };
  try {
    const { value, durationMs } = await timeIt(() =>
      detectAgeDrift(opts.prisma, baselineDays, comparisonDays),
    );
    if (value) allAlerts.push(value);
    inputDriftSummary = {
      verdict: value ? classifyVerdict([value]) : 'OK',
      durationMs,
      alertsCount: value ? 1 : 0,
    };
  } catch (err) {
    inputDriftSummary = {
      verdict: 'ERROR',
      durationMs: 0,
      alertsCount: 0,
      errorMessage: (err as Error).message,
    };
    logger.error({ err, runId }, 'Input drift layer threw');
  }

  // ─── Layer 2: Concept drift ──────────────────────────────────
  let conceptDriftSummary: DriftLayerSummary = { verdict: 'OK', durationMs: 0, alertsCount: 0 };
  try {
    const { value, durationMs } = await timeIt(() =>
      detectUrgencyDistributionDrift(opts.prisma, baselineDays, comparisonDays),
    );
    if (value) allAlerts.push(value);
    conceptDriftSummary = {
      verdict: value ? classifyVerdict([value]) : 'OK',
      durationMs,
      alertsCount: value ? 1 : 0,
    };
  } catch (err) {
    conceptDriftSummary = {
      verdict: 'ERROR',
      durationMs: 0,
      alertsCount: 0,
      errorMessage: (err as Error).message,
    };
    logger.error({ err, runId }, 'Concept drift layer threw');
  }

  // ─── Persist (DriftStore.record() is the real method name) ──
  if ((opts.persistAlerts ?? true) && allAlerts.length > 0) {
    try {
      const store = new DriftStore(opts.prisma);
      for (const alert of allAlerts) await store.record(alert);
    } catch (err) {
      logger.error({ err, runId }, 'Failed to persist drift alerts');
    }
  }

  // ─── Aggregate ───────────────────────────────────────────────
  const overallVerdict: OrchestratorVerdict = [
    inputDriftSummary.verdict,
    conceptDriftSummary.verdict,
  ].includes('ERROR')
    ? 'ERROR'
    : classifyVerdict(allAlerts);

  // DriftAlert has actionRequired (not message)
  const criticalAlerts = allAlerts
    .filter((a) => a.severity === 'critical')
    .map((a) => `${a.kind}/${a.metric}: ${a.actionRequired}`);

  const report: DriftOrchestratorReport = {
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - t0,
    overallVerdict,
    layerSummaries: { inputDrift: inputDriftSummary, conceptDrift: conceptDriftSummary },
    alerts: allAlerts,
    criticalAlerts,
  };

  logger.info(
    {
      runId,
      overallVerdict,
      totalDurationMs: report.totalDurationMs,
      alertsCount: allAlerts.length,
      criticalAlerts: criticalAlerts.length,
    },
    'Drift orchestration complete',
  );

  if (opts.strict && overallVerdict === 'CRITICAL') {
    throw new Error(
      `Drift orchestration CRITICAL — ${criticalAlerts.length} critical alerts: ${criticalAlerts.join('; ')}`,
    );
  }

  return report;
}

export async function runSingleDriftKind(
  prisma: PrismaClient,
  kind: DriftKind,
  baselineDays = 30,
  comparisonDays = 7,
): Promise<DriftAlert | null> {
  switch (kind) {
    case 'input':
      return detectAgeDrift(prisma, baselineDays, comparisonDays);
    case 'concept':
      return detectUrgencyDistributionDrift(prisma, baselineDays, comparisonDays);
    default:
      throw new Error(`Unknown drift kind: ${kind}`);
  }
}
