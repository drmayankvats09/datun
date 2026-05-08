# Testing Strategy

## Layered testing pyramid

1. **Unit (60%)** — pure functions, factories, anonymization rules, k-anonymity validator
2. **Property-based (15%)** — invariants over 10,000 iterations using fast-check
3. **Contract (10%)** — every factory output validated against Prisma schema
4. **E2E (10%)** — Saga compensation, checkpoint resume, idempotency, determinism, multi-strategy
5. **Golden (5%)** — pinned outputs catch silent regressions

## TestContainers architecture

A single Postgres container is created per test run. Each test gets a hermetic clone via `CREATE DATABASE … TEMPLATE …`, providing millisecond-level isolation without recreating the schema.

```
┌──────────────────────────────────┐
│  Postgres container (template)   │
│      datun_template (schema)     │
└─────────────┬────────────────────┘
              │ TEMPLATE …
   ┌──────────┼──────────┐
   ▼          ▼          ▼
 t_xyz     t_abc      t_def    ← per-test clones
```

## Property-based example

```typescript
fc.assert(
  fc.property(fc.string({ minLength: 1, maxLength: 200 }), (name) => {
    const out = anonymize({ name }, { rules: dpdpRules });
    return detectPii(out.name as string).length === 0;
  }),
  { numRuns: 10_000, seed: 42 },
);
```

This tests "anonymize never produces PII" across 10,000 random inputs. Failures shrink to a minimal counterexample automatically.

## Coverage tooling

- Provider: V8 (built-in to Node 22, no Babel)
- Reporter: text (CLI), lcov (Codecov), html (local debugging)
- Thresholds: enforced via `vitest.config.ts`; CI fails on regression

## Chaos faults catalogue

| Fault                  | Expected behaviour                         | Verified by         |
| ---------------------- | ------------------------------------------ | ------------------- |
| `AI_TIMEOUT`           | Falls back to template response            | `chaos-injector.ts` |
| `DB_DEADLOCK`          | Module retried up to 3×                    | `chaos-injector.ts` |
| `OOM_PROBE`            | Module aborts, Saga compensates            | `chaos-injector.ts` |
| `NETWORK_PARTITION`    | Outbound calls timeout, retry with backoff | `chaos-injector.ts` |
| `DISK_FULL_SIMULATION` | Snapshot creation fails gracefully         | `chaos-injector.ts` |
