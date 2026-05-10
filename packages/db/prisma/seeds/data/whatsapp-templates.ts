// ═══════════════════════════════════════════════════════════════
// WHATSAPP TEMPLATES — 6 approved Meta Cloud API template registry
// Memory: 6 approved templates exist in production. These IDs are
// referenced by seeded WhatsAppMessage rows for E2E test realism.
//
// REAL template IDs to be hardcoded here once Mayank fetches from
// Meta Business Manager. For Wave 2, placeholder structure locked.
// ═══════════════════════════════════════════════════════════════

export type WhatsAppTemplateName =
  | 'consultation_complete'
  | 'internal_alert'
  | 'three_day_followup'
  | 'seven_day_followup'
  | 'appointment_reminder'
  | 'weekly_tip';

export interface WhatsAppTemplateMeta {
  readonly name: WhatsAppTemplateName;
  readonly displayName: string;
  readonly category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  readonly languageCode: 'en' | 'hi' | 'en_US';
  readonly variableCount: number;
  readonly approvedAtIso: string; // YYYY-MM-DD
}

export const WHATSAPP_TEMPLATES: readonly WhatsAppTemplateMeta[] = [
  {
    name: 'consultation_complete',
    displayName: 'Consultation Complete',
    category: 'UTILITY',
    languageCode: 'en',
    variableCount: 3, // patient name, urgency, PDF link
    approvedAtIso: '2026-03-15',
  },
  {
    name: 'internal_alert',
    displayName: 'Internal Alert',
    category: 'UTILITY',
    languageCode: 'en',
    variableCount: 4, // event type, user, time, details
    approvedAtIso: '2026-03-15',
  },
  {
    name: 'three_day_followup',
    displayName: '3-Day Follow-up',
    category: 'UTILITY',
    languageCode: 'hi',
    variableCount: 2, // patient name, condition
    approvedAtIso: '2026-03-20',
  },
  {
    name: 'seven_day_followup',
    displayName: '7-Day Follow-up',
    category: 'UTILITY',
    languageCode: 'hi',
    variableCount: 2,
    approvedAtIso: '2026-03-20',
  },
  {
    name: 'appointment_reminder',
    displayName: 'Appointment Reminder',
    category: 'UTILITY',
    languageCode: 'en',
    variableCount: 3, // patient name, doctor name, time
    approvedAtIso: '2026-04-01',
  },
  {
    name: 'weekly_tip',
    displayName: 'Weekly Dental Tip',
    category: 'MARKETING',
    languageCode: 'hi',
    variableCount: 1, // tip text
    approvedAtIso: '2026-04-10',
  },
] as const;
