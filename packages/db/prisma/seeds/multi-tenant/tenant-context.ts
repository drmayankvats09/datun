// ═══════════════════════════════════════════════════════════════
// TENANT CONTEXT — Multi-tenant runtime contract (B-3 v2)
//
// Aligned with Wave 4 ModuleContext.tenantContext + B-3 audit/orchestrator
// requirements (tenantId, tier, dataResidency).
//
// Pattern source: AWS multi-tenant SaaS reference architecture +
//                 Stripe Connect platform/connected-account model.
// ═══════════════════════════════════════════════════════════════
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// TENANT CONTEXT — runtime payload carried through every seed call
// ─────────────────────────────────────────────────────────────────
export const TenantContextSchema = z.object({
  // ── Identity ──
  clinicId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/),
  clinicSlug: z.string().min(1).max(64),
  // Stable opaque tenant ID for audit-trail joins (defaults to clinicId)
  tenantId: z.string().min(1).max(64).optional(),

  // ── Locale + Geography ──
  defaultLocale: z.enum([
    'hindi',
    'english',
    'punjabi',
    'bengali',
    'tamil',
    'telugu',
    'marathi',
    'gujarati',
  ]),
  timezone: z.string().default('Asia/Kolkata'),
  cityName: z.string(),

  // ── Subscription tier (drives module gating + rate-limits) ──
  tier: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),

  // ── DPDP-mandated data residency marker ──
  dataResidency: z.enum(['IN', 'US', 'EU']).optional(),
});

export type TenantContext = z.infer<typeof TenantContextSchema>;

// ─────────────────────────────────────────────────────────────────
// RUN OPTIONS — orchestrator-level seed run knobs
// ─────────────────────────────────────────────────────────────────
export interface TenantRunOptions {
  readonly runId: string;
  readonly masterSeed: number;
  /** Seed strategy override — controls volume + realism */
  readonly strategy?: 'minimal' | 'realistic' | 'stress';
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION + GUARDS
// ─────────────────────────────────────────────────────────────────
export function validateTenantContext(input: unknown): TenantContext {
  return TenantContextSchema.parse(input);
}

export function isProductionTenant(ctx: TenantContext): boolean {
  return !ctx.clinicId.startsWith('demo-') && !ctx.clinicId.startsWith('test-');
}

/** Resolve tenantId — falls back to clinicId for backward compat. */
export function resolveTenantId(ctx: TenantContext): string {
  return ctx.tenantId ?? ctx.clinicId;
}
