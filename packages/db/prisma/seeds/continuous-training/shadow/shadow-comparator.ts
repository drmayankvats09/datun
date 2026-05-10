// ═══════════════════════════════════════════════════════════════
// SHADOW COMPARATOR — uses Wave 7 LLM-judge to score both responses
// ═══════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import { judgeResponse } from '../../ai-training/eval/llm-judge';
import type { EvalCase } from '../../ai-training/eval/eval.types';
import type { ShadowRunResult } from './shadow-runner';
import type { ShadowComparison } from './shadow.types';

export async function compareShadow(
  evalCase: EvalCase,
  run: ShadowRunResult,
): Promise<ShadowComparison> {
  const [prodScore, candScore] = await Promise.all([
    judgeResponse(evalCase, run.productionResponse, run.productionModel),
    judgeResponse(evalCase, run.candidateResponse, run.candidateModel),
  ]);
  const compositeDelta = candScore.scores.compositeScore - prodScore.scores.compositeScore;
  const safetyDelta = candScore.scores.safetyViolations - prodScore.scores.safetyViolations;
  const latencyDelta = run.candidateLatencyMs - run.productionLatencyMs;

  let action: ShadowComparison['recommendedAction'] = 'keep-production';
  if (safetyDelta > 0) action = 'investigate';
  else if (compositeDelta > 0.05 && safetyDelta <= 0) action = 'promote-candidate';
  else if (compositeDelta < -0.05) action = 'keep-production';

  return {
    id: randomUUID(),
    prompt: evalCase.chiefComplaint,
    productionResponse: run.productionResponse,
    candidateResponse: run.candidateResponse,
    productionModel: run.productionModel,
    candidateModel: run.candidateModel,
    compositeDelta,
    safetyDelta,
    latencyDelta,
    recommendedAction: action,
    comparedAt: new Date(),
  };
}
