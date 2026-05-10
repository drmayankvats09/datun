// ═══════════════════════════════════════════════════════════════
// SCHEMA-AWARE MASKER — auto-detect Prisma schema fields
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { detectPiiFields } from './pii-detector';
import type { FieldRule } from './dpdp-rules';

export interface SchemaScanResult {
  readonly modelsScanned: number;
  readonly totalFields: number;
  readonly piiFieldsDetected: number;
  readonly suggestedRules: readonly FieldRule[];
  readonly unmappedHighConfidencePii: readonly { model: string; field: string }[];
}

export async function scanPrismaSchema(prisma: PrismaClient): Promise<SchemaScanResult> {
  const dmmf = (
    prisma as unknown as {
      _runtimeDataModel?: { models: Record<string, { fields: { name: string; type: string }[] }> };
    }
  )._runtimeDataModel;
  if (!dmmf?.models) {
    return {
      modelsScanned: 0,
      totalFields: 0,
      piiFieldsDetected: 0,
      suggestedRules: [],
      unmappedHighConfidencePii: [],
    };
  }

  const suggested: FieldRule[] = [];
  const unmapped: { model: string; field: string }[] = [];
  let totalFields = 0;
  let piiCount = 0;

  for (const [modelName, modelDef] of Object.entries(dmmf.models)) {
    const fieldNames = modelDef.fields.map((f) => f.name);
    totalFields += fieldNames.length;
    const detected = detectPiiFields(fieldNames);
    for (const d of detected) {
      piiCount++;
      const strategy = inferStrategy(d.category);
      if (strategy) {
        suggested.push({
          model: modelName,
          field: d.fieldName,
          strategy,
          justification: `Auto-detected ${d.category}`,
        });
      } else {
        unmapped.push({ model: modelName, field: d.fieldName });
      }
    }
  }

  return {
    modelsScanned: Object.keys(dmmf.models).length,
    totalFields,
    piiFieldsDetected: piiCount,
    suggestedRules: suggested,
    unmappedHighConfidencePii: unmapped,
  };
}

function inferStrategy(category: string): FieldRule['strategy'] | null {
  switch (category) {
    case 'NAME':
      return { kind: 'fake', faker: 'name' };
    case 'EMAIL':
      return { kind: 'fake', faker: 'email' };
    case 'PHONE':
      return { kind: 'fake', faker: 'phone' };
    case 'ADDRESS':
      return { kind: 'fake', faker: 'address' };
    case 'DATE_OF_BIRTH':
      return { kind: 'keep' };
    case 'GOVERNMENT_ID':
      return { kind: 'null' };
    case 'PAYMENT_CARD':
      return { kind: 'redact', placeholder: '****' };
    case 'BANK_ACCOUNT':
      return { kind: 'redact' };
    case 'PASSWORD':
      return { kind: 'redact', placeholder: '$2b$10$ANONYMIZED' };
    case 'AUTH_TOKEN':
      return { kind: 'null' };
    case 'OTP':
      return { kind: 'null' };
    case 'IP_ADDRESS':
      return { kind: 'truncate', keepChars: 7 };
    case 'GEOLOCATION':
      return { kind: 'noise', magnitude: 0.05 };
    default:
      return null;
  }
}
