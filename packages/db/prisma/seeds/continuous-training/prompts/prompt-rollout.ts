// ═══════════════════════════════════════════════════════════════
// PROMPT ROLLOUT — staged ramp 10 → 30 → 50 → 100% with auto-rollback
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

export interface RolloutDecision {
  readonly action: 'continue' | 'ramp' | 'rollback' | 'complete';
  readonly newTrafficPct?: number;
  readonly reason: string;
}

export class PromptRolloutOrchestrator {
  constructor(private readonly prisma: PrismaClient) {}

  async startRollout(
    promptVersionId: string,
    startPct = 10,
    stepPct = 20,
    intervalHours = 24,
  ): Promise<void> {
    await this.prisma.promptRolloutPlan.upsert({
      where: { promptVersionId },
      create: {
        promptVersionId,
        startTrafficPct: startPct,
        rampStepPct: stepPct,
        rampIntervalHours: intervalHours,
        currentTrafficPct: startPct,
        status: 'ramping',
        startedAt: new Date(),
      },
      update: {
        startTrafficPct: startPct,
        rampStepPct: stepPct,
        rampIntervalHours: intervalHours,
        currentTrafficPct: startPct,
        status: 'ramping',
        startedAt: new Date(),
        rolledBack: undefined,
      },
    } as never);
  }

  async evaluateRamp(
    promptVersionId: string,
    safetyViolationRate: number,
    compositeScore: number,
    baselineScore: number,
  ): Promise<RolloutDecision> {
    const plan = await this.prisma.promptRolloutPlan.findUnique({ where: { promptVersionId } });
    if (!plan) return { action: 'continue', reason: 'No active rollout plan' };

    if (safetyViolationRate > 0.005) {
      await this.prisma.promptRolloutPlan.update({
        where: { promptVersionId },
        data: {
          status: 'rolled-back',
          rollbackReason: 'Safety violations > 0.5%',
          completedAt: new Date(),
        },
      });
      return {
        action: 'rollback',
        reason: `Safety violations ${(safetyViolationRate * 100).toFixed(2)}% > 0.5%`,
      };
    }

    if (compositeScore < baselineScore - 0.05) {
      await this.prisma.promptRolloutPlan.update({
        where: { promptVersionId },
        data: {
          status: 'rolled-back',
          rollbackReason: 'Composite regression > 5%',
          completedAt: new Date(),
        },
      });
      return {
        action: 'rollback',
        reason: `Composite ${compositeScore.toFixed(3)} vs baseline ${baselineScore.toFixed(3)}`,
      };
    }

    if (plan.currentTrafficPct >= 100) {
      await this.prisma.promptRolloutPlan.update({
        where: { promptVersionId },
        data: { status: 'completed', completedAt: new Date() },
      });
      return { action: 'complete', reason: 'Reached 100% traffic' };
    }

    const newPct = Math.min(plan.currentTrafficPct + plan.rampStepPct, 100);
    await this.prisma.promptRolloutPlan.update({
      where: { promptVersionId },
      data: { currentTrafficPct: newPct },
    });
    return {
      action: 'ramp',
      newTrafficPct: newPct,
      reason: `Healthy metrics — ramping ${plan.currentTrafficPct} → ${newPct}%`,
    };
  }
}
