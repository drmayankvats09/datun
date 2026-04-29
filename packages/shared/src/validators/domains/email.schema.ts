// ═══════════════════════════════════════════════════════════════
// EMAIL SCHEMAS — Zod validation for email operations
// Connected to Task #38 Zod system.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { emailField } from '../primitives/index';

/** All valid email template names */
export const emailTemplateNameSchema = z.enum([
  'otp',
  'welcome',
  'consultation_complete',
  'follow_up_3day',
  'follow_up_7day',
  'password_reset',
  'security_alert',
  'clinic_welcome',
  'clinic_lead',
  'payment_receipt',
  'admin_alert',
  'daily_report',
]);

/** Email send request validation */
export const emailSendRequestSchema = z.object({
  to: emailField,
  template: emailTemplateNameSchema,
  vars: z.record(z.unknown()).default({}),
  locale: z.string().max(10).default('en'),
  userId: z.string().uuid().optional(),
  consultationId: z.string().uuid().optional(),
});

/** Email log query validation */
export const emailLogQuerySchema = z.object({
  to: z.string().email().optional(),
  template: emailTemplateNameSchema.optional(),
  status: z.enum(['QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED']).optional(),
  from: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
});

// ── Type Exports ──

export type EmailTemplateName = z.infer<typeof emailTemplateNameSchema>;
export type EmailSendRequest = z.infer<typeof emailSendRequestSchema>;
export type EmailLogQuery = z.infer<typeof emailLogQuerySchema>;
