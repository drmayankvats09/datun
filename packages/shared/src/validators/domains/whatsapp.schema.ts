// ═══════════════════════════════════════════════════════════════
// WHATSAPP SCHEMAS — Zod validation for send + webhook
// Connected to Task #38 Zod system.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/** Indian phone number — E.164 without + (e.g. 919999999999) */
export const indianPhoneSchema = z
  .string()
  .regex(/^91\d{10}$/, 'Phone must be in 91XXXXXXXXXX format');

/** Provider name */
export const whatsappProviderSchema = z.enum(['meta', 'gupshup', 'aisensy']);

/** Template component */
export const templateComponentSchema = z.object({
  type: z.enum(['body', 'header', 'button']),
  parameters: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string().max(1024),
    }),
  ),
});

/** Send text request */
export const whatsappSendTextSchema = z.object({
  to: indianPhoneSchema,
  body: z.string().min(1).max(4096),
  userId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
});

/** Send template request */
export const whatsappSendTemplateSchema = z.object({
  to: indianPhoneSchema,
  templateName: z.string().min(1).max(64),
  components: z.array(templateComponentSchema).default([]),
  userId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
});

/** Unified incoming message (post-normalization) */
export const unifiedIncomingMessageSchema = z.object({
  provider: whatsappProviderSchema,
  messageId: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.enum(['text', 'image', 'document', 'button', 'interactive', 'other']),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  timestamp: z.number().int(),
  raw: z.unknown(),
});

/** Unified status update (post-normalization) */
export const unifiedStatusUpdateSchema = z.object({
  provider: whatsappProviderSchema,
  messageId: z.string(),
  recipientPhone: z.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  timestamp: z.number().int(),
  raw: z.unknown(),
});

// ── Type Exports ──

export type WhatsappProvider = z.infer<typeof whatsappProviderSchema>;
export type WhatsappSendTextRequest = z.infer<typeof whatsappSendTextSchema>;
export type WhatsappSendTemplateRequest = z.infer<typeof whatsappSendTemplateSchema>;
export type UnifiedIncomingMessage = z.infer<typeof unifiedIncomingMessageSchema>;
export type UnifiedStatusUpdate = z.infer<typeof unifiedStatusUpdateSchema>;
