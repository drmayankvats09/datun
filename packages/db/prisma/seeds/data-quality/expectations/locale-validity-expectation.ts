// ═══════════════════════════════════════════════════════════════
// LOCALE VALIDITY — preferredLocale must match script of any indic field
// ═══════════════════════════════════════════════════════════════
import type { Expectation, ExpectationResult } from './expectation.types';

const SCRIPT_RANGES: Record<string, RegExp> = {
  hindi: /[\u0900-\u097F]/,
  punjabi: /[\u0A00-\u0A7F]/,
  bengali: /[\u0980-\u09FF]/,
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
  marathi: /[\u0900-\u097F]/,
  gujarati: /[\u0A80-\u0AFF]/,
};

export const LOCALE_VALIDITY_EXPECTATION: Expectation = {
  id: 'locale-validity',
  name: 'preferredLocale matches chiefComplaint script',
  severity: 'warning',
  description: 'If preferredLocale=hindi, chiefComplaint should contain Devanagari OR Latin.',

  async evaluate(prisma) {
    const start = performance.now();
    const offenders: string[] = [];
    let checked = 0;

    // Two-step cast via `unknown` — Prisma read type vs narrow consumer shape.
    const consultations = (await prisma.consultation.findMany({
      include: { patient: true },
      take: 2000,
      orderBy: { createdAt: 'desc' },
    } as never)) as unknown as Array<{
      id: string;
      chiefComplaint: string;
      patient: { preferredLocale: string };
    }>;

    for (const c of consultations) {
      checked++;
      const locale = c.patient.preferredLocale;
      if (locale === 'english') continue;
      const script = SCRIPT_RANGES[locale];
      if (!script) continue;
      const hasIndic = script.test(c.chiefComplaint);
      const hasLatin = /[A-Za-z]/.test(c.chiefComplaint);
      if (!hasIndic && !hasLatin) offenders.push(c.id);
    }

    return {
      id: 'locale-validity',
      name: 'preferredLocale matches chiefComplaint script',
      severity: 'warning',
      passed: offenders.length === 0,
      violatingRowIds: offenders.slice(0, 20),
      message:
        offenders.length === 0
          ? `${checked} consultations script-aligned`
          : `${offenders.length}/${checked} script mismatch`,
      checkedRows: checked,
      durationMs: Math.round(performance.now() - start),
    } satisfies ExpectationResult;
  },
};
