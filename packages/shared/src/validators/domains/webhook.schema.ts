// ═══════════════════════════════════════════════════════════════
// WEBHOOK SCHEMAS — WhatsApp Meta Cloud API payload validation
// Replaces: `const body = req.body as WebhookBody` typecast
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

const incomingMessageSchema = z.object({
  from: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  button: z.object({ text: z.string() }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ title: z.string() }).optional(),
    })
    .optional(),
});

const statusEventSchema = z.object({
  id: z.string(),
  status: z.string(),
  recipient_id: z.string(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        title: z.string(),
      }),
    )
    .optional(),
});

export const webhookBodySchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  messages: z.array(incomingMessageSchema).optional(),
                  statuses: z.array(statusEventSchema).optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

// ── Type Exports ──

export type WebhookBody = z.infer<typeof webhookBodySchema>;
export type IncomingMessage = z.infer<typeof incomingMessageSchema>;
export type StatusEvent = z.infer<typeof statusEventSchema>;
