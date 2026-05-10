// ═══════════════════════════════════════════════════════════════
// BUDGET ACCUMULATOR — composition over multiple DP releases
// Basic composition: sum of εs. Advanced composition (Kairouz 2017) for tighter bounds.
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';

export class BudgetAccumulator {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureBudget(
    scope: string,
    totalBudget: number,
  ): Promise<{ id: string; remaining: number }> {
    const existing = await this.prisma.privacyBudget.findUnique({ where: { scope } });
    if (existing) return { id: existing.id, remaining: existing.remainingEpsilon };
    const created = await this.prisma.privacyBudget.create({
      data: { scope, totalBudget, remainingEpsilon: totalBudget },
    });
    return { id: created.id, remaining: created.remainingEpsilon };
  }

  /** Returns true if spend allowed, false if would exceed budget. */
  async tryConsume(
    scope: string,
    runId: string,
    epsilon: number,
    mechanism = 'laplace',
  ): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
    const budget = await this.prisma.privacyBudget.findUnique({ where: { scope } });
    if (!budget) return { allowed: false, remaining: 0, reason: `No budget for scope ${scope}` };
    if (budget.remainingEpsilon < epsilon) {
      return {
        allowed: false,
        remaining: budget.remainingEpsilon,
        reason: `Spend ${epsilon} exceeds remaining ${budget.remainingEpsilon}`,
      };
    }
    await this.prisma.$transaction([
      this.prisma.privacyBudgetSpend.create({
        data: { budgetId: budget.id, runId, epsilonSpent: epsilon, mechanism },
      }),
      this.prisma.privacyBudget.update({
        where: { id: budget.id },
        data: {
          consumedEpsilon: { increment: epsilon },
          remainingEpsilon: { decrement: epsilon },
        },
      }),
    ]);
    return { allowed: true, remaining: budget.remainingEpsilon - epsilon };
  }

  /** Advanced composition: for k queries each with εᵢ, total ε ≈ √(2k ln(1/δ)) · εᵢ + k εᵢ² */
  advancedComposition(epsilonPerQuery: number, k: number, delta = 1e-6): number {
    return (
      Math.sqrt(2 * k * Math.log(1 / delta)) * epsilonPerQuery +
      k * epsilonPerQuery * epsilonPerQuery
    );
  }

  async getUsage(scope: string): Promise<{
    scope: string;
    total: number;
    consumed: number;
    remaining: number;
    spendCount: number;
  } | null> {
    const b = await this.prisma.privacyBudget.findUnique({
      where: { scope },
      include: { _count: { select: { spends: true } } },
    });
    if (!b) return null;
    return {
      scope: b.scope,
      total: b.totalBudget,
      consumed: b.consumedEpsilon,
      remaining: b.remainingEpsilon,
      spendCount: b._count.spends,
    };
  }
}
