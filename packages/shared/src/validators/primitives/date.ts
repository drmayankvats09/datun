// ═══════════════════════════════════════════════════════════════
// DATE PRIMITIVE — ISO 8601 date validation
// Used by: profileUpdateSchema (DOB), appointmentSchema,
//          analyticsQuerySchema, invoiceSchema
//
// Rules:
//   - DOB: past date only (1900 - today)
//   - Appointment: future date only (today - +1 year)
//   - Generic: any valid ISO 8601
//
// Pattern: Stripe billing dates, Cal.com appointment dates.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Generic ISO 8601 date string.
 * Accepts: "2024-03-15", "2024-03-15T10:30:00Z", "2024-03-15T16:00:00+05:30"
 */
export const dateField = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Must be a valid date (ISO 8601 format)' });

/**
 * Date of Birth — must be in the past, reasonable range.
 * Min: 1900-01-01 (no one older than ~126)
 * Max: today (cannot be born in the future)
 */
export const dobField = z.string().refine(
  (val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    const min = new Date('1900-01-01');
    const max = new Date();
    return d >= min && d <= max;
  },
  { message: 'Date of birth must be between 1900 and today' },
);

/**
 * Future date — appointments, reminders.
 * Min: now
 * Max: +1 year (prevent booking 5 years out)
 */
export const futureDateField = z.string().refine(
  (val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return d >= now && d <= maxDate;
  },
  { message: 'Date must be in the future (within 1 year)' },
);

/** Date type */
export type DateString = z.infer<typeof dateField>;
