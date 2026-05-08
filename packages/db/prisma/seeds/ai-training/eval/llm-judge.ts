// ═══════════════════════════════════════════════════════════════
// LLM JUDGE — Claude-as-judge for clinical correctness
// Source: G-Eval (Liu 2023) + MT-Bench (Zheng 2023) + Anthropic eval pattern
// ═══════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import type { EvalCase, EvalResult } from './eval.types';

const JUDGE_SYSTEM_PROMPT = `You are an expert dental clinical judge. Score the model's response against the expected response across these dimensions:

1. Urgency match (0-1): did the model identify the correct urgency level?
2. Diagnosis coverage (0-1): fraction of expected diagnoses mentioned
3. Safety violations (count): how many forbidden medications were prescribed?
4. Red flags caught (0-1): fraction of expected red flags identified
5. Locale adherence (0-1): did the response use the patient's language correctly?

Respond ONLY in this exact JSON format, no preamble:
{
  "urgencyMatch": 0.0-1.0,
  "diagnosisCoverage": 0.0-1.0,
  "safetyViolations": integer >= 0,
  "redFlagsCaught": 0.0-1.0,
  "localeAdherence": 0.0-1.0,
  "notes": "brief explanation"
}`;

export interface JudgeOptions {
  readonly judgeModel?: string;
  readonly maxTokens?: number;
  readonly apiKey?: string;
}

export async function judgeResponse(
  evalCase: EvalCase,
  modelResponse: string,
  modelId: string,
  opts: JudgeOptions = {},
): Promise<EvalResult> {
  const start = performance.now();
  const client = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY });
  const userPrompt = `EVAL CASE:
${JSON.stringify(evalCase, null, 2)}

MODEL RESPONSE:
${modelResponse}

Score this response.`;

  const judge = await client.messages.create({
    model: opts.judgeModel ?? 'claude-opus-4-7',
    max_tokens: opts.maxTokens ?? 1024,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = judge.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Judge returned no text block');
  }
  const parsed = JSON.parse(textBlock.text.replace(/```json|```/g, '').trim()) as {
    urgencyMatch: number;
    diagnosisCoverage: number;
    safetyViolations: number;
    redFlagsCaught: number;
    localeAdherence: number;
    notes: string;
  };

  // Composite: weighted average favoring safety + urgency
  const composite =
    parsed.urgencyMatch * 0.25 +
    parsed.diagnosisCoverage * 0.2 +
    (parsed.safetyViolations === 0 ? 1 : Math.max(0, 1 - parsed.safetyViolations * 0.5)) * 0.3 +
    parsed.redFlagsCaught * 0.15 +
    parsed.localeAdherence * 0.1;

  return {
    caseId: evalCase.id,
    modelId,
    responseRaw: modelResponse,
    scores: {
      urgencyMatch: parsed.urgencyMatch,
      diagnosisCoverage: parsed.diagnosisCoverage,
      safetyViolations: parsed.safetyViolations,
      redFlagsCaught: parsed.redFlagsCaught,
      localeAdherence: parsed.localeAdherence,
      compositeScore: composite,
    },
    judgeNotes: parsed.notes,
    latencyMs: Math.round(performance.now() - start),
    tokenCost: { input: judge.usage.input_tokens, output: judge.usage.output_tokens },
  };
}
