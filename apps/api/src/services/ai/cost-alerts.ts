// ═══════════════════════════════════════════════════════════════
// AI COST ALERTS — Budget threshold monitoring
// Daily + monthly AI spend tracked. Alert when approaching budget.
// Pattern: AWS Budgets, GCP Budget Alerts.
// ═══════════════════════════════════════════════════════════════

import { alertAdmin } from '../alert.service.js';
import { logger } from '../../lib/logger.js';
import { cache } from '../../lib/redis.js';

interface CostThresholds {
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  warningPercent: number;
}

const DEFAULT_THRESHOLDS: CostThresholds = {
  dailyBudgetUsd: 5.0,
  monthlyBudgetUsd: 50.0,
  warningPercent: 0.8,
};

/**
 * Check AI spend against budget thresholds.
 * Called after every AI request by cost tracker (non-blocking).
 */
export async function checkCostThresholds(
  dailyCostUsd: number,
  requestCostUsd: number,
): Promise<void> {
  const t = DEFAULT_THRESHOLDS;

  // Monthly cost tracking via Redis
  const monthKey = `ai:monthly_cost:${new Date().toISOString().slice(0, 7)}`;
  let monthlyCostUsd = 0;
  try {
    const current = await cache.get(monthKey);
    monthlyCostUsd = current ? parseFloat(current) + requestCostUsd : requestCostUsd;
    await cache.set(monthKey, String(monthlyCostUsd), 35 * 24 * 60 * 60);
  } catch {
    // Redis unavailable — skip monthly tracking
  }

  if (dailyCostUsd >= t.dailyBudgetUsd * t.warningPercent) {
    const pct = Math.round((dailyCostUsd / t.dailyBudgetUsd) * 100);
    await alertAdmin(
      dailyCostUsd >= t.dailyBudgetUsd ? 'CRITICAL' : 'WARNING',
      'AI Daily Budget Alert',
      `Daily AI spend: $${dailyCostUsd.toFixed(2)} (${pct}% of $${t.dailyBudgetUsd} budget)`,
      { cooldownMin: 60, alertKey: `ai-cost-daily-${new Date().toISOString().slice(0, 10)}` },
    );
  }

  if (monthlyCostUsd >= t.monthlyBudgetUsd * t.warningPercent) {
    const pct = Math.round((monthlyCostUsd / t.monthlyBudgetUsd) * 100);
    await alertAdmin(
      monthlyCostUsd >= t.monthlyBudgetUsd ? 'CRITICAL' : 'WARNING',
      'AI Monthly Budget Alert',
      `Monthly AI spend: $${monthlyCostUsd.toFixed(2)} (${pct}% of $${t.monthlyBudgetUsd} budget)`,
      { cooldownMin: 360, alertKey: `ai-cost-monthly-${new Date().toISOString().slice(0, 7)}` },
    );
  }

  logger.info('[AI_COST] Request recorded', {
    aiCost: true,
    requestCostUsd,
    dailyCostUsd,
    monthlyCostUsd,
    dailyBudgetUsd: t.dailyBudgetUsd,
    monthlyBudgetUsd: t.monthlyBudgetUsd,
  });
}
