// ═══════════════════════════════════════════════════════════════
// k-ANONYMITY VALIDATOR
//
// Definition (Sweeney 2002): A dataset satisfies k-anonymity if every
// quasi-identifier combination appears at least k times.
// Reference: https://dataprivacylab.org/dataprivacy/projects/kanonymity/
//
// Used by: AnonymizationEngine batch validation (DPDP §17 + GDPR Art.32)
// ═══════════════════════════════════════════════════════════════

export interface KAnonymityReport {
  readonly passed: boolean;
  readonly k: number;
  readonly minGroupSize: number;
  readonly maxGroupSize: number;
  readonly totalGroups: number;
  readonly violatingGroups: ReadonlyArray<{
    readonly key: string;
    readonly size: number;
  }>;
}

export function validateKAnonymity(
  records: ReadonlyArray<Record<string, unknown>>,
  quasiIdentifiers: ReadonlyArray<string>,
  k: number,
): KAnonymityReport {
  // Defensive: empty data trivially satisfies k-anonymity (vacuous truth)
  if (records.length === 0) {
    return {
      passed: true,
      k,
      minGroupSize: 0,
      maxGroupSize: 0,
      totalGroups: 0,
      violatingGroups: [],
    };
  }

  // Group records by quasi-identifier signature
  const groups = new Map<string, number>();
  for (const record of records) {
    const key = quasiIdentifiers
      .map((qi) => {
        const v = record[qi];
        return v === null || v === undefined ? '__null__' : String(v);
      })
      .join('||');
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  const sizes = Array.from(groups.values());
  const minGroupSize = Math.min(...sizes);
  const maxGroupSize = Math.max(...sizes);

  const violatingGroups = Array.from(groups.entries())
    .filter(([, size]) => size < k)
    .map(([key, size]) => ({ key, size }));

  return {
    passed: violatingGroups.length === 0,
    k,
    minGroupSize,
    maxGroupSize,
    totalGroups: groups.size,
    violatingGroups,
  };
}
