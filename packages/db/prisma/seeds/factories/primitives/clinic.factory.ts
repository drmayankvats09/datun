// ═══════════════════════════════════════════════════════════════
// CLINIC FACTORY — Dental clinic with realistic Indian distribution
// Schema-aligned (B-1 v2): phone, address, state, website, specialties,
//   averageRating, subscriptionTier, complianceProfile, etc.
// Subscription tier: FREE/TRIAL/STARTER/PRO/ENTERPRISE (B2B = TRIAL+).
// ═══════════════════════════════════════════════════════════════

import {
  Prisma,
  type Clinic,
  type SubscriptionTier as ClinicSubscriptionTier,
  type PrismaClient,
} from '@prisma/client';
import { prismaInput } from '../core';
import { defineFactory } from '../core';
import { INDIAN_CITIES, getCitiesByTier } from '../../data/demographics';

interface ClinicTransient {
  /** Force specific city tier (for test scenarios) */
  readonly cityTier?: 'tier-1' | 'tier-2' | 'tier-3';
  /** Force subscription tier */
  readonly subscriptionTier?: ClinicSubscriptionTier;
  /** Owner user ID (clinic must be owned by a User with role=OWNER) */
  readonly ownerId?: string;
}

const CLINIC_NAME_PREFIXES = [
  'Smile',
  'Bright',
  'Dental',
  'Care',
  'Pearl',
  'Crown',
  'Royal',
  'Premier',
  'Elite',
  'Apex',
  'Aesthetic',
  'Family',
  'Modern',
  'Advanced',
  'Global',
  'City',
  'Heritage',
  'Sunshine',
  'Happy',
  'Healthy',
  'Wellness',
];

const CLINIC_NAME_SUFFIXES = [
  'Dental Care',
  'Dental Clinic',
  'Smiles',
  'Dentistry',
  'Dental Studio',
  'Oral Health Centre',
  'Dental Hospital',
  'Multi-Speciality Dental',
  'Dental & Implant Centre',
  'Dental Care Centre',
];

export const clinicFactory = defineFactory<Clinic, ClinicTransient>({
  name: 'clinic',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    // Pick city — weighted by tier if specified, else realistic distribution
    let cityPool = INDIAN_CITIES;
    if (transient.cityTier) {
      cityPool = getCitiesByTier(transient.cityTier);
    }
    const city = faker.helpers.arrayElement(cityPool);

    // Subscription tier — B2B realistic distribution
    const subscriptionTier: ClinicSubscriptionTier =
      transient.subscriptionTier ??
      faker.helpers.weightedArrayElement([
        { weight: 40, value: 'TRIAL' },
        { weight: 30, value: 'STARTER' },
        { weight: 25, value: 'PRO' },
        { weight: 5, value: 'ENTERPRISE' },
      ]);

    const prefix = faker.helpers.arrayElement(CLINIC_NAME_PREFIXES);
    const suffix = faker.helpers.arrayElement(CLINIC_NAME_SUFFIXES);
    const name = `${prefix} ${suffix}`;
    const slug = `${prefix.toLowerCase()}-${suffix.toLowerCase().replace(/\s+/g, '-')}-${sequence}`;

    // Localise lat/lng around city centre (jitter ±0.05° = ~5km)
    const latitude = city.latitude + faker.number.float({ min: -0.05, max: 0.05 });
    const longitude = city.longitude + faker.number.float({ min: -0.05, max: 0.05 });

    // Address composition (schema: address required, landmark optional)
    const houseNumber = faker.number.int({ min: 1, max: 999 });
    const addressFull = `${houseNumber}, ${faker.location.street()}`;
    const landmark =
      faker.helpers.maybe(
        () =>
          `Near ${faker.helpers.arrayElement(['Metro Station', 'Mall', 'Temple', 'Hospital', 'School'])}`,
        { probability: 0.4 },
      ) ?? null;

    return {
      // ── UUID for Prisma compliance (@db.Uuid schema constraint) ──
      id: faker.string.uuid(),
      ownerId: transient.ownerId ?? faker.string.uuid(),

      // ── Identity ──
      name,
      slug,
      description: `${name} - Multi-speciality dental clinic in ${city.name}`,

      // ── Contact (schema: phone REQUIRED, email REQUIRED, website OPTIONAL) ──
      phone: `+91 ${faker.string.numeric(5)} ${faker.string.numeric(5)}`,
      email: `contact@${slug}.datunai.com`,
      website: faker.helpers.maybe(() => `https://${slug}.com`, { probability: 0.5 }) ?? null,

      // ── Location (schema: address/state/city/pincode REQUIRED) ──
      address: addressFull,
      landmark,
      city: city.name,
      state: city.stateCode,
      pincode: faker.location.zipCode('######'),
      latitude,
      longitude,

      // ── Verification (schema defaults present, but factory sets explicit) ──
      registrationNumber: null,
      registrationCertUrl: null,
      isVerified: faker.datatype.boolean({ probability: 0.7 }),

      // ── Tier (clinic-level enum, separate from subscriptionTier) ──
      tier: faker.helpers.weightedArrayElement([
        { weight: 40, value: 'LITE' as const },
        { weight: 30, value: 'GROW' as const },
        { weight: 25, value: 'PRO' as const },
        { weight: 5, value: 'ENTERPRISE' as const },
      ]),
      trialEndsAt:
        subscriptionTier === 'TRIAL'
          ? faker.date.future({ years: 0.1 }) // ~30 days out
          : null,

      logoUrl: null,
      coverImageUrl: null,
      coverImageMediaId: null,

      // ── JSON fields (schema: Json? — accept null or stringified) ──
      photos: null,
      services: null,
      specialties: JSON.stringify(
        faker.helpers.arrayElements(
          [
            'general',
            'orthodontic',
            'endodontic',
            'periodontic',
            'oral-surgery',
            'pediatric',
            'prosthodontic',
            'cosmetic',
            'implantology',
          ],
          { min: 2, max: 6 },
        ),
      ),
      languages: JSON.stringify(
        faker.helpers.arrayElements(
          ['hindi', 'english', 'punjabi', 'bengali', 'tamil', 'telugu', 'marathi', 'gujarati'],
          { min: 1, max: 3 },
        ),
      ),
      openingHours: JSON.stringify({
        mon: { open: '09:00', close: '20:00' },
        tue: { open: '09:00', close: '20:00' },
        wed: { open: '09:00', close: '20:00' },
        thu: { open: '09:00', close: '20:00' },
        fri: { open: '09:00', close: '20:00' },
        sat: { open: '09:00', close: '14:00' },
        sun: { open: 'closed', close: 'closed' },
      }),

      // ── Ratings (schema: averageRating, NOT avgRating) ──
      averageRating: faker.number.float({ min: 3.5, max: 4.9, fractionDigits: 2 }),
      totalReviews: faker.number.int({ min: 0, max: 500 }),
      totalLeads: faker.number.int({ min: 0, max: 100 }),
      totalAppointments: faker.number.int({ min: 0, max: 1000 }),

      // ── Status ──
      isActive: true,
      onboardingStep: faker.number.int({ min: 0, max: 5 }),

      // ── B-1 v2: Service capabilities ──
      acceptsEmergencies: faker.datatype.boolean({ probability: 0.6 }),
      acceptsInsurance: faker.datatype.boolean({ probability: 0.5 }),
      acceptsTelemedicine: faker.datatype.boolean({ probability: 0.7 }),
      timezone: 'Asia/Kolkata',
      primaryLocale: 'en' as const,

      // ── B-1 v2: Subscription denormalization (schema enum: FREE/TRIAL/STARTER/PRO/ENTERPRISE) ──
      subscriptionTier,
      subscriptionExpiresAt:
        subscriptionTier === 'FREE'
          ? null
          : subscriptionTier === 'TRIAL'
            ? faker.date.future({ years: 0.1 })
            : faker.date.future({ years: 1 }),

      // ── B-1 v2: DPDP compliance ──
      complianceProfile: 'DPDP_INDIA' as const,
      dataRetentionDays: 2555,
      metadata: null,

      createdAt: faker.date.past({ years: 2 }),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Clinic;
  },

  persist: async (clinic, prisma) => {
    // Build output is already Prisma-compatible — direct create
    const created = await prisma.clinic.create({
      data: prismaInput<Prisma.ClinicUncheckedCreateInput>(
        clinic as unknown as Prisma.ClinicUncheckedCreateInput,
      ),
    });
    return created as unknown as Clinic;
  },
});
