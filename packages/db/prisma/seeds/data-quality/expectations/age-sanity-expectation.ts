// ═══════════════════════════════════════════════════════════════
// AGE SANITY — child<6 must not have adult medications
// Reads ageYears from extended Patient denormalized fields
// ═══════════════════════════════════════════════════════════════
import type { Expectation, ExpectationResult } from './expectation.types';

const ADULT_ONLY_SALTS = [
  'aspirin',
  'ibuprofen',
  'naproxen',
  'tetracycline',
  'doxycycline',
  'metronidazole',
];

interface MedicationItem {
  readonly salt?: string;
  readonly medicationSalt?: string;
  readonly name?: string;
}

export const AGE_SANITY_EXPECTATION: Expectation = {
  id: 'age-sanity-child-meds',
  name: 'Child under 6 has no adult-only medications',
  severity: 'critical',
  description: 'Wave 5 hard safety rule — child<6 always blocks self-medication.',

  async evaluate(prisma) {
    const start = performance.now();
    const offenders: string[] = [];
    let checked = 0;

    // ── `as unknown as` pattern: Prisma's full-shape Consultation read type
    //    differs from the narrow shape we actually consume. Two-step cast
    //    (via `unknown`) is the canonical TS escape hatch for "structurally
    //    compatible but type-system-asymmetric" reads. Pattern source:
    //    Effective TypeScript Item 9 (Prefer Type Declarations to Type Assertions).
    const consultations = (await prisma.consultation.findMany({
      where: {
        status: 'COMPLETED' as never,
        patient: { ageYears: { lte: 5 } },
      },
      include: { prescriptions: true },
      take: 5000,
    } as never)) as unknown as Array<{
      id: string;
      prescriptions: Array<{ medications: unknown }>;
    }>;

    for (const c of consultations) {
      checked++;
      for (const p of c.prescriptions) {
        const meds = (Array.isArray(p.medications) ? p.medications : []) as MedicationItem[];
        const hasAdultMed = meds.some((m) => {
          const salt = String(m.salt ?? m.medicationSalt ?? m.name ?? '').toLowerCase();
          return ADULT_ONLY_SALTS.some((s) => salt.includes(s));
        });
        if (hasAdultMed) {
          offenders.push(c.id);
          break;
        }
      }
    }

    return {
      id: 'age-sanity-child-meds',
      name: 'Child under 6 has no adult-only medications',
      severity: 'critical',
      passed: offenders.length === 0,
      violatingRowIds: offenders.slice(0, 20),
      message:
        offenders.length === 0
          ? `${checked} pediatric cases safe`
          : `🚨 ${offenders.length}/${checked} child<6 with adult med`,
      checkedRows: checked,
      durationMs: Math.round(performance.now() - start),
    } satisfies ExpectationResult;
  },
};
