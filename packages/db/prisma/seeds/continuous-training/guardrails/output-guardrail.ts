// ═══════════════════════════════════════════════════════════════
// OUTPUT GUARDRAIL — combines medication + PII + locale checks
// ═══════════════════════════════════════════════════════════════
import type { GuardrailContext, GuardrailResult, GuardrailViolation } from './guardrail.types';
import { checkMedicationGuardrails } from './medication-guardrail';

const PII_OUT_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{12}\b/g, 'aadhaar'],
  [/\b[6-9]\d{9}\b/g, 'phone'],
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email'],
];

export function checkOutputGuardrails(aiResponse: string, ctx: GuardrailContext): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  let redacted = aiResponse;

  const med = checkMedicationGuardrails(aiResponse, ctx);
  violations.push(...med.violations);

  for (const [pat, label] of PII_OUT_PATTERNS) {
    if (pat.test(redacted)) {
      redacted = redacted.replace(pat, `[${label} redacted]`);
      violations.push({
        kind: 'pii-leak',
        severity: 'error',
        message: `AI output contained ${label} — redacted`,
      });
    }
  }

  return {
    passed: !violations.some((v) => v.severity === 'critical'),
    violations,
    redactedInput: redacted,
  };
}
