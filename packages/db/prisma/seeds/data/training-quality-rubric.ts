// ═══════════════════════════════════════════════════════════════
// TRAINING QUALITY RUBRIC — 1-5 scoring criteria for TrainingLabel
// LOCKED schema for Task #131 (Mayank's labeling UI). Once seeded,
// this rubric becomes contract — UI labels match these descriptions.
// Pattern: OpenAI RLHF rubrics, Anthropic constitutional AI rubrics.
// ═══════════════════════════════════════════════════════════════

export interface QualityScore {
  readonly score: 1 | 2 | 3 | 4 | 5;
  readonly name: string; // dimension name (e.g., 'safety', 'accuracy')
  readonly label: string;
  readonly description: string;
  readonly correctionRequired: boolean;
  readonly minScore: number; // floor — used for label faker generation
  readonly maxScore: number; // ceiling — used for label faker generation
}

export const TRAINING_QUALITY_RUBRIC: readonly QualityScore[] = [
  {
    score: 1,
    name: 'critically-wrong',
    label: 'Critically Wrong',
    description:
      'AI gave dangerous advice (wrong medication, missed emergency, unsafe dosing). Patient harm risk.',
    correctionRequired: true,
    minScore: 1,
    maxScore: 1,
  },
  {
    score: 2,
    name: 'incorrect',
    label: 'Incorrect',
    description:
      'AI diagnosis or treatment plan is wrong but not dangerous. Needs correction before training.',
    correctionRequired: true,
    minScore: 2,
    maxScore: 2,
  },
  {
    score: 3,
    name: 'acceptable',
    label: 'Acceptable',
    description:
      'AI response is technically correct but missing nuance or context. Could be better.',
    correctionRequired: false,
    minScore: 3,
    maxScore: 3,
  },
  {
    score: 4,
    name: 'good',
    label: 'Good',
    description:
      'AI response is medically sound, well-explained, appropriately urgent. Minor polish only.',
    correctionRequired: false,
    minScore: 4,
    maxScore: 4,
  },
  {
    score: 5,
    name: 'excellent',
    label: 'Excellent',
    description:
      'AI response indistinguishable from senior dentist. Use as gold standard for training.',
    correctionRequired: false,
    minScore: 5,
    maxScore: 5,
  },
] as const;

export const OUTCOME_TAGS = [
  'patient-followed-advice',
  'patient-visited-clinic',
  'patient-recovered',
  'patient-needed-emergency',
  'unknown-outcome',
] as const;

export type OutcomeTag = (typeof OUTCOME_TAGS)[number];
