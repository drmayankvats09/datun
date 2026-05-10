// ═══════════════════════════════════════════════════════════════
// DATA QUALITY SCORECARD
//
// Generates per-table scorecard from OrchestratorReport.
// ═══════════════════════════════════════════════════════════════

import type { OrchestratorReport, ContractCheckResult } from './orchestrator';

export interface TableScorecard {
  readonly table: string;
  readonly composite: number;
  readonly layers: {
    readonly validity: number;
    readonly consistency: number;
    readonly anomalyHealth: number;
    readonly sloHealth: number;
  };
  readonly signal: 'green' | 'yellow' | 'red';
  readonly topIssues: readonly string[];
}

export interface Scorecard {
  readonly generatedAt: string;
  readonly runId: string;
  readonly overallScore: number;
  readonly tables: readonly TableScorecard[];
}

const SIGNAL_THRESHOLDS = { green: 90, yellow: 70 } as const;

function classify(score: number): 'green' | 'yellow' | 'red' {
  if (score >= SIGNAL_THRESHOLDS.green) return 'green';
  if (score >= SIGNAL_THRESHOLDS.yellow) return 'yellow';
  return 'red';
}

function mean(arr: readonly number[]): number {
  if (arr.length === 0) return 100;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function generateScorecard(report: OrchestratorReport): Scorecard {
  const tableNames = new Set<string>();
  for (const c of report.contracts) tableNames.add(c.contract.tableName);
  for (const a of report.anomalies) tableNames.add(a.tableName);
  // ExpectationResult has no tableName — pull from violatingRowIds context if possible (skip for now).

  const tables: TableScorecard[] = [];
  for (const table of tableNames) {
    const tableContracts: ContractCheckResult[] = report.contracts.filter(
      (c) => c.contract.tableName === table,
    );
    const tableAnomalies = report.anomalies.filter((a) => a.tableName === table);

    // Validity: 1 - (violation count / fields × contracts)
    let validity = 100;
    {
      const totalChecks = tableContracts.reduce(
        (s, r) =>
          s +
          r.contract.fields.length +
          (r.contract.freshness ? 1 : 0) +
          (r.contract.volume ? 1 : 0),
        0,
      );
      const totalViolations = tableContracts.reduce((s, r) => s + r.violations.length, 0);
      validity = totalChecks === 0 ? 100 : 100 * Math.max(0, 1 - totalViolations / totalChecks);
    }

    // Consistency: each contract's severity-weighted violation share
    const consistency = mean(
      tableContracts.map((r) => {
        if (r.violations.length === 0) return 100;
        const weight = r.violations.reduce(
          (s, v) =>
            s +
            (v.severity === 'critical'
              ? 1
              : v.severity === 'error'
                ? 0.7
                : v.severity === 'warning'
                  ? 0.3
                  : 0.1),
          0,
        );
        return Math.max(0, 100 - weight * 20);
      }),
    );

    // Anomaly health: 100 if none, else inverse of severity-weighted count
    const anomalyHealth =
      tableAnomalies.length === 0
        ? 100
        : Math.max(
            0,
            100 -
              tableAnomalies.reduce(
                (s, a) => s + (a.severity === 'critical' ? 30 : a.severity === 'warning' ? 15 : 5),
                0,
              ),
          );

    // SLO health: arbitrary mapping from state
    const slos = report.slos.filter(() => false); // SloStatus has no tableName field; skipped per-table
    const sloHealth = slos.length === 0 ? 100 : 100;

    const layers = { validity, consistency, anomalyHealth, sloHealth };
    const composite = mean(Object.values(layers));

    const topIssues: string[] = [];
    for (const c of tableContracts) {
      for (const v of c.violations.slice(0, 3)) topIssues.push(`contract: ${v.message}`);
    }
    for (const a of tableAnomalies.slice(0, 3)) {
      topIssues.push(`anomaly: ${a.message}`);
    }

    tables.push({
      table,
      composite: Math.round(composite * 10) / 10,
      layers: {
        validity: Math.round(validity * 10) / 10,
        consistency: Math.round(consistency * 10) / 10,
        anomalyHealth: Math.round(anomalyHealth * 10) / 10,
        sloHealth: Math.round(sloHealth * 10) / 10,
      },
      signal: classify(composite),
      topIssues: topIssues.slice(0, 5),
    });
  }

  const overallScore =
    tables.length === 0 ? 100 : Math.round(mean(tables.map((t) => t.composite)) * 10) / 10;

  return {
    generatedAt: report.finishedAt,
    runId: report.runId,
    overallScore,
    tables: tables.sort((a, b) => a.composite - b.composite),
  };
}
