# Multi-Tenant Guide

## Tenant model

Datun is multi-tenant by clinic. Every tenant-scoped table (`Patient`, `Consultation`, `Appointment`, `Prescription`, `WhatsappMessage`, `Doctor`, `ClinicMember`) carries a `clinicId` foreign key.

## Per-tenant orchestrator

The per-tenant orchestrator wraps `runOrchestrator` with a Prisma extension that auto-injects `clinicId` on every `create`/`createMany`. This means module code never needs tenant awareness — the wrapper enforces it.

```typescript
await runTenantOrchestrator({
  prisma,
  tenant: {
    tenantId: 'clinic-delhi-001',
    tier: 'GROW',
    region: 'ap-south-1',
    dataResidency: 'IN',
    anonymizationProfile: 'DPDP',
    createdAt: new Date(),
  },
  strategy: demoStrategy,
});
```

## Per-tenant anonymization

The `anonymizationProfile` on the tenant context selects which rule set is applied during exports:

- `DPDP` — Indian Digital Personal Data Protection Act rules (default)
- `HIPAA` — US healthcare Safe Harbor (18 identifiers)
- `GDPR` — EU privacy rules
- `STRICT` — union of all three (defensive default for unknown jurisdictions)

## Cross-tenant query blocker

The `withTenantBlocker` extension throws `CrossTenantQueryError` if any `findMany` on a tenant-scoped model omits `clinicId` from the `WHERE` clause. This catches accidental data leaks at the query layer — defence in depth, not in lieu of, RLS policies.

## Data residency

Tenant `dataResidency` controls Prisma datasource selection:

- `IN` → `ap-south-1` Postgres + Mumbai S3 region
- `US` → `us-east-1` Postgres + Virginia S3 region
- `EU` → `eu-west-1` Postgres + Ireland S3 region

Cross-residency reads are blocked at the connection-string level.

## Compliance footprint

`complianceFootprint(tenant)` returns the active compliance regimes — used to populate the `complianceProfile` field on `SeedAnonymizationAudit` rows for regulator reporting.
