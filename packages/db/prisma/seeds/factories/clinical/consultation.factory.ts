// ═══════════════════════════════════════════════════════════════
// CONSULTATION FACTORY — AI dental consultation entity
//
// This is the most complex factory. Pulls from ALL data layers:
//   • Patient archetype → drives diagnosis + symptoms
//   • ICD-10 condition → drives clinical detail
//   • Treatment protocol → drives plan + investigations
//   • Locale bundle → drives chief complaint language
//   • Salts → drives prescription medications
//
// Each consultation also TRIGGERS message generation in afterCreate.
// ═══════════════════════════════════════════════════════════════

import type { Consultation, ConsultationStatus, PrismaClient, UrgencyLevel } from '@prisma/client';
import { defineFactory } from '../core';
import { getConditionByIcd10, pickRealisticCondition } from '../../data/medical/conditions';
import {
  getProtocolsByIcd10,
  type TreatmentProtocol,
} from '../../data/scenarios/treatment-protocols';
import { getRemediesForCondition } from '../../data/medical/home-remedies';
import { resolveLocale } from '../../data/linguistic/locales';

interface ConsultationTransient {
  /** Patient ID required */
  readonly patientId: string;
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
  /** Locale for chief complaint */
  readonly locale?:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
  /** Patient archetype primary condition (read by factory if patient ID lookup unavailable in build) */
  readonly patientArchetypeIcd10?: string;
  /** Archetype-derived chief complaint */
  readonly chiefComplaint?: string;
}

export const consultationFactory = defineFactory<Consultation, ConsultationTransient>({
  name: 'consultation',
  defaultTransient: { patientId: '' },

  build: ({ sequence, faker, seed, transient }) => {
    if (!transient.patientId) {
      throw new Error('[consultation.factory] patientId is required in transient params');
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
    const locale = transient.locale ?? 'hindi';
    const localeBundle = resolveLocale(locale);
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

    // ── Step 7: Investigations needed ──
    const investigations: string[] = [];
    if (condition.requiresXray) investigations.push('IOPA-X-ray');
    if (condition.requiresOpg) investigations.push('OPG');
    if (condition.requiresCbct) investigations.push('CBCT');
    if (protocol) investigations.push(...protocol.investigationsNeeded);

    // ── Step 8: AI metadata ──
    const aiModelUsed: string = faker.helpers.weightedArrayElement([
      { weight: 70, value: 'claude-sonnet-4' },
      { weight: 20, value: 'claude-haiku-4-5' },
      { weight: 10, value: 'gpt-4-turbo' }, // failover
    ]);

    const startedAt = faker.date.recent({ days: 90 });
    const completedAt =
      status === 'COMPLETED'
        ? new Date(
            startedAt.getTime() + faker.number.int({ min: 5 * 60 * 1000, max: 45 * 60 * 1000 }),
          )
        : null;

    return {
      id: `consultation-${String(sequence).padStart(8, '0')}`,
      patientId: transient.patientId,
      doctorId: transient.doctorId ?? null,
      clinicId: transient.clinicId ?? null,

      // Clinical
      chiefComplaint,
      chiefComplaintLocale: locale,
      symptomDurationDays: faker.number.int({ min: 1, max: 365 }),
      painSeverityScore: faker.number.int({ min: 0, max: 10 }),

      // Diagnosis
      primaryDiagnosisIcd10: condition.icd10Code,
      primaryDiagnosisName: condition.nameEnglish,
      primaryDiagnosisNameLocal: condition.nameHindi,
      differentialDiagnoses: JSON.stringify([]),
      severity: condition.severity,
      urgency,

      // Treatment plan
      treatmentPlanEnglish: protocol?.treatmentPlanEnglish ?? 'Routine examination and counselling',
      treatmentPlanHindi: protocol?.treatmentPlanHindi ?? 'सामान्य जांच और सलाह',
      typicalCostInrMin: protocol?.typicalCostInr.min ?? 500,
      typicalCostInrMax: protocol?.typicalCostInr.max ?? 1500,
      sessionsRequired: protocol?.typicalSessions ?? 1,

      // Investigations
      investigationsRecommended: JSON.stringify([...new Set(investigations)]),
      requiresXray: condition.requiresXray,
      requiresOpg: condition.requiresOpg,
      requiresCbct: condition.requiresCbct,

      // Home remedies (denormalized for PDF)
      homeRemediesProvided: JSON.stringify(homeRemedies.map((r) => r.id)),

      // Red flags + handoff
      redFlagsDetected: JSON.stringify(protocol?.redFlags ?? []),
      escalatedToHuman: status === 'ESCALATED',
      escalationReason:
        status === 'ESCALATED' ? 'High urgency requires in-person evaluation' : null,

      // Photos
      photoUrls: JSON.stringify([]),
      photoAnalysisFindings: null,

      // PDF
      pdfReportUrl:
        status === 'COMPLETED'
          ? `https://r2.datunai.com/reports/consultation-${sequence}.pdf`
          : null,
      pdfGeneratedAt: status === 'COMPLETED' ? completedAt : null,

      // AI telemetry
      aiModelUsed,
      aiInputTokens: faker.number.int({ min: 800, max: 8000 }),
      aiOutputTokens: faker.number.int({ min: 200, max: 2500 }),
      aiCostUsd: faker.number.float({ min: 0.01, max: 0.4, fractionDigits: 4 }),
      aiLatencyMs: faker.number.int({ min: 800, max: 12000 }),

      // Status + lifecycle
      status,
      startedAt,
      completedAt,
      abandonedAt: status === 'ABANDONED' ? new Date(startedAt.getTime() + 5 * 60 * 1000) : null,

      // Follow-up
      followUp3DaySent: status === 'COMPLETED' && faker.datatype.boolean({ probability: 0.7 }),
      followUp3DaySentAt: null,
      followUp7DaySent: status === 'COMPLETED' && faker.datatype.boolean({ probability: 0.5 }),
      followUp7DaySentAt: null,

      // Patient feedback
      patientRating:
        status === 'COMPLETED'
          ? (faker.helpers.maybe(() => faker.number.int({ min: 3, max: 5 }), {
              probability: 0.4,
            }) ?? null)
          : null,
      patientFeedback: null,

      createdAt: startedAt,
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Consultation;
  },

  persist: async (consultation, prisma) => {
    return prisma.consultation.upsert({
      where: { id: consultation.id },
      create: consultation as never,
      update: { updatedAt: new Date() },
    });
  },
});
