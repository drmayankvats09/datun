// ═══════════════════════════════════════════════════════════════
// MEDICATION SAFETY — hard rule: no NSAIDs when blood-thinners
// Updated: queries Prescription.medications (Json) instead of joined table
// ═══════════════════════════════════════════════════════════════
import type { Expectation, ExpectationResult } from './expectation.types';

const NSAIDS = [
  'ibuprofen',
  'naproxen',
  'diclofenac',
  'ketorolac',
  'aceclofenac',
  'mefenamic acid',
  'piroxicam',
];

interface MedicationItem {
  readonly salt?: string;
  readonly medicationSalt?: string;
  readonly name?: string;
}

export const MEDICATION_NSAID_BLOOD_THINNER_EXPECTATION: Expectation = {
  id: 'med-nsaid-blood-thinner',
  name: 'No NSAID prescribed when patient on blood thinners',
  severity: 'critical',
  description:
    'Hard safety rule from Wave 5 clinical priors. Violations = patient safety incident.',

  async evaluate(prisma) {
    const start = performance.now();
    const offenders: string[] = [];
    let checked = 0;

    // Two-step cast via `unknown` — Prisma read type vs narrow consumer shape.
    const consultations = (await prisma.consultation.findMany({
      where: {
        status: 'COMPLETED' as never,
        patient: { safetyConstraints: { has: 'blood-thinners' } },
      },
      include: { prescriptions: true },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    } as never)) as unknown as Array<{
      id: string;
      prescriptions: Array<{ medications: unknown }>;
    }>;

    for (const c of consultations) {
      checked++;
      for (const p of c.prescriptions) {
        const meds = (Array.isArray(p.medications) ? p.medications : []) as MedicationItem[];
        const hasNsaid = meds.some((m) => {
          const salt = String(m.salt ?? m.medicationSalt ?? m.name ?? '').toLowerCase();
          return NSAIDS.some((n) => salt.includes(n));
        });
        if (hasNsaid) {
          offenders.push(c.id);
          break;
        }
      }
    }

    return {
      id: 'med-nsaid-blood-thinner',
      name: 'No NSAID prescribed when patient on blood thinners',
      severity: 'critical',
      passed: offenders.length === 0,
      violatingRowIds: offenders.slice(0, 20),
      message:
        offenders.length === 0
          ? `${checked} consultations checked — all safe`
          : `🚨 ${offenders.length}/${checked} consultations have NSAID + blood-thinner — IMMEDIATE REVIEW`,
      checkedRows: checked,
      durationMs: Math.round(performance.now() - start),
    } satisfies ExpectationResult;
  },
};
