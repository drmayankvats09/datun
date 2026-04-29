// ═══════════════════════════════════════════════════════════════
// CONSULTATION SCHEMAS — Start, message, complete
// FIXES: z.unknown() replaced with typed content blocks.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { stringIdField, localeField } from '../primitives/index';

// ── Chat Message Content Blocks (typed — no more z.unknown()) ──

/** Text content block */
const textContentBlock = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(10_000),
});

/** Image content block — base64 encoded dental photo */
const imageContentBlock = z.object({
  type: z.literal('image'),
  source: z.object({
    type: z.literal('base64'),
    media_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    data: z.string().min(1),
  }),
});

/** Single message in a conversation */
const chatMessageItemSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string().min(1),
    z.array(z.union([textContentBlock, imageContentBlock])).min(1),
  ]),
});

// ── Request Schemas (names preserved from old schemas.ts) ──

export const chatMessageSchema = z.object({
  messages: z.array(chatMessageItemSchema).min(1),
  language: z.string().max(10).default('en'),
  patientName: z.string().max(100).optional(),
  patientAge: z.string().max(5).optional(),
  patientGender: z.string().max(30).optional(),
  sessionId: z.string().max(100).optional(),
});

export const consultationStartSchema = z.object({
  clientUuid: stringIdField,
  language: localeField,
});

export const consultationMessageSchema = z.object({
  messages: z.array(chatMessageItemSchema).min(1),
  language: z.string().max(10).optional(),
});

/** Consultation complete — findings, prescription, summary */
export const consultationCompleteSchema = z.object({
  findings: z.string().max(5000).optional(),
  prescription: z.string().max(10_000).optional(),
  summary: z.string().max(2000).optional(),
  diagnosis: z.string().max(500).optional(),
  urgency: z.enum(['EMERGENCY', 'URGENT', 'MODERATE', 'ROUTINE']).optional(),
});

// ── Type Exports ──

export type ChatMessageItem = z.infer<typeof chatMessageItemSchema>;
export type ChatMessageRequest = z.infer<typeof chatMessageSchema>;
export type ConsultationStartRequest = z.infer<typeof consultationStartSchema>;
export type ConsultationMessageRequest = z.infer<typeof consultationMessageSchema>;
export type ConsultationCompleteRequest = z.infer<typeof consultationCompleteSchema>;
