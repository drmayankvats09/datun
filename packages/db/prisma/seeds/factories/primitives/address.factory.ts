// ═══════════════════════════════════════════════════════════════
// ADDRESS FACTORY — Realistic Indian addresses
// Generates: house/flat number, street, locality, city, state, PIN
// Distribution-aware: tier-1/2/3 cities + rural/semi-urban
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';
import {
  INDIAN_CITIES,
  INDIAN_STATES,
  getCitiesByTier,
} from '../../data/demographics/indian-states';

interface AddressOutput {
  readonly id: string;
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly locality: string;
  readonly city: string;
  readonly stateCode: string;
  readonly pincode: string;
  readonly country: 'IN';
  readonly latitude: number;
  readonly longitude: number;
  readonly entityType: 'CLINIC' | 'PATIENT' | 'BILLING' | 'SHIPPING';
  readonly entityId: string;
  readonly isVerified: boolean;
  readonly createdAt: Date;
}

interface AddressTransient {
  readonly entityType: 'CLINIC' | 'PATIENT' | 'BILLING' | 'SHIPPING';
  readonly entityId: string;
  readonly cityTier?: 'tier-1' | 'tier-2' | 'tier-3';
  readonly forceCitySlug?: string;
}

const LOCALITY_PATTERNS = [
  'Sector',
  'Block',
  'Phase',
  'Colony',
  'Nagar',
  'Vihar',
  'Enclave',
  'Layout',
  'Extension',
  'Park',
  'Residency',
  'Heights',
  'Apartments',
];

const STREET_PATTERNS = ['Road', 'Marg', 'Street', 'Lane', 'Cross', 'Main Road', 'Avenue'];

export const addressFactory = defineFactory<AddressOutput, AddressTransient>({
  name: 'user' as 'user', // Reuse user sequence — addresses are sub-entity
  defaultTransient: { entityType: 'PATIENT', entityId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    let cityPool = INDIAN_CITIES;
    if (transient.cityTier) {
      cityPool = getCitiesByTier(transient.cityTier);
    }
    if (transient.forceCitySlug) {
      const forced = INDIAN_CITIES.find((c) => c.slug === transient.forceCitySlug);
      if (forced) cityPool = [forced];
    }

    const city = faker.helpers.arrayElement(cityPool);
    const state = INDIAN_STATES.find((s) => s.code === city.stateCode)!;

    const houseNumber = faker.number.int({ min: 1, max: 999 });
    const localityNumber = faker.number.int({ min: 1, max: 99 });
    const localityType = faker.helpers.arrayElement(LOCALITY_PATTERNS);
    const streetType = faker.helpers.arrayElement(STREET_PATTERNS);

    return {
      id: `addr-${String(sequence).padStart(8, '0')}`,
      addressLine1: `${houseNumber}, ${localityType}-${localityNumber}, ${faker.person.lastName()} ${streetType}`,
      addressLine2:
        faker.helpers.maybe(
          () =>
            `Near ${faker.helpers.arrayElement(['Metro Station', 'Mall', 'Temple', 'Hospital', 'School'])}`,
          { probability: 0.4 },
        ) ?? null,
      locality: `${faker.helpers.arrayElement(['Greater', 'New', 'Old', 'East', 'West', 'North', 'South'])} ${city.name}`,
      city: city.name,
      stateCode: state.code,
      pincode: faker.location.zipCode('######'),
      country: 'IN' as const,
      latitude: city.latitude + faker.number.float({ min: -0.05, max: 0.05 }),
      longitude: city.longitude + faker.number.float({ min: -0.05, max: 0.05 }),
      entityType: transient.entityType,
      entityId: transient.entityId,
      isVerified: faker.datatype.boolean({ probability: 0.7 }),
      createdAt: new Date(),
    };
  },

  persist: async (addr, prisma) => {
    const model = (
      prisma as unknown as { address?: { upsert: (args: object) => Promise<AddressOutput> } }
    ).address;
    if (!model) return addr; // schema may not have address table
    return model.upsert({
      where: { id: addr.id },
      create: addr,
      update: {},
    });
  },
});
