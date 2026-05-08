// ═══════════════════════════════════════════════════════════════
// DOCTOR FACTORY — BDS/MDS dentist with NMC/DCI registration
//
// Schema alignment (packages/db/prisma/schema.prisma → model Doctor):
//   Required:  id, userId (unique), registrationNumber, qualifications (String),
//              isAcceptingPatients, acceptsEmergencies, acceptsTelemedicine,
//              rating, totalConsultations, languagesSpoken (LocaleCode[]),
//              createdAt, updatedAt
//   Optional:  registrationCouncil, registrationState, registrationVerifiedAt,
//              title, firstName, lastName, degree, specialization (String? — NOT enum),
//              yearsExperience, bio, avatarUrl, clinicId, deletedAt
//
// NO JSON FIELDS on Doctor — all simple scalars + Postgres arrays.
//
// Real-world basis (research-backed):
//   - DCI India 2024 specialization distribution (60% GD, 12% Ortho, etc.)
//   - NMC registration number format: <COUNCIL>/<STATE>/<YEAR>/<5-digit>
//   - 8 language coverage matches Datun 10-locale support
// ═══════════════════════════════════════════════════════════════

import { Prisma, type Doctor, type LocaleCode } from '@prisma/client';
import { defineFactory, prismaInput } from '../core';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS — Inlined to avoid cross-module dependency cascade
// ─────────────────────────────────────────────────────────────────

/**
 * Specialization values — schema is `specialization String?` (not enum).
 * String literal union enforces consistency at factory level.
 */
type Specialization =
  | 'General Dentistry'
  | 'Orthodontics'
  | 'Endodontics'
  | 'Oral Surgery'
  | 'Pedodontics'
  | 'Periodontics'
  | 'Prosthodontics'
  | 'Public Health Dentistry';

/** BDS qualification (5-year undergraduate dental degree, default). */
const BDS_QUALIFICATION = 'BDS' as const;

/**
 * MDS qualification per specialization (3-year postgraduate).
 * Source: DCI 2024 list of recognized MDS branches.
 */
const MDS_QUALIFICATIONS: Readonly<Record<Specialization, string>> = {
  'General Dentistry': 'BDS',
  Orthodontics: 'MDS Orthodontics & Dentofacial Orthopedics',
  Endodontics: 'MDS Conservative Dentistry & Endodontics',
  'Oral Surgery': 'MDS Oral & Maxillofacial Surgery',
  Pedodontics: 'MDS Pedodontics & Preventive Dentistry',
  Periodontics: 'MDS Periodontology',
  Prosthodontics: 'MDS Prosthodontics & Crown & Bridge',
  'Public Health Dentistry': 'MDS Public Health Dentistry',
} as const;

/**
 * Indian state codes — used in registration numbers.
 * Coverage: top 23 dental-active states by registered dentist count.
 */
const INDIAN_STATE_CODES = [
  'MH',
  'DL',
  'KA',
  'TN',
  'WB',
  'GJ',
  'UP',
  'MP',
  'RJ',
  'AP',
  'TS',
  'PB',
  'HR',
  'KL',
  'OR',
  'BR',
  'JH',
  'AS',
  'CT',
  'UK',
  'HP',
  'GA',
  'TR',
] as const;

/**
 * Registration councils — DCI (national) + state councils.
 * Pattern: Indian dental practice requires either DCI or state council registration.
 */
const REGISTRATION_COUNCILS: ReadonlyArray<{
  readonly code: string;
  readonly stateCode: string | null;
}> = [
  { code: 'DCI', stateCode: null }, // Dental Council of India (national)
  { code: 'MSDC', stateCode: 'MH' }, // Maharashtra State Dental Council
  { code: 'DSDC', stateCode: 'DL' }, // Delhi State Dental Council
  { code: 'KSDC', stateCode: 'KA' }, // Karnataka State Dental Council
  { code: 'TNSDC', stateCode: 'TN' }, // Tamil Nadu State Dental Council
  { code: 'WBSDC', stateCode: 'WB' }, // West Bengal State Dental Council
  { code: 'GSDC', stateCode: 'GJ' }, // Gujarat State Dental Council
  { code: 'UPSDC', stateCode: 'UP' }, // UP State Dental Council
] as const;

/** LocaleCode subset spoken by Indian dentists (matches schema enum). */
const DOCTOR_LOCALES: ReadonlyArray<LocaleCode> = [
  'en',
  'hi',
  'pa',
  'bn',
  'ta',
  'te',
  'mr',
  'gu',
  'kn',
  'ml',
  'or',
];

/**
 * Generate NMC/DCI-format registration number.
 * Format: <COUNCIL>/<STATE>/<YEAR>/<5-digit-sequence>
 * Example: DCI/MH/2015/12345
 */
function generateRegistrationNumber(
  councilCode: string,
  stateCode: string,
  registrationYear: number,
  sequence: number,
): string {
  const number = String(sequence).padStart(5, '0');
  return `${councilCode}/${stateCode}/${registrationYear}/${number}`;
}

// ─────────────────────────────────────────────────────────────────
// TRANSIENT — Build-time inputs not present in output
// ─────────────────────────────────────────────────────────────────
interface DoctorTransient {
  /** User ID — Doctor must link to User with primaryRole=DOCTOR */
  readonly userId?: string;
  /** Primary clinic where Doctor practices */
  readonly clinicId?: string;
  /** Force a specific specialization (string literal) */
  readonly specialization?: Specialization;
  /** Force years of experience (default: 1-35 random) */
  readonly yearsExperience?: number;
  /** Force MDS qualification (else auto-derived from specialization + yearsExperience) */
  readonly forceMds?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// FACTORY DEFINITION
// ─────────────────────────────────────────────────────────────────
export const doctorFactory = defineFactory<Doctor, DoctorTransient>({
  name: 'doctor',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    // ── Step 1: Specialization (DCI India 2024 distribution) ──
    const specialization: Specialization =
      transient.specialization ??
      faker.helpers.weightedArrayElement<Specialization>([
        { weight: 60, value: 'General Dentistry' },
        { weight: 12, value: 'Orthodontics' },
        { weight: 8, value: 'Endodontics' },
        { weight: 6, value: 'Oral Surgery' },
        { weight: 5, value: 'Pedodontics' },
        { weight: 4, value: 'Periodontics' },
        { weight: 3, value: 'Prosthodontics' },
        { weight: 2, value: 'Public Health Dentistry' },
      ]);

    // ── Step 2: Experience + qualification ──
    const yearsExperience = transient.yearsExperience ?? faker.number.int({ min: 1, max: 35 });

    // MDS qualification likelihood: forced, OR specialist, OR senior generalist (10+ years)
    const isMds =
      transient.forceMds === true ||
      specialization !== 'General Dentistry' ||
      (specialization === 'General Dentistry' && yearsExperience >= 10);

    const qualifications: string = isMds ? MDS_QUALIFICATIONS[specialization] : BDS_QUALIFICATION;
    const degree: string = isMds ? 'MDS' : 'BDS';

    // ── Step 3: Registration (NMC/DCI compliance) ──
    const council = faker.helpers.arrayElement([...REGISTRATION_COUNCILS]);
    const registrationState: string =
      council.stateCode ?? faker.helpers.arrayElement([...INDIAN_STATE_CODES]);
    const currentYear = new Date().getFullYear();
    const registrationYear = currentYear - yearsExperience;
    const registrationNumber = generateRegistrationNumber(
      council.code,
      registrationState,
      registrationYear,
      sequence,
    );

    // ── Step 4: Identity ──
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    // ── Step 5: Languages spoken (1-4, weighted toward Hindi+English) ──
    const languageCount = faker.number.int({ min: 1, max: 4 });
    const languagesSpoken: LocaleCode[] = faker.helpers.arrayElements(
      [...DOCTOR_LOCALES],
      languageCount,
    );
    // Ensure at least Hindi or English present
    if (!languagesSpoken.includes('hi') && !languagesSpoken.includes('en')) {
      languagesSpoken.unshift(faker.helpers.arrayElement(['hi', 'en'] as const));
    }

    // ── Step 6: Profile metrics (realistic distribution) ──
    const isAcceptingPatients = faker.datatype.boolean({ probability: 0.95 });
    const acceptsEmergencies = faker.datatype.boolean({ probability: 0.55 });
    const acceptsTelemedicine = faker.datatype.boolean({ probability: 0.7 });
    const rating = parseFloat(
      faker.number.float({ min: 3.5, max: 4.95, fractionDigits: 2 }).toFixed(2),
    );
    // Total consultations: rough log-scale based on years of experience
    const totalConsultations = Math.max(
      0,
      Math.floor(faker.number.int({ min: 50, max: 8000 }) * (yearsExperience / 10)),
    );

    // ── Step 7: Verification status ──
    const registrationVerifiedAt =
      faker.helpers.maybe(() => faker.date.past({ years: 2 }), { probability: 0.7 }) ?? null;

    // ── Step 8: Bio (Stripe-grade realism) ──
    const bio = `${degree} qualified dentist with ${yearsExperience} years of clinical experience. Specialized in ${specialization.toLowerCase()}.`;

    return {
      id: faker.string.uuid(),
      userId: transient.userId ?? faker.string.uuid(),

      // NMC fields
      registrationNumber,
      registrationCouncil: council.code,
      registrationState,
      registrationVerifiedAt,

      // Identity
      title: 'Dr.',
      firstName,
      lastName,

      // Qualification
      qualifications,
      degree,
      specialization,
      yearsExperience,

      // Profile
      bio,
      avatarUrl: null,
      isAcceptingPatients,
      acceptsEmergencies,
      acceptsTelemedicine,
      rating,
      totalConsultations,

      // Tenant scoping
      clinicId: transient.clinicId ?? null,

      // Languages
      languagesSpoken,

      // Timestamps
      createdAt: faker.date.past({ years: Math.max(1, Math.min(yearsExperience, 5)) }),
      updatedAt: new Date(),
      deletedAt: null,
    } satisfies Doctor;
  },

  persist: async (doctor, prisma) => {
    const d = doctor as unknown as Record<string, unknown>;
    const created = await prisma.doctor.create({
      data: prismaInput<Prisma.DoctorUncheckedCreateInput>({
        id: d.id as string,
        userId: d.userId as string,

        registrationNumber: d.registrationNumber as string,
        registrationCouncil: (d.registrationCouncil as string | null | undefined) ?? null,
        registrationState: (d.registrationState as string | null | undefined) ?? null,
        registrationVerifiedAt: (d.registrationVerifiedAt as Date | null | undefined) ?? null,

        title: (d.title as string | null | undefined) ?? 'Dr.',
        firstName: (d.firstName as string | null | undefined) ?? null,
        lastName: (d.lastName as string | null | undefined) ?? null,

        qualifications: d.qualifications as string,
        degree: (d.degree as string | null | undefined) ?? null,
        specialization: (d.specialization as string | null | undefined) ?? null,
        yearsExperience: (d.yearsExperience as number | null | undefined) ?? null,

        bio: (d.bio as string | null | undefined) ?? null,
        avatarUrl: (d.avatarUrl as string | null | undefined) ?? null,
        isAcceptingPatients: (d.isAcceptingPatients as boolean | undefined) ?? true,
        acceptsEmergencies: (d.acceptsEmergencies as boolean | undefined) ?? false,
        acceptsTelemedicine: (d.acceptsTelemedicine as boolean | undefined) ?? true,
        rating: (d.rating as number | undefined) ?? 0,
        totalConsultations: (d.totalConsultations as number | undefined) ?? 0,

        clinicId: (d.clinicId as string | null | undefined) ?? null,

        languagesSpoken: (d.languagesSpoken as LocaleCode[] | undefined) ?? [],
      }),
    });
    return created as unknown as Doctor;
  },
});

// ─────────────────────────────────────────────────────────────────
// Convenience builders — for composers + scenario-driven tests
// ─────────────────────────────────────────────────────────────────

/** Owner doctor — clinic founder, MDS-qualified, 10+ years experience. */
export const buildOwnerDoctor = (
  overrides?: Partial<Doctor>,
  transient?: Omit<DoctorTransient, 'forceMds' | 'yearsExperience'>,
) =>
  doctorFactory.build(overrides, {
    ...transient,
    yearsExperience: 15,
    forceMds: true,
  });

/** Specialist doctor — single specialization, MDS-qualified. */
export const buildSpecialistDoctor = (
  specialization: Specialization,
  overrides?: Partial<Doctor>,
  transient?: Omit<DoctorTransient, 'specialization' | 'forceMds'>,
) =>
  doctorFactory.build(overrides, {
    ...transient,
    specialization,
    forceMds: true,
  });

/** General practitioner — BDS, 1-10 years experience. */
export const buildGeneralPractitioner = (
  overrides?: Partial<Doctor>,
  transient?: Omit<DoctorTransient, 'specialization' | 'forceMds'>,
) =>
  doctorFactory.build(overrides, {
    ...transient,
    specialization: 'General Dentistry',
    forceMds: false,
  });
