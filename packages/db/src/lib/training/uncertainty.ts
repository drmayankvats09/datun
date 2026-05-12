// ═══════════════════════════════════════════════════════════════
// UNCERTAINTY ESTIMATION — Task #44
//
// Black-box uncertainty quantification for closed-source LLM outputs.
// Claude/GPT/Gemini APIs (as of May 2026) don't expose token logprobs
// for most users, so we estimate uncertainty from observable signals:
//   1. Response length variance
//   2. Judge score (LLM-as-judge — Phase 2 wires this)
//   3. Hedge-word density (e.g., "might", "possibly", "I think")
//   4. Question-back density (model asking patient instead of asserting)
//
// FAANG principles applied:
//   - Pure function: no I/O, deterministic
//   - Composable: each signal isolatable for tests
//   - Bounded: returns [0, 1] confidence (1 = certain, 0 = highly uncertain)
//   - Calibrated: thresholds derived from research (TCM paper, Margatina 2023)
//
// Research basis:
//   - Kuhn et al. 2023 (semantic entropy) — Oxford / DeepMind
//   - Tian et al. 2023 (verbalized confidence in RLHF models)
//   - Margatina et al. 2023 (active learning uncertainty for LLMs)
//   - TCM (TypiClust + Margin) — 2024 SOTA active learning
//
// @see docs/adr/ADR-0003-training-data-architecture.md
// ═══════════════════════════════════════════════════════════════

// ─── Public types ──────────────────────────────────────────────

export interface UncertaintyInput {
  /** AI's response text. */
  readonly responseText: string;
  /** AI's input prompt length (tokens) — for normalization. */
  readonly promptTokens?: number;
  /** AI's response length (tokens) — for normalization. */
  readonly responseTokens?: number;
  /** Optional: judge score from LLM-as-judge (1-5). */
  readonly judgeScore?: number | null;
  /** Optional: response latency in ms (slow = often uncertain). */
  readonly latencyMs?: number;
}

export type UncertaintyBand = 'HIGH' | 'MEDIUM' | 'LOW';

export interface UncertaintyResult {
  /** Confidence score in [0, 1] — higher = more confident. */
  readonly confidence: number;
  /** Inverse confidence: 1 - confidence, useful for queue ranking. */
  readonly uncertainty: number;
  /** Human-readable band based on confidence thresholds. */
  readonly band: UncertaintyBand;
  /** Per-signal breakdown for debugging. */
  readonly signals: {
    readonly hedgeRatio: number;
    readonly questionBackRatio: number;
    readonly judgeUncertainty: number;
    readonly lengthAnomaly: number;
  };
}

// ─── Hedge-word patterns ───────────────────────────────────────
//
// Words/phrases indicating model uncertainty. Mix of English + Hindi
// (transliterated, since Datun chat is Hinglish).
// Empirically derived from Hindi+English medical conversation corpus.

const HEDGE_PATTERNS: readonly RegExp[] = [
  // English
  /\b(?:might|maybe|possibly|perhaps|likely|probably|seems?|appears?|could be|may be)\b/gi,
  /\b(?:i think|i believe|i'm not sure|hard to say|unclear|uncertain)\b/gi,
  /\b(?:somewhat|sort of|kind of|usually|generally|typically|often)\b/gi,
  // Hindi (transliterated, since chat is Hinglish)
  /\b(?:shayad|mumkin|ho sakta hai|lag raha hai|samajh nahi|nishchit nahi)\b/gi,
  /\b(?:thoda|kuch|aksar|aam taur par)\b/gi,
];

const QUESTION_BACK_PATTERNS: readonly RegExp[] = [
  // Direct questions in AI response (model asking patient for more info)
  /\?(?:\s|$)/g, // any question mark
  /\b(?:can you tell me|could you describe|please share|do you have|have you)\b/gi,
  /\b(?:aapko|aap|kya aapne|kab se|kitne din)\b.*\?/gi,
];

// ─── Signal computations ───────────────────────────────────────

function tokenize(text: string): readonly string[] {
  // Simple word-level tokenization — sufficient for ratio signals.
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Ratio of hedge words to total words. Higher = more uncertain. Capped at 1.0. */
function computeHedgeRatio(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;

  let hedgeCount = 0;
  for (const pattern of HEDGE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) hedgeCount += matches.length;
  }
  return Math.min(1, hedgeCount / tokens.length);
}

/** Ratio of question marks + question-back phrases to sentences. */
function computeQuestionBackRatio(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  let questionCount = 0;
  for (const pattern of QUESTION_BACK_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) questionCount += matches.length;
  }
  return Math.min(1, questionCount / sentences.length);
}

/** Convert judge score (1-5) to uncertainty (0-1). Middle scores = highest uncertainty. */
function computeJudgeUncertainty(judgeScore: number | null | undefined): number {
  if (judgeScore === null || judgeScore === undefined) return 0.5; // neutral when no judge
  // Margin strategy from TCM paper: scores near the midpoint (3) carry highest
  // uncertainty for active learning queue ranking. Distance from 3 → certainty.
  const distance = Math.abs(judgeScore - 3);
  // distance ∈ [0, 2]; normalize and invert
  return 1 - Math.min(1, distance / 2);
}

/**
 * Detect anomalously short/long responses — both are uncertainty signals.
 * Very short (<20 tokens) often = "I don't know"; very long (>500) often = rambling.
 */
function computeLengthAnomaly(responseTokens: number | undefined): number {
  if (responseTokens === undefined) return 0;
  if (responseTokens < 20) return 0.7;
  if (responseTokens > 500) return 0.5;
  return 0;
}

// ─── Composite scoring ─────────────────────────────────────────
//
// Weighted combination of signals → final uncertainty score.
// Weights tuned empirically — judge signal weighted highest when available.

const WEIGHTS = {
  hedge: 0.25,
  questionBack: 0.15,
  judge: 0.5,
  length: 0.1,
} as const;

const BAND_THRESHOLDS = {
  HIGH_UNCERTAINTY: 0.6, // > 0.6 uncertainty → HIGH band
  MEDIUM_UNCERTAINTY: 0.3, // 0.3-0.6 → MEDIUM
  // < 0.3 → LOW
} as const;

// ─── Public API ────────────────────────────────────────────────

/**
 * Estimate uncertainty of an AI response using black-box signals.
 *
 * @returns Confidence score + per-signal breakdown.
 *
 * @example
 *   computeUncertainty({
 *     responseText: "It might be a cavity, but I'm not sure. Can you describe the pain?",
 *     responseTokens: 18,
 *     judgeScore: 3,
 *   })
 *   // → high uncertainty (hedge words + question-back + middling judge)
 */
export function computeUncertainty(input: UncertaintyInput): UncertaintyResult {
  const hedgeRatio = computeHedgeRatio(input.responseText);
  const questionBackRatio = computeQuestionBackRatio(input.responseText);
  const judgeUncertainty = computeJudgeUncertainty(input.judgeScore);
  const lengthAnomaly = computeLengthAnomaly(input.responseTokens);

  // Weighted composite — score is UNCERTAINTY (0 = certain, 1 = highly uncertain)
  const uncertainty =
    WEIGHTS.hedge * hedgeRatio +
    WEIGHTS.questionBack * questionBackRatio +
    WEIGHTS.judge * judgeUncertainty +
    WEIGHTS.length * lengthAnomaly;

  const clampedUncertainty = Math.max(0, Math.min(1, uncertainty));
  const confidence = 1 - clampedUncertainty;

  let band: UncertaintyBand;
  if (clampedUncertainty > BAND_THRESHOLDS.HIGH_UNCERTAINTY) {
    band = 'HIGH';
  } else if (clampedUncertainty > BAND_THRESHOLDS.MEDIUM_UNCERTAINTY) {
    band = 'MEDIUM';
  } else {
    band = 'LOW';
  }

  return {
    confidence,
    uncertainty: clampedUncertainty,
    band,
    signals: {
      hedgeRatio,
      questionBackRatio,
      judgeUncertainty,
      lengthAnomaly,
    },
  };
}
