// ═══════════════════════════════════════════════════════════════
// AUXILIARY CLINICAL MODULES — bundled together for shared deps
// Photos + Voice + AI Cost + Handoff + Followup conversations
// ═══════════════════════════════════════════════════════════════

import type { Consultation } from '@prisma/client';
import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { consultationPhotoFactory } from '../../factories/clinical/consultation-photo.factory';
import { voiceTranscriptFactory } from '../../factories/clinical/voice-transcript.factory';
import { aiCostEventFactory } from '../../factories/clinical/ai-cost-event.factory';
import { handoffEventFactory } from '../../factories/clinical/handoff-event.factory';
import { followupConversationFactory } from '../../factories/clinical/followup-conversation.factory';

// ─── Photos ────────────────────────────────────────────────────
export const consultationPhotosModule = defineModule({
  name: 'clinical.consultation-photos',
  description: 'Photo uploads with Claude Vision analysis records (~25% of consultations)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['consultationPhoto'],
  factoriesUsed: ['consultationPhoto'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS],
  providesRegistryKeys: [REGISTRY_KEYS.PHOTO_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(consultationPhotosModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 700);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );

      // ~25% of consultations have at least 1 photo
      const photoIds: string[] = [];
      await runInScope(consultationPhotosModule, ctx, async () => {
        for (const c of consultations) {
          const hash = c.id.charCodeAt(c.id.length - 1) % 100;
          if (hash >= 25) continue;
          const photoCount = (hash % 3) + 1;
          for (let i = 0; i < photoCount; i++) {
            const photo = consultationPhotoFactory.build(undefined, {
              consultationId: c.id,
              patientId: c.patientId,
              ...({ forceVisionAnalysisCompleted: true } as Record<string, unknown>),
            });
            photoIds.push(photo.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.PHOTO_IDS, photoIds);
      ctx.logger.info(`✓ Photos built`, { count: photoIds.length });

      return {
        recordsCreated: 0,
        recordsSkipped: photoIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['consultationPhoto'],
        modelsTouched: ['consultationPhoto'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

// ─── Voice Transcripts ─────────────────────────────────────────
export const voiceTranscriptsModule = defineModule({
  name: 'clinical.voice-transcripts',
  description: 'Whisper/Bhashini voice transcription records (~15% of consultations)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['voiceTranscript'],
  factoriesUsed: ['voiceTranscript'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS],
  providesRegistryKeys: [REGISTRY_KEYS.VOICE_TRANSCRIPT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(voiceTranscriptsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 720);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );

      const voiceIds: string[] = [];
      await runInScope(voiceTranscriptsModule, ctx, async () => {
        for (const c of consultations) {
          const hash = c.id.charCodeAt(c.id.length - 1) % 100;
          if (hash >= 15) continue;
          const transcript = voiceTranscriptFactory.build(undefined, {
            ...({ consultationId: c.id } as Record<string, unknown>),
            locale: c.chiefComplaintLocale as
              | 'hindi'
              | 'english'
              | 'punjabi'
              | 'bengali'
              | 'tamil'
              | 'telugu'
              | 'marathi'
              | 'gujarati',
          });
          voiceIds.push(transcript.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.VOICE_TRANSCRIPT_IDS, voiceIds);
      return {
        recordsCreated: 0,
        recordsSkipped: voiceIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['voiceTranscript'],
        modelsTouched: ['voiceTranscript'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

// ─── AI Cost Events ────────────────────────────────────────────
export const aiCostEventsModule = defineModule({
  name: 'clinical.ai-cost-events',
  description: 'Per-LLM-call cost events (1-3 per consultation)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['aiCostEvent'],
  factoriesUsed: ['aiCostEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS],
  providesRegistryKeys: [REGISTRY_KEYS.AI_COST_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(aiCostEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 740);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );

      const costIds: string[] = [];
      await runInScope(aiCostEventsModule, ctx, async () => {
        for (const c of consultations) {
          const callCount = 1 + (c.id.charCodeAt(c.id.length - 1) % 3);
          for (let i = 0; i < callCount; i++) {
            const evt = aiCostEventFactory.build(undefined, { consultationId: c.id });
            costIds.push(evt.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.AI_COST_EVENT_IDS, costIds);
      ctx.logger.info(`✓ AI cost events built`, { count: costIds.length });

      return {
        recordsCreated: 0,
        recordsSkipped: costIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['aiCostEvent'],
        modelsTouched: ['aiCostEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

// ─── Handoff Events ────────────────────────────────────────────
export const handoffEventsModule = defineModule({
  name: 'clinical.handoff-events',
  description: 'AI-to-doctor handoff events (~25% of consultations)',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['handoffEvent'],
  factoriesUsed: ['handoffEvent'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS, REGISTRY_KEYS.DOCTOR_IDS],
  providesRegistryKeys: [REGISTRY_KEYS.HANDOFF_EVENT_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(handoffEventsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 760);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );
      const doctorIds = ctx.registry.getRequired<string[]>(REGISTRY_KEYS.DOCTOR_IDS);

      const handoffIds: string[] = [];
      await runInScope(handoffEventsModule, ctx, async () => {
        for (let i = 0; i < consultations.length; i++) {
          const c = consultations[i]!;
          const hash = c.id.charCodeAt(c.id.length - 1) % 100;
          if (hash >= 25) continue;
          const handoff = handoffEventFactory.build(undefined, {
            consultationId: c.id,
            patientId: c.patientId,
            ...({ assignedDoctorId: doctorIds[i % doctorIds.length] } as Record<string, unknown>),
          });
          handoffIds.push(handoff.id);
        }
      });

      ctx.registry.set(REGISTRY_KEYS.HANDOFF_EVENT_IDS, handoffIds);
      return {
        recordsCreated: 0,
        recordsSkipped: handoffIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['handoffEvent'],
        modelsTouched: ['handoffEvent'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});

// ─── Followup Conversations ────────────────────────────────────
export const followupConversationsModule = defineModule({
  name: 'clinical.followup-conversations',
  description: '3-day + 7-day followups for completed consultations',
  category: 'clinical',
  version: '2.0.0',
  dependencies: ['clinical.consultations'],
  modelsTouched: ['followupConversation'],
  factoriesUsed: ['followupConversation'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },
  consumesRegistryKeys: [REGISTRY_KEYS.CONSULTATION_RECORDS],
  providesRegistryKeys: [REGISTRY_KEYS.FOLLOWUP_CONVERSATION_IDS],

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(followupConversationsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 780);
      const consultations = ctx.registry.getRequired<Consultation[]>(
        REGISTRY_KEYS.CONSULTATION_RECORDS,
      );

      const followupIds: string[] = [];
      await runInScope(followupConversationsModule, ctx, async () => {
        for (const c of consultations) {
          if (c.status !== 'COMPLETED') continue;
          // 3-day followup
          const f3 = followupConversationFactory.build(undefined, { dayMark: 3 } as never);
          followupIds.push(f3.id);
          // ~50% also get 7-day
          if (c.id.charCodeAt(0) % 2 === 0) {
            const f7 = followupConversationFactory.build(undefined, { dayMark: 7 } as never);
            followupIds.push(f7.id);
          }
        }
      });

      ctx.registry.set(REGISTRY_KEYS.FOLLOWUP_CONVERSATION_IDS, followupIds);
      return {
        recordsCreated: 0,
        recordsSkipped: followupIds.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['followupConversation'],
        modelsTouched: ['followupConversation'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { note: 'persisted only if schema supports' },
      };
    }),
});
