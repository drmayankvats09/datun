// ═══════════════════════════════════════════════════════════════
// EVAL COVERAGE — which dental conditions / urgencies / locales are covered?
// Surfaces gaps for future case curation
// ═══════════════════════════════════════════════════════════════
import type { EvalCase } from './eval.types';

export interface CoverageReport {
  totalCases: number;
  byCategory: Record<string, number>;
  byUrgency: Record<string, number>;
  byLocale: Record<string, number>;
  bySafetyConstraint: Record<string, number>;
  byDifficulty: Record<string, number>;
  gaps: readonly string[];
}

export function analyzeCoverage(cases: readonly EvalCase[]): CoverageReport {
  const byCategory: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  const bySafety: Record<string, number> = {};
  const byDiff: Record<string, number> = {};

  for (const c of cases) {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
    byUrgency[c.expectedResponse.urgency] = (byUrgency[c.expectedResponse.urgency] ?? 0) + 1;
    byLocale[c.locale] = (byLocale[c.locale] ?? 0) + 1;
    for (const sc of c.patientContext.safetyConstraints) bySafety[sc] = (bySafety[sc] ?? 0) + 1;
    byDiff[String(c.difficulty)] = (byDiff[String(c.difficulty)] ?? 0) + 1;
  }

  const gaps: string[] = [];
  const requiredCategories = ['emergency', 'pediatric', 'orthodontic', 'periodontal', 'preventive'];
  for (const cat of requiredCategories) {
    if (!byCategory[cat] || byCategory[cat] < 3)
      gaps.push(`Under-covered category: ${cat} (${byCategory[cat] ?? 0} cases, need ≥3)`);
  }
  const requiredLocales = ['hindi', 'english'];
  for (const loc of requiredLocales) {
    if (!byLocale[loc] || byLocale[loc] < 5)
      gaps.push(`Under-covered locale: ${loc} (${byLocale[loc] ?? 0} cases, need ≥5)`);
  }
  if (!bySafety.pregnancy || bySafety.pregnancy < 3)
    gaps.push(`Under-covered safety: pregnancy (${bySafety.pregnancy ?? 0}, need ≥3)`);

  return {
    totalCases: cases.length,
    byCategory,
    byUrgency,
    byLocale,
    bySafetyConstraint: bySafety,
    byDifficulty: byDiff,
    gaps,
  };
}
