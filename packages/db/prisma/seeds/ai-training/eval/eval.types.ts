// ═══════════════════════════════════════════════════════════════
// EVAL TYPES — held-out + golden case contracts
// Source: OpenAI evals + Anthropic eval-harness + npj Digital Med 2025
// ═══════════════════════════════════════════════════════════════
export type Urgency = 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE';
export type Locale =
  | 'hindi'
  | 'english'
  | 'punjabi'
  | 'bengali'
  | 'tamil'
  | 'telugu'
  | 'marathi'
  | 'gujarati';
export type SafetyConstraint =
  | 'pregnancy'
  | 'allergy-known'
  | 'allergy-unknown'
  | 'child-under-6'
  | 'blood-thinners'
  | 'elderly';

export interface EvalCase {
  readonly id: string;
  readonly category:
    | 'pain'
    | 'bleeding'
    | 'fracture'
    | 'cosmetic'
    | 'pediatric'
    | 'emergency'
    | 'preventive'
    | 'orthodontic'
    | 'periodontal';
  readonly chiefComplaint: string;
  readonly locale: Locale;
  readonly patientContext: {
    readonly ageYears: number;
    readonly gender: 'M' | 'F' | 'O';
    readonly safetyConstraints: readonly SafetyConstraint[];
    readonly priorHistory?: string;
  };
  /** Expert-curated correct response */
  readonly expectedResponse: {
    readonly urgency: Urgency;
    readonly diagnosisIncludes: readonly string[];
    readonly medicationsAllowed: readonly string[];
    readonly medicationsForbidden: readonly string[];
    readonly homeRemediesIncluded: readonly string[];
    readonly imagingSuggested?: 'OPG' | 'CBCT' | 'PA' | 'none';
    readonly redFlagsToCatch: readonly string[];
  };
  /** Set by curator */
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly notes?: string;
}

export interface EvalResult {
  readonly caseId: string;
  readonly modelId: string;
  readonly responseRaw: string;
  readonly scores: {
    readonly urgencyMatch: number; // 0-1
    readonly diagnosisCoverage: number; // 0-1 (fraction of diagnosisIncludes hit)
    readonly safetyViolations: number; // count of forbidden meds prescribed
    readonly redFlagsCaught: number; // 0-1
    readonly localeAdherence: number; // 0-1
    readonly compositeScore: number; // weighted avg
  };
  readonly judgeNotes: string;
  readonly latencyMs: number;
  readonly tokenCost: { input: number; output: number };
}

export interface EvalSuiteResult {
  readonly suiteId: string;
  readonly modelId: string;
  readonly cases: readonly EvalResult[];
  readonly aggregate: {
    readonly meanComposite: number;
    readonly p50: number;
    readonly p99: number;
    readonly safetyViolationRate: number;
    readonly emergencyMissedCount: number;
  };
  readonly startedAt: Date;
  readonly finishedAt: Date;
}
