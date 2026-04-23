// ═══════════════════════════════════════════════════════════════
// TEST FACTORIES — Reusable test data generators
// Pattern: FactoryBot (Ruby), Fishery (TS), Factory Girl.
// Change schema once → all tests automatically updated.
// ═══════════════════════════════════════════════════════════════

let counter = 0;

function nextId(): string {
  counter++;
  return `test-id-${counter.toString().padStart(4, '0')}`;
}

export const UserFactory = {
  create(overrides: Record<string, unknown> = {}) {
    const id = nextId();
    return {
      id,
      email: `user-${id}@test.datunai.com`,
      name: `Test User ${id}`,
      role: 'PATIENT' as const,
      phone: '919876543210',
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      ...overrides,
    };
  },
};

export const TokenPayload = {
  create(overrides: Record<string, unknown> = {}) {
    return {
      userId: nextId(),
      email: 'test@datunai.com',
      role: 'PATIENT' as const,
      ...overrides,
    };
  },
};

export const ConsultationFactory = {
  create(overrides: Record<string, unknown> = {}) {
    return {
      id: nextId(),
      clientUuid: `client-${Date.now()}`,
      userId: nextId(),
      status: 'IN_PROGRESS' as const,
      language: 'en',
      createdAt: new Date(),
      ...overrides,
    };
  },
};

// Reset counter between test suites
export function resetFactories(): void {
  counter = 0;
}
