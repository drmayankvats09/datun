// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES — Reusable HTML fragments for branded emails
// Used by: alert.service.ts, daily-report.cron.ts, future emails
// Pattern: Single place to update email branding/layout.
// ═══════════════════════════════════════════════════════════════

import { BRAND } from './brand';
import { COLORS } from './colors';

/** Standard email wrapper — dark branded container */
export function emailWrapper(content: string): string {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:${COLORS.bgDark};color:#fff;padding:24px;border-radius:12px">${content}<p style="margin-top:24px;font-size:12px;color:${COLORS.muted}">${BRAND.name} · Automated System · ${BRAND.legalName}</p></div>`;
}

/** Email footer tagline */
export function emailFooter(): string {
  return `<p style="margin-top:32px;padding-top:16px;border-top:1px solid #1e2a3a;color:${COLORS.muted};font-size:12px;text-align:center">${BRAND.tagline}<br/>— ${BRAND.name} Automated Reports</p>`;
}
