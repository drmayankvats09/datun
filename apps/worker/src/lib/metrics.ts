// ═══════════════════════════════════════════════════════════════
// WORKER METRICS — Prometheus text format
//
// Why hand-rolled (not prom-client lib): zero dep, ~50 lines, exactly
// what we need. prom-client is overkill at this scale.
//
// Counters tracked:
//   - jobs_processed_total{queue,status}
//   - job_duration_ms_sum{queue}
//   - job_duration_ms_count{queue}
//
// Pattern: Prometheus exposition format spec
// (https://prometheus.io/docs/instrumenting/exposition_formats/)
// ═══════════════════════════════════════════════════════════════

interface QueueCounters {
  processed: number;
  failed: number;
  durationMsSum: number;
  durationMsCount: number;
}

const counters = new Map<string, QueueCounters>();

function getOrCreate(queueName: string): QueueCounters {
  let c = counters.get(queueName);
  if (!c) {
    c = { processed: 0, failed: 0, durationMsSum: 0, durationMsCount: 0 };
    counters.set(queueName, c);
  }
  return c;
}

export function recordJobSuccess(queueName: string, durationMs: number): void {
  const c = getOrCreate(queueName);
  c.processed += 1;
  c.durationMsSum += durationMs;
  c.durationMsCount += 1;
}

export function recordJobFailureMetric(queueName: string, durationMs: number): void {
  const c = getOrCreate(queueName);
  c.failed += 1;
  c.durationMsSum += durationMs;
  c.durationMsCount += 1;
}

/**
 * Render metrics in Prometheus text format.
 * Format spec: HELP, TYPE, then samples; blank lines between metrics.
 */
export function getWorkerMetrics(): string {
  const lines: string[] = [];

  // Worker process metrics
  lines.push('# HELP datun_worker_uptime_seconds Worker process uptime');
  lines.push('# TYPE datun_worker_uptime_seconds gauge');
  lines.push(`datun_worker_uptime_seconds ${Math.floor(process.uptime())}`);
  lines.push('');

  const mem = process.memoryUsage();
  lines.push('# HELP datun_worker_memory_bytes Process memory usage by type');
  lines.push('# TYPE datun_worker_memory_bytes gauge');
  lines.push(`datun_worker_memory_bytes{type="rss"} ${mem.rss}`);
  lines.push(`datun_worker_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);
  lines.push(`datun_worker_memory_bytes{type="heapTotal"} ${mem.heapTotal}`);
  lines.push('');

  // Per-queue counters
  if (counters.size > 0) {
    lines.push('# HELP datun_worker_jobs_total Total jobs processed by queue and status');
    lines.push('# TYPE datun_worker_jobs_total counter');
    for (const [queue, c] of counters) {
      lines.push(`datun_worker_jobs_total{queue="${queue}",status="success"} ${c.processed}`);
      lines.push(`datun_worker_jobs_total{queue="${queue}",status="failed"} ${c.failed}`);
    }
    lines.push('');

    lines.push('# HELP datun_worker_job_duration_ms_sum Sum of job durations in ms');
    lines.push('# TYPE datun_worker_job_duration_ms_sum counter');
    for (const [queue, c] of counters) {
      lines.push(`datun_worker_job_duration_ms_sum{queue="${queue}"} ${c.durationMsSum}`);
    }
    lines.push('');

    lines.push('# HELP datun_worker_job_duration_ms_count Count of jobs measured');
    lines.push('# TYPE datun_worker_job_duration_ms_count counter');
    for (const [queue, c] of counters) {
      lines.push(`datun_worker_job_duration_ms_count{queue="${queue}"} ${c.durationMsCount}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Reset counters — used by tests only */
export function _resetMetricsForTests(): void {
  counters.clear();
}
