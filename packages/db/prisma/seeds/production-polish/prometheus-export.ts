// ═══════════════════════════════════════════════════════════════
// PROMETHEUS EXPORTER — text-format metrics for /metrics scrape
// ═══════════════════════════════════════════════════════════════

import { getModuleSummary } from '../modules/core/telemetry';

export function exportPrometheusMetrics(): string {
  const lines: string[] = [];
  const summary = getModuleSummary();

  lines.push('# HELP datun_seed_module_records_created_total Total records created per module');
  lines.push('# TYPE datun_seed_module_records_created_total counter');
  for (const m of summary) {
    lines.push(
      `datun_seed_module_records_created_total{module="${m.moduleName}"} ${m.totalRecordsCreated}`,
    );
  }

  lines.push('# HELP datun_seed_module_duration_ms_p95 p95 module duration');
  lines.push('# TYPE datun_seed_module_duration_ms_p95 gauge');
  for (const m of summary) {
    lines.push(
      `datun_seed_module_duration_ms_p95{module="${m.moduleName}"} ${m.p95DurationMs.toFixed(2)}`,
    );
  }

  lines.push('# HELP datun_seed_module_success_rate Success rate per module');
  lines.push('# TYPE datun_seed_module_success_rate gauge');
  for (const m of summary) {
    lines.push(
      `datun_seed_module_success_rate{module="${m.moduleName}"} ${m.successRate.toFixed(4)}`,
    );
  }

  lines.push('# HELP datun_seed_module_records_per_second Throughput per module');
  lines.push('# TYPE datun_seed_module_records_per_second gauge');
  for (const m of summary) {
    lines.push(
      `datun_seed_module_records_per_second{module="${m.moduleName}"} ${m.avgRecordsPerSec.toFixed(2)}`,
    );
  }

  return `${lines.join('\n')}\n`;
}
