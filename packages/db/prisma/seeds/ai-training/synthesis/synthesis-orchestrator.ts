// ═══════════════════════════════════════════════════════════════
// SYNTHESIS ORCHESTRATOR — generate → dedup → quality-filter → export
// ═══════════════════════════════════════════════════════════════
import type { SynthesisRequest, SynthesizedExample } from './synthesis.types';
import { ClaudeGenerator } from './claude-generator';
import { semanticDedup, exactDedup } from './dedup-engine';
import { computeIfdScore } from '../quality/ifd-scorer';
import { llmJudgeQuality } from '../quality/llm-judge-scorer';

export interface SynthesisPipelineResult {
  generated: number;
  afterExactDedup: number;
  afterSemanticDedup: number;
  afterLengthFilter: number;
  afterIfdFilter: number;
  afterJudgeFilter: number;
  finalExamples: readonly SynthesizedExample[];
  durationMs: number;
}

export async function runSynthesisPipeline(
  requests: readonly SynthesisRequest[],
  opts: { minIfdScore?: number; minJudgeScore?: number; targetFinalCount?: number } = {},
): Promise<SynthesisPipelineResult> {
  const start = performance.now();
  const generator = new ClaudeGenerator();
  const allExamples: SynthesizedExample[] = [];

  for (const req of requests) {
    const generated = await generator.generate(req, `seed-${Date.now()}`);
    allExamples.push(...generated);
  }

  const generated = allExamples.length;
  const afterExact = exactDedup(allExamples);
  const afterSemantic = await semanticDedup(afterExact);
  const afterLength = afterSemantic.filter(
    (e) => e.chiefComplaint.length >= 10 && e.chiefComplaint.length <= 500,
  );

  const ifdScored = await Promise.all(
    afterLength.map(async (e) => ({ ...e, qualityScore: await computeIfdScore(e.chiefComplaint) })),
  );
  const afterIfd = ifdScored.filter((e) => (e.qualityScore ?? 0) >= (opts.minIfdScore ?? 0.3));

  const judged = await Promise.all(
    afterIfd.map(async (e) => ({ ...e, qualityScore: await llmJudgeQuality(e.chiefComplaint) })),
  );
  const afterJudge = judged.filter((e) => (e.qualityScore ?? 0) >= (opts.minJudgeScore ?? 3.5));

  const final = opts.targetFinalCount ? afterJudge.slice(0, opts.targetFinalCount) : afterJudge;

  return {
    generated,
    afterExactDedup: afterExact.length,
    afterSemanticDedup: afterSemantic.length,
    afterLengthFilter: afterLength.length,
    afterIfdFilter: afterIfd.length,
    afterJudgeFilter: afterJudge.length,
    finalExamples: final,
    durationMs: Math.round(performance.now() - start),
  };
}
