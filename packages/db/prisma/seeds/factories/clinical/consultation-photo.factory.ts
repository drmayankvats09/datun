// ═══════════════════════════════════════════════════════════════
// CONSULTATION PHOTO FACTORY — Claude Vision photo upload + AI analysis
// Source: Datun v1 photo analysis flow + MMDental dataset structure
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type PhotoView =
  | 'INTRAORAL_FRONT'
  | 'INTRAORAL_LEFT'
  | 'INTRAORAL_RIGHT'
  | 'INTRAORAL_OCCLUSAL_UPPER'
  | 'INTRAORAL_OCCLUSAL_LOWER'
  | 'EXTRAORAL_FRONT'
  | 'EXTRAORAL_PROFILE'
  | 'CLOSE_UP_LESION'
  | 'OTHER';
type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW';

interface ConsultationPhotoOutput {
  readonly id: string;
  readonly consultationId: string;
  readonly patientId: string;
  readonly photoUrl: string;
  readonly thumbnailUrl: string;
  readonly view: PhotoView;
  readonly fileSizeBytes: number;
  readonly width: number;
  readonly height: number;
  readonly format: 'jpeg' | 'png' | 'webp' | 'heic';
  readonly capturedAt: Date;
  readonly uploadedAt: Date;
  readonly analysisStatus: AnalysisStatus;
  readonly aiModelUsed: string | null;
  readonly aiFindings: object | null;
  readonly aiConfidenceScore: number | null;
  readonly aiInputTokens: number | null;
  readonly aiOutputTokens: number | null;
  readonly aiCostUsd: number | null;
  readonly aiLatencyMs: number | null;
  readonly humanReviewedBy: string | null;
  readonly humanReviewedAt: Date | null;
  readonly hasPhi: boolean;
  readonly redactedRegions: object | null;
}

interface ConsultationPhotoTransient {
  readonly consultationId: string;
  readonly patientId: string;
  readonly view?: PhotoView;
}

export const consultationPhotoFactory = defineFactory<
  ConsultationPhotoOutput,
  ConsultationPhotoTransient
>({
  name: 'consultation' as 'consultation',
  defaultTransient: { consultationId: 'unknown', patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const view =
      transient.view ??
      faker.helpers.weightedArrayElement([
        { weight: 35, value: 'INTRAORAL_FRONT' as const },
        { weight: 20, value: 'CLOSE_UP_LESION' as const },
        { weight: 12, value: 'INTRAORAL_LEFT' as const },
        { weight: 12, value: 'INTRAORAL_RIGHT' as const },
        { weight: 8, value: 'INTRAORAL_OCCLUSAL_UPPER' as const },
        { weight: 5, value: 'INTRAORAL_OCCLUSAL_LOWER' as const },
        { weight: 3, value: 'EXTRAORAL_FRONT' as const },
        { weight: 3, value: 'EXTRAORAL_PROFILE' as const },
        { weight: 2, value: 'OTHER' as const },
      ]);

    const status = faker.helpers.weightedArrayElement([
      { weight: 80, value: 'COMPLETED' as const },
      { weight: 8, value: 'PROCESSING' as const },
      { weight: 5, value: 'PENDING' as const },
      { weight: 4, value: 'FAILED' as const },
      { weight: 3, value: 'MANUAL_REVIEW' as const },
    ]);

    const inputTokens = status === 'COMPLETED' ? faker.number.int({ min: 500, max: 3000 }) : null;
    const outputTokens = status === 'COMPLETED' ? faker.number.int({ min: 200, max: 1500 }) : null;

    return {
      id: `cphoto-${String(sequence).padStart(10, '0')}`,
      consultationId: transient.consultationId,
      patientId: transient.patientId,
      photoUrl: `https://r2.datunai.com/photos/cphoto-${sequence}.jpg`,
      thumbnailUrl: `https://r2.datunai.com/photos/thumbs/cphoto-${sequence}.webp`,
      view,
      fileSizeBytes: faker.number.int({ min: 200_000, max: 8_000_000 }),
      width: faker.helpers.arrayElement([1080, 1440, 1920, 2160, 3024, 4032]),
      height: faker.helpers.arrayElement([1920, 2160, 3024, 4032, 1080, 1440]),
      format: faker.helpers.weightedArrayElement([
        { weight: 60, value: 'jpeg' as const },
        { weight: 25, value: 'heic' as const },
        { weight: 10, value: 'png' as const },
        { weight: 5, value: 'webp' as const },
      ]),
      capturedAt: faker.date.recent({ days: 30 }),
      uploadedAt: faker.date.recent({ days: 30 }),
      analysisStatus: status,
      aiModelUsed: status === 'COMPLETED' ? 'claude-sonnet-4-vision' : null,
      aiFindings:
        status === 'COMPLETED'
          ? {
              primaryFinding: faker.helpers.arrayElement([
                'Visible carious lesion on tooth',
                'Gingival inflammation observed',
                'Tooth fracture suspected',
                'Plaque accumulation present',
                'No abnormality detected',
              ]),
              boundingBoxes: [
                { tooth: '#16', x: 0.45, y: 0.32, w: 0.08, h: 0.08, label: 'caries-suspect' },
              ],
            }
          : null,
      aiConfidenceScore:
        status === 'COMPLETED' ? faker.number.float({ min: 0.6, max: 0.99 }) : null,
      aiInputTokens: inputTokens,
      aiOutputTokens: outputTokens,
      aiCostUsd:
        inputTokens && outputTokens
          ? (inputTokens * 3) / 1_000_000 + (outputTokens * 15) / 1_000_000
          : null,
      aiLatencyMs: status === 'COMPLETED' ? faker.number.int({ min: 1500, max: 12000 }) : null,
      humanReviewedBy:
        status === 'MANUAL_REVIEW'
          ? `user-${String(faker.number.int({ min: 1, max: 5 })).padStart(6, '0')}`
          : null,
      humanReviewedAt: status === 'MANUAL_REVIEW' ? faker.date.recent({ days: 15 }) : null,
      hasPhi: faker.datatype.boolean({ probability: 0.05 }), // rare — face visible
      redactedRegions: faker.datatype.boolean({ probability: 0.05 })
        ? { faces: 1, faceBlurred: true }
        : null,
    };
  },

  persist: async (photo) => photo,
});
