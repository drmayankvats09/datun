// ═══════════════════════════════════════════════════════════════
// SLO MONITOR — track latencies, enforce budgets, alert on breach
// ═══════════════════════════════════════════════════════════════
export interface LatencyBudget {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRatePct: number;
}

export interface SloReport {
  module: string;
  observedP50: number;
  observedP95: number;
  observedP99: number;
  observedErrorRate: number;
  budgetBreached: boolean;
  breaches: string[];
}

export class SloMonitor {
  private latencies = new Map<string, number[]>();
  private errors = new Map<string, number>();
  private totals = new Map<string, number>();

  record(module: string, latencyMs: number, isError = false): void {
    const arr = this.latencies.get(module) ?? [];
    arr.push(latencyMs);
    this.latencies.set(module, arr);
    this.totals.set(module, (this.totals.get(module) ?? 0) + 1);
    if (isError) this.errors.set(module, (this.errors.get(module) ?? 0) + 1);
  }

  evaluate(module: string, budget: LatencyBudget): SloReport {
    const lats = (this.latencies.get(module) ?? []).slice().sort((a, b) => a - b);
    if (lats.length === 0) {
      return {
        module,
        observedP50: 0,
        observedP95: 0,
        observedP99: 0,
        observedErrorRate: 0,
        budgetBreached: false,
        breaches: [],
      };
    }
    const p = (q: number) => lats[Math.min(lats.length - 1, Math.floor(lats.length * q))]!;
    const total = this.totals.get(module) ?? 0;
    const errs = this.errors.get(module) ?? 0;
    const errorRate = total > 0 ? (errs / total) * 100 : 0;
    const breaches: string[] = [];
    if (p(0.5) > budget.p50Ms) breaches.push(`p50 ${p(0.5)}ms > ${budget.p50Ms}ms`);
    if (p(0.95) > budget.p95Ms) breaches.push(`p95 ${p(0.95)}ms > ${budget.p95Ms}ms`);
    if (p(0.99) > budget.p99Ms) breaches.push(`p99 ${p(0.99)}ms > ${budget.p99Ms}ms`);
    if (errorRate > budget.errorRatePct)
      breaches.push(`errorRate ${errorRate.toFixed(2)}% > ${budget.errorRatePct}%`);
    return {
      module,
      observedP50: p(0.5),
      observedP95: p(0.95),
      observedP99: p(0.99),
      observedErrorRate: errorRate,
      budgetBreached: breaches.length > 0,
      breaches,
    };
  }
}
