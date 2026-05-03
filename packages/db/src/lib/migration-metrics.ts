/**
 * Migration Metrics — Prometheus instrumentation for migration events.
 *
 * Exposes counters, histograms, and gauges that show up at:
 *   - GET /internal/metrics (api service)
 *   - GET /metrics (worker service, internal port)
 *
 * Designed for Grafana dashboards (Year 2 roadmap).
 *
 * Naming follows Prometheus conventions:
 *   - _total suffix for monotonic counters
 *   - _seconds suffix for time-based histograms
 *   - service prefix `datun_migration_`
 */

import { Counter, Histogram, Gauge, register } from 'prom-client';

/** Total migrations applied successfully, partitioned by source. */
export const migrationsAppliedTotal = new Counter({
  name: 'datun_migration_applied_total',
  help: 'Total successful migrations applied',
  labelNames: ['source'] as const,
  registers: [register],
});

/** Total migration failures, partitioned by source. */
export const migrationsFailedTotal = new Counter({
  name: 'datun_migration_failed_total',
  help: 'Total migration failures',
  labelNames: ['source'] as const,
  registers: [register],
});

/** Distribution of migration durations in seconds. */
export const migrationDurationSeconds = new Histogram({
  name: 'datun_migration_duration_seconds',
  help: 'Migration apply duration in seconds',
  labelNames: ['source'] as const,
  // Buckets aligned to expected migration sizes:
  //   <100ms small additive, <1s typical, <10s schema-wide, >10s baseline
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 300],
  registers: [register],
});

/** Current count of pending (unapplied) migrations on this node. */
export const pendingMigrationsGauge = new Gauge({
  name: 'datun_migration_pending_count',
  help: 'Number of pending migrations',
  registers: [register],
});

/** 1 if drift was detected on the last health check, 0 otherwise. */
export const driftDetectedGauge = new Gauge({
  name: 'datun_migration_drift_detected',
  help: '1 if schema drift detected, 0 otherwise',
  registers: [register],
});

/**
 * Record a successful migration apply.
 * Called from migration scripts after `prisma migrate deploy` returns.
 */
export function recordMigrationSuccess(source: string, durationMs: number): void {
  migrationsAppliedTotal.inc({ source });
  migrationDurationSeconds.observe({ source }, durationMs / 1000);
}

/** Record a failed migration apply. */
export function recordMigrationFailure(source: string, durationMs: number): void {
  migrationsFailedTotal.inc({ source });
  migrationDurationSeconds.observe({ source }, durationMs / 1000);
}

/** Update the gauges from a fresh health check. */
export function updateHealthGauges(pendingCount: number, driftDetected: boolean): void {
  pendingMigrationsGauge.set(pendingCount);
  driftDetectedGauge.set(driftDetected ? 1 : 0);
}

/**
 * Render all migration metrics in Prometheus text format.
 * The /internal/metrics endpoint composes this with other registries.
 */
export async function renderMigrationMetrics(): Promise<string> {
  return register.metrics();
}
