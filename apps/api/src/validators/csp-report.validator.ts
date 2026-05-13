// apps/api/src/validators/csp-report.validator.ts
// ═══════════════════════════════════════════════════════════════
// CSP REPORT VALIDATORS — Legacy + Modern format parsers
//
// LEGACY FORMAT (`application/csp-report` — CSP Level 2):
//   { "csp-report": { "blocked-uri": "...", "violated-directive": "...", ... } }
//
// MODERN FORMAT (`application/reports+json` — W3C Reporting API):
//   [{
//     "type": "csp-violation",
//     "age": 0,
//     "url": "...",
//     "user_agent": "...",
//     "body": { "blockedURL": "...", "effectiveDirective": "...", ... }
//   }, ...]
//
// We accept both and normalize via `normalizeReport()` into a single shape.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { ValidationError } from '../errors/index.js';

// ── Legacy schema (CSP Level 2) ─────────────────────────────────
const legacyReportSchema = z
  .object({
    'csp-report': z
      .object({
        'blocked-uri': z.string().max(2048).optional().default(''),
        'document-uri': z.string().max(2048).optional().default(''),
        'violated-directive': z.string().max(256).optional().default(''),
        'effective-directive': z.string().max(256).optional().default(''),
        'original-policy': z.string().max(8192).optional().default(''),
        disposition: z.enum(['enforce', 'report']).optional().default('enforce'),
        'status-code': z.coerce.number().int().optional().nullable().default(null),
        'script-sample': z.string().max(2048).optional().default(''),
        'source-file': z.string().max(2048).optional().default(''),
        'line-number': z.coerce.number().int().optional().nullable().default(null),
        'column-number': z.coerce.number().int().optional().nullable().default(null),
        referrer: z.string().max(2048).optional().default(''),
      })
      .passthrough(),
  })
  .passthrough();

// ── Modern schema (W3C Reporting API) ───────────────────────────
const modernReportBodySchema = z
  .object({
    blockedURL: z.string().max(2048).optional().default(''),
    documentURL: z.string().max(2048).optional().default(''),
    referrer: z.string().max(2048).optional().default(''),
    violatedDirective: z.string().max(256).optional().default(''),
    effectiveDirective: z.string().max(256).optional().default(''),
    originalPolicy: z.string().max(8192).optional().default(''),
    disposition: z.enum(['enforce', 'report']).optional().default('enforce'),
    statusCode: z.coerce.number().int().optional().nullable().default(null),
    sample: z.string().max(2048).optional().default(''),
    sourceFile: z.string().max(2048).optional().default(''),
    lineNumber: z.coerce.number().int().optional().nullable().default(null),
    columnNumber: z.coerce.number().int().optional().nullable().default(null),
  })
  .passthrough();

const modernSingleSchema = z.object({
  type: z.literal('csp-violation'),
  age: z.coerce.number().int().optional().default(0),
  url: z.string().max(2048).optional().default(''),
  user_agent: z.string().max(1024).optional().nullable().default(null),
  body: modernReportBodySchema,
});

const modernArraySchema = z.array(modernSingleSchema).min(1);

/** Union of accepted parse results. */
export type ParsedReport =
  | { kind: 'legacy'; data: z.infer<typeof legacyReportSchema> }
  | { kind: 'modern'; data: z.infer<typeof modernArraySchema> };

/** Unified normalized shape used by the service layer. */
export interface NormalizedCspReport {
  blockedUri: string;
  documentUri: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  disposition: string;
  statusCode: number | null;
  scriptSample: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
}

/**
 * Parse a raw payload as either legacy or modern format.
 * @throws ValidationError if neither format matches.
 */
export function parseCspReport(raw: unknown, contentType: string): ParsedReport {
  // Try modern first (Reporting API is the future).
  if (contentType.includes('application/reports+json') || Array.isArray(raw)) {
    const result = modernArraySchema.safeParse(raw);
    if (result.success) return { kind: 'modern', data: result.data };
  }

  // Try legacy.
  const legacy = legacyReportSchema.safeParse(raw);
  if (legacy.success) return { kind: 'legacy', data: legacy.data };

  throw new ValidationError('CSP report payload did not match any known format', {
    raw: ['Unrecognized structure'],
  });
}

/**
 * Normalize a parsed report (either format) into the unified shape.
 *
 * For modern format with multiple reports, returns the FIRST report. (We
 * normally process one at a time; callers iterate the modern data array
 * directly for multi-report batches.)
 */
export function normalizeReport(parsed: ParsedReport): NormalizedCspReport {
  if (parsed.kind === 'legacy') {
    const r = parsed.data['csp-report'];
    return {
      blockedUri: r['blocked-uri'],
      documentUri: r['document-uri'],
      violatedDirective: r['violated-directive'],
      effectiveDirective: r['effective-directive'] || r['violated-directive'],
      originalPolicy: r['original-policy'],
      disposition: r.disposition,
      statusCode: r['status-code'] ?? null,
      scriptSample: r['script-sample'] || null,
      sourceFile: r['source-file'] || null,
      lineNumber: r['line-number'] ?? null,
      columnNumber: r['column-number'] ?? null,
    };
  }

  // Modern: take first report. Zod's .min(1) guarantees ≥1 element.
  const r = parsed.data[0]!.body;
  return {
    blockedUri: r.blockedURL,
    documentUri: r.documentURL,
    violatedDirective: r.violatedDirective,
    effectiveDirective: r.effectiveDirective || r.violatedDirective,
    originalPolicy: r.originalPolicy,
    disposition: r.disposition,
    statusCode: r.statusCode ?? null,
    scriptSample: r.sample || null,
    sourceFile: r.sourceFile || null,
    lineNumber: r.lineNumber ?? null,
    columnNumber: r.columnNumber ?? null,
  };
}
