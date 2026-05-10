// ═══════════════════════════════════════════════════════════════
// CONSULTATION FACTORY — AI dental consultation entity
//
// SCHEMA-ALIGNED v2.0 — every field below corresponds to an actual
// column in `Consultation` model. Earlier version had 30+ phantom
// fields that crashed bulkInsert with PrismaClientValidationError.
//
// REQUIRED inputs (transient):
//   • patientId  (UUID — FK to Patient)
//   • userId     (UUID — FK to User; the patient's user account)
//
// OPTIONAL inputs:
//   • initiatedByUserId — defaults to userId (self-initiated by patient)
//   • doctorId, clinicId, forceIcd10, forceUrgency, forceStatus, locale
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import type {
  Consultation,
  ConsultationStatus,
  LocaleCode,
  PrismaClient,
  UrgencyLevel,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { defineFactory } from '../core';
import { getConditionByIcd10, pickRealisticCondition } from '../../data/medical/conditions';
import {
  getProtocolsByIcd10,
  type TreatmentProtocol,
} from '../../data/scenarios/treatment-protocols';
import { getRemediesForCondition } from '../../data/medical/home-remedies';
import { resolveLocale } from '../../data/linguistic/locales';

interface ConsultationTransient {
  /** Patient ID — REQUIRED */
  readonly patientId: string;
  /** User ID for the patient — REQUIRED for User FK */
  readonly userId: string;
  /** User who initiated — defaults to userId */
  readonly initiatedByUserId?: string;
  /** Doctor ID — null means AI-only consultation */
  readonly doctorId?: string | null;
  /** Clinic ID — context for routing */
  readonly clinicId?: string | null;
  /** Force specific ICD-10 (else uses patient's primary condition) */
  readonly forceIcd10?: string;
  /** Force urgency */
  readonly forceUrgency?: UrgencyLevel;
  /** Force status */
  readonly forceStatus?: ConsultationStatus;
  /** Patient's preferred locale (2-letter code: 'en', 'hi', etc.) */
  readonly locale?: LocaleCode;
  /** Patient archetype primary condition */
  readonly patientArchetypeIcd10?: string;
  /** Archetype-derived chief complaint */
  readonly chiefComplaint?: string;
}

/** Map full-language strings to LocaleCode enum (2-letter ISO codes used in schema) */
const LANG_TO_LOCALE_CODE: Record<string, LocaleCode> = {
  english: 'en',
  hindi: 'hi',
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
};

function toLocaleCode(input: string | undefined): LocaleCode {
  if (!input) return 'hi';
  const normalized = input.toLowerCase();
  // Already a valid 2-letter code?
  if (
    ['en', 'hi', 'pa', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'as'].includes(normalized)
  ) {
    return normalized as LocaleCode;
  }
  return LANG_TO_LOCALE_CODE[normalized] ?? 'hi';
}

export const consultationFactory = defineFactory<Consultation, ConsultationTransient>({
  name: 'consultation',
  defaultTransient: { patientId: '', userId: '' },

  build: ({ faker, seed, transient }) => {
    if (!transient.patientId) {
      throw new Error('[consultation.factory] patientId is required in transient params');
    }
    if (!transient.userId) {
      throw new Error('[consultation.factory] userId is required in transient params');
    }

    // ── Step 1: Resolve ICD-10 condition ──
    const icd10Code =
      transient.forceIcd10 ??
      transient.patientArchetypeIcd10 ??
      pickRealisticCondition(seed).icd10Code;
    const condition = getConditionByIcd10(icd10Code) ?? pickRealisticCondition(seed);

    // ── Step 2: Pick treatment protocol ──
    const protocols = getProtocolsByIcd10(condition.icd10Code);
    const protocol: TreatmentProtocol | undefined =
      protocols.length > 0 ? faker.helpers.arrayElement(protocols) : undefined;

    // ── Step 3: Resolve urgency ──
    const urgency: UrgencyLevel = transient.forceUrgency ?? condition.defaultUrgency;

    // ── Step 4: Resolve status ──
    const status: ConsultationStatus =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement([
        { weight: 70, value: 'COMPLETED' },
        { weight: 15, value: 'IN_PROGRESS' },
        { weight: 8, value: 'ABANDONED' },
        { weight: 5, value: 'AWAITING_PATIENT' },
        { weight: 2, value: 'ESCALATED' },
      ]);

    // ── Step 5: Locale + chief complaint ──
    const localeCode: LocaleCode = toLocaleCode(transient.locale);
    const localeBundle = resolveLocale(localeCode);
    const chiefComplaint =
      transient.chiefComplaint ?? faker.helpers.arrayElement(localeBundle.patientOpeners);

    // ── Step 6: Home remedies relevant to condition ──
    const remedyKeyword = condition.chapter.startsWith('K04')
      ? 'pain'
      : condition.chapter.startsWith('K05')
        ? 'gum-bleeding'
        : condition.chapter.startsWith('K12')
          ? 'ulcer'
          : 'routine';
    const homeRemedies = getRemediesForCondition(remedyKeyword);

    // ── Step 7: Investigations needed (Json field) ──
    const investigations: string[] = [];
    if (condition.requiresXray) investigations.push('IOPA-X-ray');
    if (condition.requiresOpg) investigations.push('OPG');
    if (condition.requiresCbct) investigations.push('CBCT');
    if (protocol) investigations.push(...protocol.investigationsNeeded);

    // ── Step 8: AI metadata ──
    const aiModel: string = faker.helpers.weightedArrayElement([
      { weight: 70, value: 'claude-sonnet-4' },
      { weight: 20, value: 'claude-haiku-4-5' },
      { weight: 10, value: 'gpt-4-turbo' },
    ]);

    const startedAt = faker.date.recent({ days: 90 });
    const completedAt =
      status === 'COMPLETED'
        ? new Date(
            startedAt.getTime() + faker.number.int({ min: 5 * 60 * 1000, max: 45 * 60 * 1000 }),
          )
        : null;

    // Construct an object that matches Prisma's ConsultationUncheckedCreateInput exactly.
    // Every field below maps to a real column in `model Consultation`.
    return {
      id: randomUUID(),
      patientId: transient.patientId,
      userId: transient.userId,
      initiatedByUserId: transient.initiatedByUserId ?? transient.userId,
      doctorId: transient.doctorId ?? null,
      clinicId: transient.clinicId ?? null,

      // Status + lifecycle
      status,
      language: localeCode,

      // Clinical (text fields)
      chiefComplaint,
      diagnosis: condition.nameEnglish,
      treatmentPlan: protocol?.treatmentPlanEnglish ?? 'Routine examination and counselling',
      homeRemedies: homeRemedies.map((r) => r.id).join(', '),

      // Json fields — pass arrays/objects directly (Prisma serializes)
      dosList: Prisma.JsonNull,
      dontsList: Prisma.JsonNull,
      redFlags: protocol?.redFlags ?? Prisma.JsonNull,
      medications: Prisma.JsonNull,
      investigationsNeeded: [...new Set(investigations)],
      photoUrls: Prisma.JsonNull,
      safetyFlags: Prisma.JsonNull,

      // Diagnosis ICD-10
      primaryDiagnosisIcd10: condition.icd10Code,
      icd10Code: condition.icd10Code,
      icd10ChapterCode: condition.chapter,
      severity: urgency,
      urgency,
      chiefComplaintLocale: localeCode,

      // AI tracking
      aiProvider: 'claude',
      aiModel,
      aiLatencyMs: faker.number.int({ min: 800, max: 12000 }),
      aiTokensUsed: faker.number.int({ min: 1000, max: 10500 }),
      aiCostUsd: new Prisma.Decimal(faker.number.float({ min: 0.01, max: 0.4, fractionDigits: 4 })),

      // Source + metadata
      sourceChannel: 'WEB',
      isAiOnly: !transient.doctorId,
      requiresPhysicalVisit: urgency === 'EMERGENCY' || urgency === 'URGENT',
      needsHumanReview: status === 'ESCALATED',
      consentGiven: true,
      totalMessages: 0,
      aiCircuitBreakerHits: 0,

      // PDF
      pdfUrl: status === 'COMPLETED' ? `https://r2.datunai.com/reports/${randomUUID()}.pdf` : null,
      pdfGeneratedAt: status === 'COMPLETED' ? completedAt : null,

      // Timestamps
      completedAt,
      createdAt: startedAt,
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Consultation;
  },

  persist: async (consultation, prisma) => {
    return prisma.consultation.upsert({
      where: { id: (consultation as { id: string }).id },
      create: consultation as never,
      update: { updatedAt: new Date() },
    });
  },
});
