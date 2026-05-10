// ═══════════════════════════════════════════════════════════════
// TENANT AUDIT — every audit row MUST carry tenantId for multi-tenant joins
// Pattern: Stripe-style platform-account audit segregation.
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { AuditWriter } from '../audit-db/audit-writer';
import { resolveTenantId, type TenantContext } from './tenant-context';

export class TenantAuditWriter extends AuditWriter {
  constructor(
    prisma: PrismaClient,
    private readonly tenant: TenantContext,
  ) {
    super(prisma);
  }

  async write(event: {
    runId: string;
    module: string;
    action: 'started' | 'completed' | 'failed' | 'compensated';
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await super.write({
      ...event,
      payload: {
        ...(event.payload ?? {}),
        tenantId: resolveTenantId(this.tenant),
        tier: this.tenant.tier ?? 'BASIC',
        residency: this.tenant.dataResidency ?? 'IN',
      },
    });
  }
}
