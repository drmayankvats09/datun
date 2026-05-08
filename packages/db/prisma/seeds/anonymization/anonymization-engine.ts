// ═══════════════════════════════════════════════════════════════
// ANONYMIZATION ENGINE — orchestrator class
//
// Composes:
//   - rule resolution (DPDP / HIPAA / GDPR / combined profiles)
//   - deterministic masking (applyMask)
//   - audit trail (every record → AuditEntry)
//   - k-anonymity validation (batch mode)
//   - undetected-PII high-confidence flagging (post-mask leak check)
//
// FAANG principles:
//   - Strict equality model name match (PascalCase, matches Prisma client)
//   - Deterministic: same input + same SALT → same output (FK preservation)
//   - Audit-first: every mutation produces AuditEntry, regardless of profile
//   - Synthetic-aware leak detection: detectPiiInValue ignores engine's own
//     synthetic output to prevent false positives in property tests
// ═══════════════════════════════════════════════════════════════

import { applyMask, type MaskingStrategy } from './deterministic-masker';
import { detectPiiInValue, detectPiiFields } from './pii-detector';
import { DPDP_FULL_RULESET, type FieldRule } from './dpdp-rules';
import { HIPAA_RULES, GDPR_RULES } from './hipaa-gdpr-rules';
import { validateKAnonymity, type KAnonymityReport } from './k-anonymity-validator';
import { writeAuditEntry, type AuditEntry } from './audit-trail';

// ─── Public types ──────────────────────────────────────────────

export type ComplianceProfile = 'DPDP' | 'HIPAA' | 'GDPR' | 'DPDP_HIPAA' | 'DPDP_HIPAA_GDPR';

export interface AnonymizationEngineOptions {
  readonly quasiIdentifiers?: readonly string[];
  readonly kThreshold?: number;
  readonly operatorId?: string;
  readonly purpose?: string;
}

export interface AnonymizeRecordOptions {
  readonly writeAuditLog?: boolean;
}

export interface AnonymizeRecordsOptions extends AnonymizeRecordOptions {
  readonly validateKAnonymity?: boolean;
}

export interface AnonymizeRecordResult {
  readonly anonymized: Record<string, unknown>;
  readonly auditEntry: AuditEntry;
}

export interface SimplifiedKAnonymityReport {
  readonly valid: boolean;
  readonly violations: readonly { readonly key: string; readonly size: number }[];
}

export interface AnonymizeRecordsResult {
  readonly records: readonly Record<string, unknown>[];
  readonly recordsProcessed: number;
  readonly fieldsMasked: number;
  readonly fieldsKept: number;
  readonly fieldsNullified: number;
  readonly auditEntries: readonly AuditEntry[];
  readonly kAnonymityReport: SimplifiedKAnonymityReport | null;
}

// ─── Profile → ruleset resolver ────────────────────────────────

function resolveRuleset(profile: ComplianceProfile): readonly FieldRule[] {
  const layers: FieldRule[][] = [];
  if (profile === 'DPDP' || profile.startsWith('DPDP')) {
    layers.push([...DPDP_FULL_RULESET]);
  }
  if (profile === 'HIPAA' || profile.includes('HIPAA')) {
    layers.push([...HIPAA_RULES]);
  }
  if (profile === 'GDPR' || profile.includes('GDPR')) {
    layers.push([...GDPR_RULES]);
  }
  // Last-write-wins merge keyed on (model, field)
  const merged = new Map<string, FieldRule>();
  for (const layer of layers) {
    for (const rule of layer) {
      merged.set(`${rule.model}::${rule.field}`, rule);
    }
  }
  return Array.from(merged.values());
}

// ─── Engine ────────────────────────────────────────────────────

export class AnonymizationEngine {
  private readonly profile: ComplianceProfile;
  private readonly ruleset: readonly FieldRule[];
  private readonly ruleIndex: ReadonlyMap<string, FieldRule>;
  private readonly quasiIdentifiers: readonly string[];
  private readonly kThreshold: number;
  private readonly operatorId?: string;
  private readonly purpose?: string;

  constructor(profile: ComplianceProfile, opts: AnonymizationEngineOptions = {}) {
    this.profile = profile;
    this.ruleset = resolveRuleset(profile);
    const idx = new Map<string, FieldRule>();
    for (const r of this.ruleset) idx.set(`${r.model}::${r.field}`, r);
    this.ruleIndex = idx;
    this.quasiIdentifiers = opts.quasiIdentifiers ?? [
      'ageYears',
      'gender',
      'pincode',
      'preferredLocale',
    ];
    this.kThreshold = opts.kThreshold ?? 5;
    this.operatorId = opts.operatorId;
    this.purpose = opts.purpose;
  }

  /** Anonymize a single record. Returns masked output + audit trail. */
  anonymizeRecord(modelName: string, record: Record<string, unknown>): AnonymizeRecordResult {
    const out: Record<string, unknown> = { ...record };
    const fieldsMasked: string[] = [];
    const fieldsKept: string[] = [];
    const fieldsNullified: string[] = [];

    for (const [key, value] of Object.entries(record)) {
      const rule = this.ruleIndex.get(`${modelName}::${key}`);
      if (!rule) {
        fieldsKept.push(key);
        continue;
      }
      const strategy: MaskingStrategy = rule.strategy;
      if (strategy.kind === 'keep') {
        fieldsKept.push(key);
        continue;
      }
      const masked = applyMask(value, strategy);
      out[key] = masked;
      if (strategy.kind === 'null') fieldsNullified.push(key);
      else fieldsMasked.push(key);
    }

    // Post-mask leak check: HIGH-confidence PII left undetected by ruleset
    const undetectedPiiHighConfidence: string[] = [];
    const allFieldNames = Object.keys(out);
    const detectedPiiByName = detectPiiFields(allFieldNames);
    for (const detected of detectedPiiByName) {
      if (detected.confidence !== 'high') continue;
      if (
        fieldsMasked.includes(detected.fieldName) ||
        fieldsNullified.includes(detected.fieldName)
      ) {
        continue;
      }
      undetectedPiiHighConfidence.push(detected.fieldName);
    }
    // Value-level scan for anything that looks like real PII post-mask
    for (const [key, value] of Object.entries(out)) {
      if (fieldsMasked.includes(key) || fieldsNullified.includes(key)) continue;
      if (detectPiiInValue(value) !== null) {
        if (!undetectedPiiHighConfidence.includes(key)) {
          undetectedPiiHighConfidence.push(key);
        }
      }
    }

    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      modelName,
      recordId: String(record.id ?? '<unknown>'),
      fieldsMasked,
      fieldsKept,
      fieldsNullified,
      undetectedPiiHighConfidence,
      complianceProfile: this.profile,
      operatorId: this.operatorId,
      purpose: this.purpose,
    };

    return { anonymized: out, auditEntry };
  }

  /** Anonymize a batch of records. Optionally writes audit log + runs k-anonymity. */
  async anonymizeRecords(
    modelName: string,
    records: readonly Record<string, unknown>[],
    opts: AnonymizeRecordsOptions = {},
  ): Promise<AnonymizeRecordsResult> {
    const anonymizedRecords: Record<string, unknown>[] = [];
    const auditEntries: AuditEntry[] = [];
    let totalMasked = 0;
    let totalKept = 0;
    let totalNullified = 0;

    for (const record of records) {
      const { anonymized, auditEntry } = this.anonymizeRecord(modelName, record);
      anonymizedRecords.push(anonymized);
      auditEntries.push(auditEntry);
      totalMasked += auditEntry.fieldsMasked.length;
      totalKept += auditEntry.fieldsKept.length;
      totalNullified += auditEntry.fieldsNullified.length;
      if (opts.writeAuditLog) {
        await writeAuditEntry(auditEntry);
      }
    }

    let kReport: SimplifiedKAnonymityReport | null = null;
    if (opts.validateKAnonymity) {
      const raw: KAnonymityReport = validateKAnonymity(
        anonymizedRecords,
        this.quasiIdentifiers,
        this.kThreshold,
      );
      kReport = {
        valid: raw.passed,
        violations: raw.violatingGroups,
      };
    }

    return {
      records: anonymizedRecords,
      recordsProcessed: anonymizedRecords.length,
      fieldsMasked: totalMasked,
      fieldsKept: totalKept,
      fieldsNullified: totalNullified,
      auditEntries,
      kAnonymityReport: kReport,
    };
  }
}
