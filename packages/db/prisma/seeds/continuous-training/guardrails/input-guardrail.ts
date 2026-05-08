// ═══════════════════════════════════════════════════════════════
// INPUT GUARDRAIL — runs on user prompt BEFORE Claude call
// ═══════════════════════════════════════════════════════════════
import type { GuardrailViolation, GuardrailResult } from './guardrail.types';

const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /disregard (all )?(prior|earlier) (instructions|prompts|context)/i,
  /you are now (a |an )?[a-z]+/i,
  /system prompt[:.]?\s*['"]/i,
  /\[\[\s*(system|admin|root)\s*\]\]/i,
  /act as (a |an )?(developer|admin|root|sudo)/i,
];

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{12}\b/g, 'aadhaar'],
  [/\b[6-9]\d{9}\b/g, 'phone'],
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email'],
  [/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, 'credit-card'],
];

export function checkInputGuardrails(input: string): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  let redacted = input;

  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(input)) {
      violations.push({
        kind: 'prompt-injection',
        severity: 'critical',
        message: `Prompt injection pattern detected: ${pat.source}`,
        redactedExcerpt: input.slice(0, 100),
      });
      break;
    }
  }

  for (const [pat, label] of PII_PATTERNS) {
    if (pat.test(redacted)) {
      redacted = redacted.replace(pat, `[REDACTED:${label}]`);
      violations.push({
        kind: 'pii-leak',
        severity: 'warning',
        message: `PII detected and redacted: ${label}`,
      });
    }
  }

  const supportedLocales =
    /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0A80-\u0AFF]|^[A-Za-z0-9\s.,!?'"()\-]+$/;
  if (!supportedLocales.test(input.slice(0, 200))) {
    violations.push({
      kind: 'unsupported-language',
      severity: 'warning',
      message: 'Input contains unsupported script',
    });
  }

  return {
    passed: !violations.some((v) => v.severity === 'critical'),
    violations,
    redactedInput: redacted,
  };
}
