// ═══════════════════════════════════════════════════════════════
// MEDICATION GUARDRAIL — output-side filtering
// Catches AI mistakes BEFORE patient sees them
// ═══════════════════════════════════════════════════════════════
import type { GuardrailContext, GuardrailViolation, GuardrailResult } from './guardrail.types';

const NSAIDS = [
  'ibuprofen',
  'naproxen',
  'diclofenac',
  'ketorolac',
  'aceclofenac',
  'mefenamic acid',
  'piroxicam',
  'aspirin',
];
const PREGNANCY_FORBIDDEN = [
  'ibuprofen',
  'aspirin',
  'tetracycline',
  'doxycycline',
  'metronidazole',
  'naproxen',
  'diclofenac',
];
const CHILD_UNDER_6_FORBIDDEN = [
  'aspirin',
  'ibuprofen',
  'naproxen',
  'tetracycline',
  'doxycycline',
  'codeine',
];

export function checkMedicationGuardrails(
  aiResponse: string,
  ctx: GuardrailContext,
): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  const lower = aiResponse.toLowerCase();

  if (ctx.safetyConstraints.includes('blood-thinners')) {
    for (const m of NSAIDS) {
      if (lower.includes(m)) {
        violations.push({
          kind: 'blood-thinner-violation',
          severity: 'critical',
          message: `AI suggested ${m} for blood-thinner patient — BLOCKED`,
          redactedExcerpt: aiResponse.slice(0, 200),
        });
      }
    }
  }

  if (
    ctx.safetyConstraints.includes('pregnancy') ||
    (ctx.patientGender === 'F' &&
      ctx.patientAgeYears >= 12 &&
      ctx.patientAgeYears <= 55 &&
      ctx.safetyConstraints.includes('pregnancy'))
  ) {
    for (const m of PREGNANCY_FORBIDDEN) {
      if (lower.includes(m)) {
        violations.push({
          kind: 'pregnancy-violation',
          severity: 'critical',
          message: `AI suggested ${m} for pregnant patient — BLOCKED`,
          redactedExcerpt: aiResponse.slice(0, 200),
        });
      }
    }
  }

  if (ctx.patientAgeYears <= 5 || ctx.safetyConstraints.includes('child-under-6')) {
    for (const m of CHILD_UNDER_6_FORBIDDEN) {
      if (lower.includes(m)) {
        violations.push({
          kind: 'child-violation',
          severity: 'critical',
          message: `AI suggested ${m} for child<6 — BLOCKED`,
          redactedExcerpt: aiResponse.slice(0, 200),
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
