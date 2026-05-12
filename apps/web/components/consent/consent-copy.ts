// ═══════════════════════════════════════════════════════════════
// DATA TRAINING CONSENT VERSIONS — Task #44 Phase 3
//
// LEGAL ARTIFACT. Every patient's ConsentLog row references the
// version string that was current at the time of consent. Old
// versions remain here forever for DPDP audit reproduction.
//
// Version semantics (semver):
//   - MAJOR: legal-meaning change (e.g., scope expansion)
//   - MINOR: clarification or new itemization (no scope change)
//   - PATCH: typo / grammar fix
//
// Any change to the consent text MUST:
//   1. Bump CONSENT_CURRENT_VERSION
//   2. Add entry to CONSENT_VERSION_HISTORY
//   3. Update both messages/en/admin.json + messages/hi/admin.json
//   4. Notify legal counsel (DPO sign-off required for MAJOR/MINOR)
//   5. Re-issue notice to existing consented users (DPDP Rule 3)
//
// @see docs/dpdp/training-data-dpia.md
// ═══════════════════════════════════════════════════════════════

/** Current active consent version — set on every new ConsentLog row. */
export const CONSENT_CURRENT_VERSION = 'v1.0.0';

/** Effective date of current version (informational). */
export const CONSENT_CURRENT_EFFECTIVE = '2026-05-12';

/** Withdrawal route (relative URL). DPDP Rule 3: "of equal simplicity". */
export const CONSENT_WITHDRAWAL_PATH = '/settings/privacy';

/**
 * Historical consent versions. NEVER remove entries — old ConsentLog
 * rows reference these for audit reproduction (DPDP-mandated).
 */
export interface ConsentVersionEntry {
  readonly version: string;
  readonly effectiveDate: string; // ISO date YYYY-MM-DD
  readonly summary: string; // 1-line change summary
  readonly translationFiles: readonly string[]; // i18n message file paths
}

export const CONSENT_VERSION_HISTORY: readonly ConsentVersionEntry[] = [
  {
    version: 'v1.0.0',
    effectiveDate: '2026-05-12',
    summary:
      'Initial DPDP-compliant consent. Scope: anonymized consultation Q&A for AI fine-tuning. ' +
      'Explicit exclusions: name, phone, email, identifying photos.',
    translationFiles: [
      'apps/web/messages/en/admin.json#consent.training',
      'apps/web/messages/hi/admin.json#consent.training',
    ],
  },
];

/** Lookup helper — find version by string, returns null if unknown. */
export function findConsentVersion(version: string): ConsentVersionEntry | null {
  return CONSENT_VERSION_HISTORY.find((v) => v.version === version) ?? null;
}
