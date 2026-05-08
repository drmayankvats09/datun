// ═══════════════════════════════════════════════════════════════
// REVIEW FACTORY — Google-style 5-star + text reviews
// Sentiment distribution: 60% positive, 25% neutral, 15% negative
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface ReviewOutput {
  readonly id: string;
  readonly entityId: string;
  readonly entityType: 'CLINIC' | 'DOCTOR' | 'CONSULTATION' | 'APPOINTMENT';
  readonly patientId: string;
  readonly overallRating: number;
  readonly cleanlinessRating: number | null;
  readonly waitTimeRating: number | null;
  readonly staffBehaviorRating: number | null;
  readonly doctorExpertiseRating: number | null;
  readonly valueForMoneyRating: number | null;
  readonly reviewText: string | null;
  readonly reviewLanguage:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati'
    | null;
  readonly sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  readonly sentimentScore: number;
  readonly verifiedReviewer: boolean;
  readonly photoUrls: readonly string[];
  readonly clinicResponse: string | null;
  readonly clinicResponseAt: Date | null;
  readonly helpfulCount: number;
  readonly reportedCount: number;
  readonly isPublished: boolean;
  readonly moderatedBy: string | null;
  readonly moderatedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface ReviewTransient {
  readonly entityId: string;
  readonly entityType: 'CLINIC' | 'DOCTOR' | 'CONSULTATION' | 'APPOINTMENT';
  readonly patientId: string;
  readonly forceRating?: number;
}

export const reviewFactory = defineFactory<ReviewOutput, ReviewTransient>({
  name: 'appointment' as 'appointment',
  defaultTransient: { entityId: 'unknown', entityType: 'CLINIC', patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const rating =
      transient.forceRating ??
      faker.helpers.weightedArrayElement([
        { weight: 35, value: 5 },
        { weight: 30, value: 4 },
        { weight: 20, value: 3 },
        { weight: 10, value: 2 },
        { weight: 5, value: 1 },
      ]);

    const sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' =
      rating >= 4 ? 'POSITIVE' : rating === 3 ? 'NEUTRAL' : 'NEGATIVE';

    const reviewTexts = {
      POSITIVE: [
        'Bahut acche doctor hain, dard turant theek ho gaya. Highly recommended!',
        'Clean clinic, friendly staff. Doctor ne accha samjhaya.',
        'Best dental clinic in the area. Modern equipment.',
        'Dr. ne bahut achhi tarah se treat kiya. Fees bhi reasonable hai.',
        'Excellent service. AI consultation flow was smooth.',
      ],
      NEUTRAL: [
        'Treatment theek tha but waiting time zyada tha.',
        'Doctor accha hai but reception staff thoda rude lagta hai.',
        'Service okay, fees thodi zyada lag rahi hai.',
      ],
      NEGATIVE: [
        'Bahut intezaar karaya, doctor late aaye. Better service expected.',
        'Treatment ke baad bhi dard hai. Disappointed.',
        'Hidden charges. Initial estimate alag tha, final bill alag.',
        'Staff was rude, doctor rushed through consultation.',
      ],
    };

    return {
      id: `review-${String(sequence).padStart(10, '0')}`,
      entityId: transient.entityId,
      entityType: transient.entityType,
      patientId: transient.patientId,
      overallRating: rating,
      cleanlinessRating:
        faker.helpers.maybe(() => rating + faker.number.int({ min: -1, max: 1 }), {
          probability: 0.7,
        }) ?? null,
      waitTimeRating:
        faker.helpers.maybe(
          () => Math.max(1, Math.min(5, rating + faker.number.int({ min: -2, max: 1 }))),
          { probability: 0.7 },
        ) ?? null,
      staffBehaviorRating:
        faker.helpers.maybe(() => rating + faker.number.int({ min: -1, max: 1 }), {
          probability: 0.6,
        }) ?? null,
      doctorExpertiseRating:
        faker.helpers.maybe(
          () => Math.max(1, Math.min(5, rating + faker.number.int({ min: 0, max: 1 }))),
          { probability: 0.6 },
        ) ?? null,
      valueForMoneyRating:
        faker.helpers.maybe(() => rating + faker.number.int({ min: -2, max: 1 }), {
          probability: 0.5,
        }) ?? null,
      reviewText:
        faker.helpers.maybe(() => faker.helpers.arrayElement(reviewTexts[sentiment]), {
          probability: 0.7,
        }) ?? null,
      reviewLanguage: 'hindi',
      sentiment,
      sentimentScore:
        sentiment === 'POSITIVE'
          ? faker.number.float({ min: 0.6, max: 1 })
          : sentiment === 'NEUTRAL'
            ? faker.number.float({ min: -0.3, max: 0.3 })
            : faker.number.float({ min: -1, max: -0.4 }),
      verifiedReviewer: faker.datatype.boolean({ probability: 0.85 }),
      photoUrls:
        faker.helpers.maybe(
          () =>
            Array.from(
              { length: faker.number.int({ min: 1, max: 3 }) },
              (_, i) => `https://r2.datunai.com/reviews/photo-${sequence}-${i}.jpg`,
            ),
          { probability: 0.2 },
        ) ?? [],
      clinicResponse:
        faker.helpers.maybe(() => 'Thank you for your feedback!', {
          probability: sentiment === 'NEGATIVE' ? 0.8 : 0.3,
        }) ?? null,
      clinicResponseAt:
        faker.helpers.maybe(() => faker.date.recent({ days: 7 }), { probability: 0.5 }) ?? null,
      helpfulCount: faker.number.int({ min: 0, max: 50 }),
      reportedCount: faker.number.int({ min: 0, max: 3 }),
      isPublished: faker.datatype.boolean({ probability: 0.95 }),
      moderatedBy:
        faker.helpers.maybe(() => `admin-${faker.number.int({ min: 1, max: 5 })}`, {
          probability: 0.3,
        }) ?? null,
      moderatedAt:
        faker.helpers.maybe(() => faker.date.recent({ days: 30 }), { probability: 0.3 }) ?? null,
      createdAt: faker.date.recent({ days: 365 }),
      updatedAt: new Date(),
    };
  },

  persist: async (review) => review,
});
