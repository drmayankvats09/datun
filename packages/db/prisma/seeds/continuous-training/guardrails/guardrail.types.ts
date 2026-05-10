// ═══════════════════════════════════════════════════════════════
// GUARDRAIL TYPES — input/output safety filtering
// Source: OWASP LLM Top 10 + Anthropic Constitutional AI patterns
// ═══════════════════════════════════════════════════════════════
export type GuardrailKind =
  | 'prompt-injection'
  | 'pii-leak'
  | 'forbidden-medication'
  | 'pregnancy-violation'
  | 'child-violation'
  | 'blood-thinner-violation'
  | 'unsupported-language'
  | 'output-toxicity';

export interface GuardrailViolation {
  readonly kind: GuardrailKind;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly redactedExcerpt?: string;
}

export interface GuardrailResult {
  readonly passed: boolean;
  readonly violations: readonly GuardrailViolation[];
  readonly redactedInput?: string;
}

export interface GuardrailContext {
  readonly patientAgeYears: number;
  readonly patientGender: 'M' | 'F' | 'O';
  readonly safetyConstraints: readonly string[];
  readonly preferredLocale: string;
}
