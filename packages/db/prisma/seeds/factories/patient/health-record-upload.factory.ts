// ═══════════════════════════════════════════════════════════════
// HEALTH RECORD UPLOAD FACTORY
// Old X-rays, OPGs, prescriptions, lab reports from other clinics.
// Critical for second-opinion + continuity of care.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type RecordType =
  | 'X_RAY'
  | 'OPG'
  | 'CBCT'
  | 'PRESCRIPTION'
  | 'LAB_REPORT'
  | 'DISCHARGE_SUMMARY'
  | 'CLINICAL_PHOTO'
  | 'INSURANCE_CARD';

interface HealthRecordOutput {
  readonly id: string;
  readonly patientId: string;
  readonly type: RecordType;
  readonly title: string;
  readonly fileUrl: string;
  readonly fileMimeType: string;
  readonly fileSizeBytes: number;
  readonly thumbnailUrl: string | null;
  readonly sourceClinic: string | null;
  readonly performingDoctor: string | null;
  readonly recordDate: Date;
  readonly uploadedAt: Date;
  readonly aiExtractedFindings: object | null;
  readonly aiTagged: boolean;
  readonly isReviewed: boolean;
  readonly visibilityScope: 'PRIVATE' | 'CLINIC_ONLY' | 'SHARED_WITH_DOCTOR';
}

interface HealthRecordTransient {
  readonly patientId: string;
  readonly type?: RecordType;
}

export const healthRecordUploadFactory = defineFactory<HealthRecordOutput, HealthRecordTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const type =
      transient.type ??
      faker.helpers.weightedArrayElement([
        { weight: 30, value: 'X_RAY' as const },
        { weight: 20, value: 'OPG' as const },
        { weight: 25, value: 'PRESCRIPTION' as const },
        { weight: 8, value: 'LAB_REPORT' as const },
        { weight: 7, value: 'CBCT' as const },
        { weight: 5, value: 'DISCHARGE_SUMMARY' as const },
        { weight: 3, value: 'CLINICAL_PHOTO' as const },
        { weight: 2, value: 'INSURANCE_CARD' as const },
      ]);

    const mimeMap: Record<RecordType, string> = {
      X_RAY: 'image/jpeg',
      OPG: 'image/jpeg',
      CBCT: 'application/dicom',
      PRESCRIPTION: 'application/pdf',
      LAB_REPORT: 'application/pdf',
      DISCHARGE_SUMMARY: 'application/pdf',
      CLINICAL_PHOTO: 'image/jpeg',
      INSURANCE_CARD: 'image/jpeg',
    };

    return {
      id: `hru-${String(sequence).padStart(10, '0')}`,
      patientId: transient.patientId,
      type,
      title: `${type.replace(/_/g, ' ')} - ${faker.date.past({ years: 5 }).getFullYear()}`,
      fileUrl: `https://r2.datunai.com/health-records/hru-${sequence}.${mimeMap[type].split('/')[1]}`,
      fileMimeType: mimeMap[type],
      fileSizeBytes: faker.number.int({ min: 50_000, max: 25_000_000 }),
      thumbnailUrl:
        type !== 'CBCT'
          ? `https://r2.datunai.com/health-records/thumbs/hru-${sequence}.webp`
          : null,
      sourceClinic:
        faker.helpers.maybe(() => faker.company.name() + ' Dental Clinic', { probability: 0.7 }) ??
        null,
      performingDoctor:
        faker.helpers.maybe(() => `Dr. ${faker.person.lastName()}`, { probability: 0.6 }) ?? null,
      recordDate: faker.date.past({ years: 5 }),
      uploadedAt: faker.date.recent({ days: 365 }),
      aiExtractedFindings:
        faker.helpers.maybe(
          () => ({
            textExtracted: 'Patient profile extracted via OCR',
            confidence: faker.number.float({ min: 0.7, max: 0.99 }),
          }),
          { probability: 0.5 },
        ) ?? null,
      aiTagged: faker.datatype.boolean({ probability: 0.6 }),
      isReviewed: faker.datatype.boolean({ probability: 0.4 }),
      visibilityScope: faker.helpers.weightedArrayElement([
        { weight: 50, value: 'CLINIC_ONLY' as const },
        { weight: 30, value: 'SHARED_WITH_DOCTOR' as const },
        { weight: 20, value: 'PRIVATE' as const },
      ]),
    };
  },

  persist: async (record) => record,
});
