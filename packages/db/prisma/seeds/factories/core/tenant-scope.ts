// ═══════════════════════════════════════════════════════════════
// MULTI-TENANT SCOPE — Per-clinic factory isolation
//
// Pattern: PostgreSQL RLS pattern (per Crunchy/AWS docs).
// Each factory call within a tenant scope gets:
//   • Tenant-namespaced IDs (clinic-A-patient-001 vs clinic-B-patient-001)
//   • Tenant-prefixed phone numbers (no collisions)
//   • Tenant config (timezone, locale defaults, etc.)
// ═══════════════════════════════════════════════════════════════

export interface TenantScope {
  readonly clinicId: string;
  readonly clinicSlug: string;
  readonly defaultLocale:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
  readonly timezone: string;
  readonly cityName: string;
  readonly phonePrefix: string;
}

let activeScope: TenantScope | null = null;

/** Set active tenant scope — all factory calls afterwards inherit this */
export function setTenantScope(scope: TenantScope): void {
  activeScope = scope;
}

/** Clear tenant scope — factory calls become global */
export function clearTenantScope(): void {
  activeScope = null;
}

/** Get current tenant scope */
export function getTenantScope(): TenantScope | null {
  return activeScope;
}

/**
 * Run a function inside a tenant scope, automatically restoring previous on exit.
 * Pattern: AsyncLocalStorage-style scoping.
 */
export async function withTenantScope<T>(scope: TenantScope, fn: () => Promise<T>): Promise<T> {
  const previous = activeScope;
  activeScope = scope;
  try {
    return await fn();
  } finally {
    activeScope = previous;
  }
}

/**
 * Generate tenant-prefixed ID. If no tenant active, returns plain ID.
 */
export function tenantId(prefix: string, sequence: number): string {
  const padded = String(sequence).padStart(8, '0');
  if (activeScope) {
    return `${activeScope.clinicSlug}-${prefix}-${padded}`;
  }
  return `${prefix}-${padded}`;
}
