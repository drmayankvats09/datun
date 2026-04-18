// ═══════════════════════════════════════════════════════════════
// CONTACTS — Phone numbers, emails, internal alert recipients
// All phone numbers stored WITHOUT + prefix, in E.164 base format.
// ═══════════════════════════════════════════════════════════════

export const CONTACTS = {
  /** Patient-facing support WhatsApp — WhatsApp Business App manual support */
  supportPhone: '918796064170',
  supportPhoneDisplay: '+91 87960 64170',

  /** Founder personal — internal alerts backup */
  founderPhone: '919953135340',

  /** Meta Cloud API sender number — templates/webhook only */
  metaApiPhone: '917018464796',

  /** Internal alert recipients — both get template alerts */
  alertRecipients: ['918796064170', '919953135340'] as readonly string[],

  /** Internal alert template name on Meta */
  internalAlertTemplate: 'datunai_internal_alert',

  /** System email sender (Resend) */
  systemEmailFrom: 'Datun System <system@datunai.com>',

  /** Support email */
  supportEmail: 'support@datunai.com',

  /** Default alert recipient email */
  defaultAlertEmail: 'hello@datunai.com',
} as const;
