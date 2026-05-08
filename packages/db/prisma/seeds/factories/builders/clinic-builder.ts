// ═══════════════════════════════════════════════════════════════
// CLINIC BUILDER DSL
// ═══════════════════════════════════════════════════════════════

import type { Clinic } from '@prisma/client';
import { clinicFactory } from '../primitives/clinic.factory';

export class ClinicBuilder {
  private overrides: Partial<Clinic> = {};
  private transient: {
    cityTier?: 'tier-1' | 'tier-2' | 'tier-3';
    subscriptionTier?: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    ownerId?: string;
  } = {};

  inCity(city: string): this {
    this.overrides = { ...this.overrides, city };
    return this;
  }

  inCityTier(tier: 'tier-1' | 'tier-2' | 'tier-3'): this {
    this.transient.cityTier = tier;
    return this;
  }

  ofTier(tier: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE'): this {
    this.transient.subscriptionTier = tier;
    return this;
  }

  ownedBy(userId: string): this {
    this.transient.ownerId = userId;
    return this;
  }

  acceptsEmergencies(): this {
    this.overrides = { ...this.overrides, acceptsEmergencies: true };
    return this;
  }

  acceptsInsurance(): this {
    this.overrides = { ...this.overrides, acceptsInsurance: true };
    return this;
  }

  build(): Clinic {
    return clinicFactory.build(this.overrides, this.transient);
  }
}

export const clinic = (): ClinicBuilder => new ClinicBuilder();
