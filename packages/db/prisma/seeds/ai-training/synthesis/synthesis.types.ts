// ═══════════════════════════════════════════════════════════════
// SYNTHESIS TYPES — LLM-driven training data augmentation
// ═══════════════════════════════════════════════════════════════
import type { Locale, SafetyConstraint } from '../eval/eval.types';

export type SynthesisStrategy =
  | 'persona-vary'
  | 'evol-instruct'
  | 'back-translate'
  | 'self-instruct';

export interface SynthesisRequest {
  readonly strategy: SynthesisStrategy;
  readonly seedExample: { chiefComplaint: string; locale: Locale; expectedUrgency: string };
  readonly targetCount: number;
  readonly variationDimensions: readonly ('age' | 'gender' | 'locale' | 'safety' | 'phrasing')[];
}

export interface SynthesizedExample {
  readonly id: string;
  readonly chiefComplaint: string;
  readonly locale: Locale;
  readonly patientContext: {
    ageYears: number;
    gender: 'M' | 'F' | 'O';
    safetyConstraints: readonly SafetyConstraint[];
  };
  readonly provenance: {
    readonly strategy: SynthesisStrategy;
    readonly seedExampleId: string;
    readonly generatorModel: string;
    readonly generatedAt: Date;
    readonly reviewedBy?: string;
    readonly reviewedAt?: Date;
  };
  readonly qualityScore?: number;
}
