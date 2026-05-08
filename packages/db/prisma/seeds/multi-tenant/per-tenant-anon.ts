import { AnonymizationEngine, type ComplianceProfile } from '../anonymization';
import type { TenantContext } from './tenant-context';

export function profileForTenant(ctx: TenantContext): ComplianceProfile {
  // Bengaluru/Mumbai/Delhi (IN) → DPDP; international demo tenants → DPDP_HIPAA_GDPR
  if (ctx.timezone !== 'Asia/Kolkata') return 'DPDP_HIPAA_GDPR';
  return 'DPDP';
}

export function engineForTenant(ctx: TenantContext): AnonymizationEngine {
  return new AnonymizationEngine(profileForTenant(ctx), {
    quasiIdentifiers: ['ageYears', 'gender', 'pincode', 'preferredLocale'],
    kThreshold: 5,
  });
}

export function complianceFootprint(ctx: TenantContext): readonly string[] {
  const profile = profileForTenant(ctx);
  // Explicit string[] — `out` mixes ComplianceProfile values + free residency markers
  const out: string[] = [profile];
  if (ctx.timezone === 'Asia/Kolkata') out.push('DPDP-residency-IN');
  return out;
}
