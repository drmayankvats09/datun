// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATE RENDERER — Template name → subject + HTML
// Session 1: OTP + admin_alert + daily_report (existing templates)
// Session 2: welcome, consultation_complete, follow-ups, etc.
//
// Pattern: Vercel React Email (simplified — no JSX, pure functions)
// ═══════════════════════════════════════════════════════════════

import { BRAND, COLORS } from '@repo/shared';
import type { EmailTemplateName } from './types.js';

interface RenderedEmail {
  subject: string;
  html: string;
}

type TemplateRenderer = (vars: Record<string, unknown>, locale: string) => RenderedEmail;

// ── Shared Components ──

function emailContainer(content: string): string {
  return `<div style="font-family:Inter,system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:${COLORS.bgDark};color:#fff;padding:32px 24px;border-radius:12px">${content}${emailFooterHtml()}</div>`;
}

function emailFooterHtml(): string {
  return `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e2a3a;text-align:center"><p style="color:${COLORS.muted};font-size:12px;margin:4px 0">${BRAND.tagline}</p><p style="color:#555;font-size:11px;margin:4px 0">© ${new Date().getFullYear()} ${BRAND.legalName}</p><p style="color:#555;font-size:11px;margin:4px 0"><a href="https://datunai.com/unsubscribe" style="color:#555;text-decoration:underline">Unsubscribe</a></p></div>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;color:${COLORS.primary};font-size:22px;font-weight:600">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:8px 0;color:#ddd;font-size:15px;line-height:1.6">${text}</p>`;
}

function button(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="background:${COLORS.primary};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">${text}</a></div>`;
}

function codeBlock(code: string): string {
  return `<div style="background:#111827;border-radius:12px;padding:24px;text-align:center;margin:24px 0"><span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#fff">${code}</span></div>`;
}

// ── Template Definitions ──

const templates: Record<EmailTemplateName, TemplateRenderer> = {
  otp: (vars) => ({
    subject: `${vars['code']} is your ${BRAND.name} verification code`,
    html: emailContainer(
      heading(`${BRAND.name}`) +
        paragraph('Your verification code is:') +
        codeBlock(String(vars['code'])) +
        paragraph('This code expires in 10 minutes. Do not share it with anyone.') +
        `<hr style="border:none;border-top:1px solid #1e2a3a;margin:24px 0">` +
        `<p style="color:#666;font-size:13px">If you didn't request this code, please ignore this email.</p>`,
    ),
  }),

  welcome: (vars, locale) => ({
    subject: locale === 'hi' ? `${BRAND.name} में आपका स्वागत है!` : `Welcome to ${BRAND.name}!`,
    html: emailContainer(
      heading(locale === 'hi' ? `🦷 स्वागत है, ${vars['name']}!` : `🦷 Welcome, ${vars['name']}!`) +
        paragraph(
          locale === 'hi'
            ? 'आपने भारत के पहले AI डेंटल असिस्टेंट से जुड़ गए हैं। कभी भी, कहीं से भी — मुफ्त डेंटल गाइडेंस पाएं।'
            : `You've joined India's first AI dental assistant. Get instant dental guidance — anytime, anywhere, for free.`,
        ) +
        button(
          locale === 'hi' ? 'पहला कंसल्टेशन शुरू करें' : 'Start Your First Consultation',
          'https://datunai.com',
        ) +
        paragraph(
          locale === 'hi' ? '— डॉ. मयंक वत्स, BDS (संस्थापक)' : '— Dr. Mayank Vats, BDS (Founder)',
        ),
    ),
  }),

  consultation_complete: (vars) => ({
    subject: `Your ${BRAND.name} dental report is ready`,
    html: emailContainer(
      heading('🦷 Your Dental Report is Ready') +
        paragraph(`Hi ${vars['name']},`) +
        paragraph(
          `Your AI dental consultation for <strong>${vars['diagnosis'] ?? 'dental concern'}</strong> is complete.`,
        ) +
        (vars['urgency'] === 'EMERGENCY' || vars['urgency'] === 'URGENT'
          ? `<div style="background:#dc2626;color:#fff;padding:12px 16px;border-radius:8px;margin:16px 0;font-weight:600">⚡ ${vars['urgency']} — Please see a dentist as soon as possible.</div>`
          : '') +
        button('View Full Report', `https://datunai.com/report/${vars['consultationId']}`) +
        paragraph('Show this report to your dentist for reference.'),
    ),
  }),

  follow_up_3day: (vars, locale) => ({
    subject:
      locale === 'hi'
        ? `${vars['name']}, कैसा महसूस हो रहा है?`
        : `${vars['name']}, how are you feeling?`,
    html: emailContainer(
      heading(locale === 'hi' ? '3 दिन का फॉलो-अप' : 'Your 3-Day Check-in') +
        paragraph(
          locale === 'hi'
            ? `नमस्ते ${vars['name']}, 3 दिन पहले आपने ${vars['diagnosis']} के लिए हमसे सलाह ली थी।`
            : `Hi ${vars['name']}, 3 days ago you consulted us for ${vars['diagnosis']}.`,
        ) +
        paragraph(
          locale === 'hi'
            ? 'आज कैसा महसूस हो रहा है? अगर अभी भी दर्द है तो डेंटिस्ट से ज़रूर मिलें।'
            : 'How are you feeling today? If pain persists, please visit a dentist.',
        ) +
        button(locale === 'hi' ? 'स्थिति बताएं' : 'Update Your Status', 'https://datunai.com'),
    ),
  }),

  follow_up_7day: (vars, locale) => ({
    subject:
      locale === 'hi' ? `${vars['name']}, एक हफ्ता हो गया` : `${vars['name']}, it's been a week`,
    html: emailContainer(
      heading(locale === 'hi' ? '7 दिन का फॉलो-अप' : 'Your 7-Day Follow-up') +
        paragraph(
          locale === 'hi'
            ? `नमस्ते ${vars['name']}, एक हफ्ता पहले आपने ${vars['diagnosis']} के लिए कंसल्ट किया था।`
            : `Hi ${vars['name']}, a week ago you consulted us for ${vars['diagnosis']}.`,
        ) +
        paragraph(
          locale === 'hi'
            ? 'क्या आपने डेंटिस्ट से मिलना हुआ? अपना स्टेटस बताएं।'
            : 'Have you visited a dentist yet? Let us know your current status.',
        ) +
        button(locale === 'hi' ? 'अपडेट दें' : 'Share Update', 'https://datunai.com'),
    ),
  }),

  password_reset: (vars) => ({
    subject: `Reset your ${BRAND.name} password`,
    html: emailContainer(
      heading('🔐 Password Reset') +
        paragraph(`Hi ${vars['name'] ?? 'there'},`) +
        paragraph('We received a request to reset your password. Use this code:') +
        codeBlock(String(vars['code'])) +
        paragraph('This code expires in 10 minutes.') +
        `<div style="background:#1e2a3a;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;color:#999">🛡️ If you didn't request this, your account is safe — just ignore this email.</div>`,
    ),
  }),

  security_alert: (vars) => ({
    subject: `Security alert — new login to ${BRAND.name}`,
    html: emailContainer(
      heading('🔔 New Login Detected') +
        paragraph(`Hi ${vars['name']},`) +
        paragraph(`A new login to your ${BRAND.name} account was detected.`) +
        `<div style="background:#1e2a3a;padding:16px;border-radius:8px;margin:16px 0;font-size:14px"><p style="margin:4px 0;color:#ddd">📍 Location: ${vars['location'] ?? 'Unknown'}</p><p style="margin:4px 0;color:#ddd">🖥️ Device: ${vars['device'] ?? 'Unknown'}</p><p style="margin:4px 0;color:#ddd">🕐 Time: ${vars['time'] ?? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p></div>` +
        paragraph("If this wasn't you, please reset your password immediately.") +
        button('Reset Password', 'https://datunai.com/reset-password'),
    ),
  }),

  clinic_welcome: (vars) => ({
    subject: `Welcome to ${BRAND.name} for Clinics!`,
    html: emailContainer(
      heading('🏥 Welcome to Datun for Clinics') +
        paragraph(`Hi Dr. ${vars['doctorName']},`) +
        paragraph(
          `${vars['clinicName']} is now registered on ${BRAND.name}. Your 14-day free trial of Pro features starts today.`,
        ) +
        button('Set Up Your Dashboard', 'https://datunai.com/clinics/dashboard') +
        paragraph('Need help? Reply to this email or call us at +91 87960 64170.'),
    ),
  }),

  clinic_lead: (vars) => ({
    subject: `New patient lead — ${vars['urgency']} | ${BRAND.name}`,
    html: emailContainer(
      heading('👤 New Patient Lead') +
        `<div style="background:#1e2a3a;padding:16px;border-radius:8px;margin:16px 0"><p style="margin:4px 0;color:#ddd">👤 Name: ${vars['patientName']}</p><p style="margin:4px 0;color:#ddd">🩺 Concern: ${vars['diagnosis']}</p><p style="margin:4px 0;color:#ddd">⚡ Urgency: <strong style="color:${vars['urgency'] === 'EMERGENCY' ? '#dc2626' : COLORS.primary}">${vars['urgency']}</strong></p><p style="margin:4px 0;color:#ddd">📍 Area: ${vars['area'] ?? 'Not specified'}</p></div>` +
        button('View Full Details', `https://datunai.com/clinics/leads/${vars['leadId']}`),
    ),
  }),

  payment_receipt: (vars) => ({
    subject: `Payment received — ₹${vars['amount']} | ${BRAND.name}`,
    html: emailContainer(
      heading('✅ Payment Confirmed') +
        paragraph(
          `Your payment of ₹${vars['amount']} for the ${vars['plan']} plan has been received.`,
        ) +
        `<div style="background:#1e2a3a;padding:16px;border-radius:8px;margin:16px 0;font-size:14px"><p style="margin:4px 0;color:#ddd">📋 Invoice: ${vars['invoiceId'] ?? 'N/A'}</p><p style="margin:4px 0;color:#ddd">📅 Next billing: ${vars['nextBillingDate'] ?? 'N/A'}</p></div>` +
        button('View Invoice', `https://datunai.com/clinics/billing`),
    ),
  }),

  admin_alert: () => ({
    subject: 'Admin Alert',
    html: '', // alertAdmin renders its own HTML — this is a passthrough
  }),

  daily_report: () => ({
    subject: 'Daily Report',
    html: '', // daily-report.cron renders its own HTML — this is a passthrough
  }),
};

/**
 * Render an email template by name.
 * Returns subject + full HTML body.
 */
export function renderEmailTemplate(
  templateName: EmailTemplateName,
  vars: Record<string, unknown>,
  locale: string = 'en',
): RenderedEmail {
  const renderer = templates[templateName];
  if (!renderer) {
    throw new Error(`Unknown email template: ${templateName}`);
  }
  return renderer(vars, locale);
}
