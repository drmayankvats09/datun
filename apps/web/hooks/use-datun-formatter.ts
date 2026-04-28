// ═══════════════════════════════════════════════════════════════
// USE-FORMATTER — Locale-aware date, number, currency, relative time
// "24 Apr 2026" → "२४ अप्रैल २०२६" in Hindi
// "₹2,000" → locale-formatted currency
// Pattern: Intl APIs (browser native, zero library).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useLocale } from 'next-intl';

/** Locale code → Intl locale tag mapping */
const INTL_LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
};

/**
 * Returns locale-aware formatters for dates, numbers, currency, relative time.
 *
 * @example
 * ```tsx
 * const { formatDate, formatNumber, formatCurrency, formatRelativeTime } = useFormatter();
 * formatDate(new Date()); // "२४ अप्रैल २०२६" (in Hindi)
 * formatNumber(2500); // "२,५००" (in Hindi)
 * formatCurrency(2000); // "₹२,०००" (in Hindi)
 * formatRelativeTime(-2, 'hour'); // "२ घंटे पहले" (in Hindi)
 * ```
 */
export function useDatunFormatter() {
  const locale = useLocale();
  const intlLocale = INTL_LOCALE_MAP[locale] ?? 'en-IN';

  /** Format date — "24 Apr 2026" or "२४ अप्रैल २०२६" */
  function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }).format(d);
  }

  /** Format short date — "24/04/2026" */
  function formatDateShort(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  /** Format time — "3:45 PM" or "३:४५ अपराह्न" */
  function formatTime(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(intlLocale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  }

  /** Format number — "2,500" or "२,५००" */
  function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(intlLocale, options).format(num);
  }

  /** Format currency — "₹2,000" or "₹२,०००" */
  function formatCurrency(amount: number, currency = 'INR'): string {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /** Format relative time — "2 hours ago" or "२ घंटे पहले" */
  function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(intlLocale, {
      numeric: 'auto',
      style: 'long',
    }).format(value, unit);
  }

  /** Format percentage — "85%" or "८५%" */
  function formatPercent(value: number): string {
    return new Intl.NumberFormat(intlLocale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value);
  }

  return {
    formatDate,
    formatDateShort,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatPercent,
    intlLocale,
  };
}
