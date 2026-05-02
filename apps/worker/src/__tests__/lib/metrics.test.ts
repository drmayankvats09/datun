// ═══════════════════════════════════════════════════════════════
// WORKER METRICS TESTS — Prometheus format compliance
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordJobSuccess,
  recordJobFailureMetric,
  getWorkerMetrics,
  _resetMetricsForTests,
} from '../../lib/metrics.js';

describe('Worker metrics', () => {
  beforeEach(() => {
    _resetMetricsForTests();
  });

  it('renders empty metrics with process info only', () => {
    const out = getWorkerMetrics();
    expect(out).toContain('datun_worker_uptime_seconds');
    expect(out).toContain('datun_worker_memory_bytes');
    expect(out).not.toContain('datun_worker_jobs_total');
  });

  it('records success counters per queue', () => {
    recordJobSuccess('whatsapp', 100);
    recordJobSuccess('whatsapp', 200);
    recordJobSuccess('email', 50);

    const out = getWorkerMetrics();
    expect(out).toContain('datun_worker_jobs_total{queue="whatsapp",status="success"} 2');
    expect(out).toContain('datun_worker_jobs_total{queue="email",status="success"} 1');
  });

  it('records failure counters separately', () => {
    recordJobSuccess('pdf', 1500);
    recordJobFailureMetric('pdf', 800);

    const out = getWorkerMetrics();
    expect(out).toContain('datun_worker_jobs_total{queue="pdf",status="success"} 1');
    expect(out).toContain('datun_worker_jobs_total{queue="pdf",status="failed"} 1');
  });

  it('accumulates duration sums', () => {
    recordJobSuccess('email', 100);
    recordJobSuccess('email', 150);

    const out = getWorkerMetrics();
    expect(out).toContain('datun_worker_job_duration_ms_sum{queue="email"} 250');
    expect(out).toContain('datun_worker_job_duration_ms_count{queue="email"} 2');
  });

  it('output ends with newline-friendly format (HELP/TYPE pairs)', () => {
    recordJobSuccess('scheduled', 10);
    const out = getWorkerMetrics();
    const helpLines = out.split('\n').filter((l) => l.startsWith('# HELP'));
    const typeLines = out.split('\n').filter((l) => l.startsWith('# TYPE'));
    expect(helpLines.length).toBe(typeLines.length);
  });
});
