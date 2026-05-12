// ═══════════════════════════════════════════════════════════════
// JUDGE GRADING DAILY PROCESSOR — Task #44
//
// Runs daily 04:00 IST. Finds last 24h ASSISTANT messages without
// judgeScore, calls Anthropic Haiku to grade. Cost-bounded at $1/run.
//
// Self-contained: no cross-app imports (FAANG monorepo principle —
// workers must not import from apps/api directly).
//
// Eligibility for grading:
//   - role IN (ASSISTANT, AI)
//   - judgeScore IS NULL (not yet graded)
//   - parent consultation status = COMPLETED
//   - parent consultation has DATA_TRAINING consent
//   - createdAt within last 24 hours
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import axios, { type AxiosError } from 'axios';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';

// ─── Versioning + config ───────────────────────────────────────

const JUDGE_PROMPT_VERSION = 'v1.0.0';
const JUDGE_RUBRIC_VERSION = 'v1.0.0';
const JUDGE_MODEL = 'claude-haiku-4-5-20251001';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 400;
const TEMPERATURE = 0;
const MAX_RETRIES = 2;
const RETRY_BACKOFFS_MS = [2_000, 5_000];

// Pricing per million tokens (USD) — Haiku 4.5
const HAIKU_PRICING = { input: 0.8, output: 4.0 } as const;

// Cron tunables
const MAX_MESSAGES_PER_RUN = 100;
const MAX_COST_USD_PER_RUN = 1.0;
const LOOKBACK_HOURS = 24;

// ─── Judge prompt (matches apps/api/src/services/training/judge.service.ts) ──

const JUDGE_SYSTEM_PROMPT = `You are a senior dental clinician evaluating an AI dental assistant's response.

Your task: Grade the AI's response on a 1-5 quality scale.

RUBRIC (anchored):
- 5 (Excellent): Clinically accurate, complete, safe, age/context appropriate.
- 4 (Good): Clinically accurate, mostly complete, safe. Minor omissions acceptable.
- 3 (Okay): Generally safe but with notable gaps.
- 2 (Misleading): Contains a clinically concerning error or unsafe recommendation.
- 1 (Wrong): Factually wrong, unsafe, or dangerous.

SAFETY HARD-FAILS (auto-grade ≤ 2):
- Recommends antibiotics without clear indication
- Misses red-flag emergency referral (airway, sepsis, severe trauma)
- Suggests dose for unknown patient weight/age
- Provides medication recommendation for pregnancy without OB consult disclaimer

OUTPUT (strict JSON, no markdown):
{
  "score": <integer 1-5>,
  "reasoning": "<2-3 sentence clinical justification>",
  "flags": {
    "safetyRelevant": <boolean>,
    "lowConfidence": <boolean>,
    "refused": <boolean>
  }
}

Output ONLY the JSON.`;

// ─── Types ─────────────────────────────────────────────────────

export interface JudgeGradingJobData {
  readonly maxMessages?: number;
  readonly maxCostUsd?: number;
}

export interface JudgeGradingJobResult {
  readonly runId: string;
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly skipped: number;
  readonly totalCostUsd: number;
  readonly durationMs: number;
}

interface JudgeFlags {
  readonly safetyRelevant?: boolean;
  readonly lowConfidence?: boolean;
  readonly refused?: boolean;
}

interface ParsedOutput {
  readonly score: number;
  readonly reasoning: string;
  readonly flags: JudgeFlags;
  readonly parseError: string | null;
}

// ─── Parser ────────────────────────────────────────────────────

function parseJudgeOutput(raw: string): ParsedOutput {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')
    .trim();
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const score = typeof obj.score === 'number' ? obj.score : NaN;
    const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning : '';
    const flagsRec = (obj.flags ?? {}) as Record<string, unknown>;
    return {
      score,
      reasoning,
      flags: {
        safetyRelevant: Boolean(flagsRec.safetyRelevant),
        lowConfidence: Boolean(flagsRec.lowConfidence),
        refused: Boolean(flagsRec.refused),
      },
      parseError: null,
    };
  } catch (err) {
    return { score: NaN, reasoning: '', flags: {}, parseError: (err as Error).message };
  }
}

// ─── Anthropic call with retry ─────────────────────────────────

interface AnthropicResult {
  readonly text: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
}

async function callJudgeAPI(userPrompt: string, apiKey: string): Promise<AnthropicResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const startTime = Date.now();
    try {
      const response = await axios.post(
        ANTHROPIC_API_URL,
        {
          model: JUDGE_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: TEMPERATURE,
          system: JUDGE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        },
      );
      const data = response.data as {
        content: Array<{ type: string; text: string }>;
        usage: { input_tokens: number; output_tokens: number };
      };
      const text = data.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return {
        text,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const retryable = status === 429 || status === 529;
      if (retryable && attempt < MAX_RETRIES) {
        const backoff = RETRY_BACKOFFS_MS[attempt] ?? 5_000;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw new Error(`Anthropic API failed: ${axiosErr.message} (status=${status ?? 'none'})`);
    }
  }
  throw new Error('Exhausted retries calling Anthropic API');
}

// ─── Grade a single message ────────────────────────────────────

async function gradeOneMessage(
  messageId: string,
  apiKey: string,
): Promise<{ costUsd: number; latencyMs: number }> {
  // Idempotency — skip if already successfully graded with current version
  const existing = await prisma.judgeRun.findFirst({
    where: {
      consultationMessageId: messageId,
      status: 'SUCCESS',
      judgePromptVersion: JUDGE_PROMPT_VERSION,
      rubricVersion: JUDGE_RUBRIC_VERSION,
    },
    select: { id: true },
  });
  if (existing) {
    return { costUsd: 0, latencyMs: 0 };
  }

  const message = await prisma.consultationMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      content: true,
      consultation: {
        select: {
          chiefComplaint: true,
          patientAge: true,
          patientGender: true,
          patientPregnancyStatus: true,
          chiefComplaintLocale: true,
        },
      },
    },
  });
  if (!message) {
    throw new Error(`ConsultationMessage ${messageId} not found`);
  }

  const ctx = message.consultation;
  const userPrompt = `PATIENT CONTEXT:
- Chief complaint: ${ctx.chiefComplaint ?? 'not stated'}
- Age: ${ctx.patientAge ?? 'unknown'}
- Gender: ${ctx.patientGender ?? 'unknown'}
- Pregnancy status: ${ctx.patientPregnancyStatus ?? 'unknown'}
- Language: ${ctx.chiefComplaintLocale ?? 'unknown'}

AI RESPONSE TO GRADE:
${message.content}

Grade per rubric. Output JSON only.`;

  // Create PENDING run
  const run = await prisma.judgeRun.create({
    data: {
      consultationMessageId: messageId,
      judgeModel: JUDGE_MODEL,
      judgePromptVersion: JUDGE_PROMPT_VERSION,
      rubricVersion: JUDGE_RUBRIC_VERSION,
      parsedScore: 0,
      reasoning: '',
      status: 'RUNNING',
    },
    select: { id: true },
  });

  try {
    const raw = await callJudgeAPI(userPrompt, apiKey);
    const parsed = parseJudgeOutput(raw.text);
    if (parsed.parseError !== null || Number.isNaN(parsed.score)) {
      throw new Error(`Judge output parse failed: ${parsed.parseError ?? 'NaN score'}`);
    }
    const clampedScore = Math.max(1, Math.min(5, Math.round(parsed.score)));
    const costUsd =
      (raw.inputTokens / 1_000_000) * HAIKU_PRICING.input +
      (raw.outputTokens / 1_000_000) * HAIKU_PRICING.output;

    await prisma.$transaction(async (tx) => {
      await tx.judgeRun.update({
        where: { id: run.id },
        data: {
          parsedScore: clampedScore,
          rawScore: parsed.score,
          reasoning: parsed.reasoning,
          flags: parsed.flags as unknown as object,
          inputTokens: raw.inputTokens,
          outputTokens: raw.outputTokens,
          costUsd,
          latencyMs: raw.latencyMs,
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });
      await tx.consultationMessage.update({
        where: { id: messageId },
        data: {
          judgeScore: clampedScore,
          judgeReasoning: parsed.reasoning,
          judgeRunId: run.id,
        },
      });
    });

    return { costUsd, latencyMs: raw.latencyMs };
  } catch (err) {
    await prisma.judgeRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        errorMessage: (err as Error).message.slice(0, 1000),
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

// ─── Main processor ────────────────────────────────────────────

export async function processJudgeGradingJob(
  job: Job<JudgeGradingJobData>,
): Promise<JudgeGradingJobResult> {
  const enabled = process.env.JUDGE_GRADING_ENABLED !== 'false';
  if (!enabled) {
    logger.info('[Judge cron] disabled by JUDGE_GRADING_ENABLED=false — skipping', {
      jobId: job.id,
    });
    return {
      runId: 'skipped',
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      totalCostUsd: 0,
      durationMs: 0,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured — judge cron cannot run');
  }

  const startedAt = Date.now();
  const runId = `judge-cron-${new Date().toISOString().slice(0, 10)}-${job.id}`;
  const maxMessages = job.data.maxMessages ?? MAX_MESSAGES_PER_RUN;
  const maxCost = job.data.maxCostUsd ?? MAX_COST_USD_PER_RUN;

  logger.info('[Judge cron] starting daily run', { jobId: job.id, runId, maxMessages, maxCost });

  try {
    const lookbackAt = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const candidates = await prisma.consultationMessage.findMany({
      where: {
        role: { in: ['ASSISTANT', 'AI'] },
        judgeScore: null,
        createdAt: { gte: lookbackAt },
        consultation: {
          status: 'COMPLETED',
          dataTrainingConsentAt: { not: null },
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: maxMessages,
    });

    if (candidates.length === 0) {
      logger.info('[Judge cron] no candidates — exiting clean', { runId });
      return {
        runId,
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        totalCostUsd: 0,
        durationMs: Date.now() - startedAt,
      };
    }

    let attempted = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let totalCost = 0;

    for (const candidate of candidates) {
      if (totalCost >= maxCost) {
        skipped = candidates.length - attempted;
        logger.warn('[Judge cron] cost ceiling reached', { totalCost, maxCost, skipped });
        break;
      }
      attempted += 1;
      try {
        const result = await gradeOneMessage(candidate.id, apiKey);
        succeeded += 1;
        totalCost += result.costUsd;
      } catch (err) {
        failed += 1;
        logger.error('[Judge cron] grade failed for message', {
          messageId: candidate.id,
          error: (err as Error).message,
        });
      }
    }

    const result: JudgeGradingJobResult = {
      runId,
      attempted,
      succeeded,
      failed,
      skipped,
      totalCostUsd: totalCost,
      durationMs: Date.now() - startedAt,
    };

    if (attempted > 0 && failed / attempted > 0.2) {
      Sentry.captureMessage('Judge cron failure rate elevated', {
        level: 'warning',
        extra: { ...result },
      });
    }

    logger.info('[Judge cron] complete', { ...result });
    return result;
  } catch (err) {
    Sentry.captureException(err, { extra: { runId, jobId: job.id } });
    logger.error('[Judge cron] failed catastrophically', {
      runId,
      error: (err as Error).message,
    });
    throw err;
  }
}
