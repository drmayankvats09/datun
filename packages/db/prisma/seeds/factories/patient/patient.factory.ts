// ═══════════════════════════════════════════════════════════════
// PATIENT FACTORY — 50-archetype-driven Indian patient (FAANG v2)
//
// ARCHITECTURE TRUTH: Modules use bulkInsert → prisma.createMany
// directly. Factory.persist() is NEVER called for batch inserts.
// Therefore build output MUST be Prisma createMany-compatible:
//   - UUID for id/userId (schema is @db.Uuid)
//   - ISO LocaleCode for preferredLocale (enum at schema level)
//   - Real string[] for String[] schema fields (comorbidConditionsIcd10, safetyConstraints)
//   - JSON.stringify OK for Json? fields (Prisma accepts both string and object)
//
// 50 archetypes: pregnancy, diabetic, cardiac, pediatric, geriatric,
// oncology, HIV, autoimmune, rural, urban edge cases.
// DPDP-safe: synthetic phone (+91 99999 X-X-X-X-X), example.com email,
//            7-year retention computed at seed.
// ═══════════════════════════════════════════════════════════════

import {
  type Gender,
  type LocaleCode,
  type Patient,
  type PregnancyStatus,
  type SmokingStatus,
  Prisma,
} from '@prisma/client';
import { defineFactory, prismaInput } from '../core';
import { PATIENT_ARCHETYPES, type PatientArchetype } from '../../data/medical/archetypes';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const TEST_EMAIL_DOMAIN = 'example.com';
const TEST_PHONE_PREFIX = '+9199999';

/** Map descriptive PreferredLanguage → ISO LocaleCode (schema enum). */
const PREFERRED_LANGUAGE_TO_LOCALE_CODE: Readonly<Record<string, LocaleCode>> = {
  hindi: 'hi',
  english: 'en',
  punjabi: 'pa',
  bengali: 'bn',
  tamil: 'ta',
  telugu: 'te',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  odia: 'or',
  assamese: 'as',
  urdu: 'ur',
  en: 'en',
  hi: 'hi',
  pa: 'pa',
  bn: 'bn',
  ta: 'ta',
  te: 'te',
  mr: 'mr',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  or: 'or',
  as: 'as',
  ur: 'ur',
};

const BLOOD_GROUP_DISTRIBUTION = [
  { weight: 30, value: 'O+' },
  { weight: 22, value: 'B+' },
  { weight: 20, value: 'A+' },
  { weight: 8, value: 'AB+' },
  { weight: 6, value: 'O-' },
  { weight: 5, value: 'A-' },
  { weight: 4, value: 'B-' },
  { weight: 2, value: 'AB-' },
  { weight: 3, value: 'unknown' },
] as const;

function deriveSafetyConstraints(opts: {
  pregnancyStatus: PregnancyStatus | null;
  smokingStatus: SmokingStatus | null;
  medicalConditions: readonly string[];
  currentMedications: readonly string[];
  allergies: readonly string[];
}): string[] {
  const constraints: string[] = [];
  if (opts.pregnancyStatus === 'PREGNANT') {
    constraints.push('NO_NSAIDS', 'NO_TETRACYCLINES', 'NO_LIDOCAINE_HIGH_DOSE');
  }
  if (opts.pregnancyStatus === 'BREASTFEEDING') {
    constraints.push('LACTATION_SAFE_ONLY');
  }
  if (opts.medicalConditions.some((c) => c.includes('diabetes'))) {
    constraints.push('DIABETES_AWARE_DOSING');
  }
  if (
    opts.medicalConditions.some(
      (c) => c.includes('cardiac') || c.includes('CABG') || c.includes('atrial'),
    )
  ) {
    constraints.push('CARDIAC_AWARE', 'AB_PROPHYLAXIS_REQUIRED');
  }
  if (
    opts.currentMedications.includes('warfarin') ||
    opts.currentMedications.includes('aspirin') ||
    opts.currentMedications.includes('aspirin-75mg')
  ) {
    constraints.push('BLEEDING_RISK', 'AVOID_NSAIDS');
  }
  if (opts.allergies.length > 0) {
    constraints.push(`ALLERGIES:${opts.allergies.join(',')}`);
  }
  return constraints;
}

interface PatientTransient {
  readonly userId?: string;
  readonly clinicId?: string;
  readonly homeClinicId?: string; // legacy alias
  readonly archetypeId?: string;
  readonly preferredLocale?: string; // accepts both 'hindi' and 'hi'
}

export const patientFactory = defineFactory<Patient, PatientTransient>({
  name: 'patient',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    // ── Step 1: Resolve archetype ──
    const archetype: PatientArchetype = transient.archetypeId
      ? (PATIENT_ARCHETYPES.find((a) => a.id === transient.archetypeId) ?? PATIENT_ARCHETYPES[0]!)
      : faker.helpers.weightedArrayElement(
          PATIENT_ARCHETYPES.map((a) => ({ weight: a.weight, value: a })),
        );

    // ── Step 2: Demographics from archetype ──
    const gender: Gender = faker.helpers.arrayElement([...archetype.gender]);
    const ageYears = faker.number.int({
      min: archetype.age.min,
      max: archetype.age.max,
    });
    const dateOfBirth = new Date(
      new Date().getFullYear() - ageYears,
      faker.number.int({ min: 0, max: 11 }),
      faker.number.int({ min: 1, max: 28 }),
    );
    const pregnancyStatus: PregnancyStatus = faker.helpers.arrayElement([
      ...archetype.pregnancyStatus,
    ]);
    const smokingStatus: SmokingStatus = faker.helpers.arrayElement([...archetype.smokingStatus]);

    // ── Step 3: Locale (descriptive input → ISO at build time for Prisma) ──
    const rawLocale: string =
      transient.preferredLocale ?? archetype.preferredLanguages[0] ?? 'english';
    const preferredLocale: LocaleCode =
      PREFERRED_LANGUAGE_TO_LOCALE_CODE[rawLocale.toLowerCase()] ?? 'en';

    // ── Step 4: Identity ──
    const firstName =
      gender === 'FEMALE'
        ? faker.person.firstName('female')
        : gender === 'MALE'
          ? faker.person.firstName('male')
          : faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;

    // ── Step 5: Contact (DPDP-safe synthetic) ──
    const phoneSuffix = String(sequence).padStart(5, '0').slice(-5);
    const phone = `${TEST_PHONE_PREFIX}${phoneSuffix}`;
    const email =
      faker.helpers.maybe(() => `${firstName}_${lastName}@${TEST_EMAIL_DOMAIN}`, {
        probability: 0.6,
      }) ?? null;

    // ── Step 6: Tenant scoping ──
    const clinicId = transient.clinicId ?? transient.homeClinicId ?? null;

    // ── Step 7: Medical history from archetype (REAL ARRAYS) ──
    const allergiesArr = [...archetype.allergies];
    const medicalConditionsArr = [...archetype.medicalConditions];
    const currentMedicationsArr = [...archetype.currentMedications];
    const comorbidConditionsArr = [...archetype.comorbidConditionIcd10];

    // ── Step 8: Dental history (defensive Math.max for years) ──
    const dentalHistoryObj = {
      lastVisit:
        ageYears >= 6
          ? faker.date.past({ years: faker.number.int({ min: 1, max: 5 }) }).toISOString()
          : null,
      previousProcedures: faker.helpers.arrayElements(
        ['scaling', 'filling', 'extraction', 'root-canal', 'crown', 'cleaning'],
        { min: 0, max: 3 },
      ),
      chiefComplaintHistory: archetype.typicalChiefComplaint,
    };

    // ── Step 9: Lifestyle ──
    const tobaccoUse = archetype.tobaccoUse;
    const alcoholUse =
      faker.helpers.maybe(() => faker.datatype.boolean({ probability: 0.3 }), {
        probability: 0.7,
      }) ?? null;

    // ── Step 10: Safety constraints (REAL ARRAY) ──
    const safetyConstraintsArr = deriveSafetyConstraints({
      pregnancyStatus,
      smokingStatus,
      medicalConditions: medicalConditionsArr,
      currentMedications: currentMedicationsArr,
      allergies: allergiesArr,
    });

    // ── Step 11: SES + residence + education ──
    const sesTier = faker.helpers.arrayElement([...archetype.socioEconomicTier]);
    const residence = faker.helpers.arrayElement([...archetype.residence]);
    const educationLevel = faker.helpers.arrayElement([...archetype.educationLevel]);

    // ── Step 12: Insurance + referral ──
    const insuranceProvider = faker.helpers.arrayElement([...archetype.insuranceLikely]);
    const referralChannel = faker.helpers.arrayElement([...archetype.referralChannels]);
    const insuranceId =
      insuranceProvider !== 'CASH'
        ? `${insuranceProvider}-${faker.string.alphanumeric(10).toUpperCase()}`
        : null;

    // ── Step 13: Blood group ──
    const bloodGroup = faker.helpers.weightedArrayElement([...BLOOD_GROUP_DISTRIBUTION]);

    // ── Step 14: Emergency contact ──
    const emergencyContactName =
      faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.5 }) ?? null;
    const emergencyContactPhone = emergencyContactName
      ? `${TEST_PHONE_PREFIX}${faker.string.numeric(5)}`
      : null;

    // ── Step 15: DPDP retention ──
    const createdAt = faker.date.past({ years: 2 });
    const consentVersion = 'v1.0';
    const lastConsentRenewedAt = createdAt;
    const retentionUntil = new Date(createdAt);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 7);

    return {
      // ── UUID for Prisma compliance (@db.Uuid schema constraint) ──
      id: faker.string.uuid(),
      userId: transient.userId ?? faker.string.uuid(),

      firstName,
      lastName,
      fullName,
      dateOfBirth,
      ageYears,
      gender,
      phone,
      email,
      preferredLocale, // ISO format ('hi', 'ta') — schema enum compliant

      verifiedNameAt: null,
      kycLevel: 'NONE',
      governmentIdHash: null,
      abhaId: null,

      clinicId,

      bloodGroup,
      // Json? fields → JSON.stringify (Prisma accepts string for Json type)
      allergies: JSON.stringify(allergiesArr) as unknown as Patient['allergies'],
      knownAllergies: JSON.stringify(allergiesArr) as unknown as Patient['knownAllergies'],
      medicalConditions: JSON.stringify(
        medicalConditionsArr,
      ) as unknown as Patient['medicalConditions'],
      currentMedications: JSON.stringify(
        currentMedicationsArr,
      ) as unknown as Patient['currentMedications'],
      dentalHistory: JSON.stringify(dentalHistoryObj) as unknown as Patient['dentalHistory'],
      emergencyContactName,
      emergencyContactPhone,
      lastDentalVisit:
        ageYears >= 6 ? faker.date.past({ years: faker.number.int({ min: 1, max: 5 }) }) : null,

      smokingStatus,
      tobaccoUse,
      alcoholUse,
      pregnancyStatus,

      insuranceProvider: insuranceProvider !== 'CASH' ? insuranceProvider : null,
      insurancePolicyNumber: insuranceId,

      primaryConditionIcd10: archetype.primaryConditionIcd10,
      // String[] schema fields → REAL ARRAYS (Prisma rejects strings here)
      comorbidConditionsIcd10: comorbidConditionsArr,
      sesTier,
      residence,
      educationLevel,
      insuranceId,
      referralChannel,
      safetyConstraints: safetyConstraintsArr, // REAL ARRAY
      archetypeKey: archetype.id,

      consentVersion,
      lastConsentRenewedAt,
      retentionUntil,
      createdAt,
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Patient;
  },

  persist: async (patient, prisma) => {
    // Build output is already Prisma-compatible — pass through
    const created = await prisma.patient.create({
      data: prismaInput<Prisma.PatientUncheckedCreateInput>(
        patient as unknown as Prisma.PatientUncheckedCreateInput,
      ),
    });
    return created as unknown as Patient;
  },
});

// ─── Convenience builders ─────────────────────────────────────────
export const buildPregnantPatient = (
  overrides?: Partial<Patient>,
  transient?: Omit<PatientTransient, 'archetypeId'>,
) => patientFactory.build(overrides, { ...transient, archetypeId: 'arch-001' });

export const buildDiabeticPatient = (
  overrides?: Partial<Patient>,
  transient?: Omit<PatientTransient, 'archetypeId'>,
) => patientFactory.build(overrides, { ...transient, archetypeId: 'arch-004' });

export const buildPediatricPatient = (
  overrides?: Partial<Patient>,
  transient?: Omit<PatientTransient, 'archetypeId'>,
) => patientFactory.build(overrides, { ...transient, archetypeId: 'arch-011' });

export const buildGeriatricPatient = (
  overrides?: Partial<Patient>,
  transient?: Omit<PatientTransient, 'archetypeId'>,
) => patientFactory.build(overrides, { ...transient, archetypeId: 'arch-021' });

export const buildCardiacPatient = (
  overrides?: Partial<Patient>,
  transient?: Omit<PatientTransient, 'archetypeId'>,
) => patientFactory.build(overrides, { ...transient, archetypeId: 'arch-008' });
