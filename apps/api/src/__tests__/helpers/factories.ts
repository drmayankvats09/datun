// ═══════════════════════════════════════════════════════════════
// TEST FACTORIES — Reusable test data generators
// P6-F16: All auth fields included (passwordHash, primaryRole, etc.)
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
      phone: '+919876543210',
      passwordHash: '$2a$12$LJ3m4ys3Lgkz7g9X5K5mCOqGJOA8.r0oI6FnzqZpq4FOmRxr4Ude',
      primaryRole: 'PATIENT' as const,
      avatarUrl: null,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      updatedAt: new Date(),
      ...overrides,
    };
  },
};

export const AuthIdentityFactory = {
  create(overrides: Record<string, unknown> = {}) {
    return {
      id: nextId(),
      userId: nextId(),
      provider: 'EMAIL' as const,
      providerUserId: nextId(),
      emailAtProvider: 'test@datunai.com',
      phoneAtProvider: null,
      isPrimary: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      ...overrides,
    };
  },
};

export function resetFactories(): void {
  counter = 0;
}
