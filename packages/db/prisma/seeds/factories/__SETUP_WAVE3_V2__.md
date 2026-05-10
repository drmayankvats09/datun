# Wave 3 v2 Setup Verification

## Prerequisites

- pnpm + Node 20+
- Prisma 6.19+
- fast-check installed (`pnpm add -D fast-check` in `packages/db/`)
- @faker-js/faker v10.4.0

## Pre-Wave Folder Setup

```powershell
cd C:\Users\Admin\Projects\datun

mkdir packages\db\prisma\seeds\factories\compliance
mkdir packages\db\prisma\seeds\factories\commerce
mkdir packages\db\prisma\seeds\factories\integrations
mkdir packages\db\prisma\seeds\factories\support
mkdir packages\db\prisma\seeds\factories\marketing
mkdir packages\db\prisma\seeds\factories\analytics
mkdir packages\db\prisma\seeds\factories\distributions
mkdir packages\db\prisma\seeds\factories\invariants
mkdir packages\db\prisma\seeds\factories\builders

mkdir packages\db\src\__tests__\seeds\factories\invariants
```

## Verification Sequence

```powershell
cd C:\Users\Admin\Projects\datun\packages\db

# 1. TypeScript compile
pnpm exec tsc --noEmit

# 2. Run all factory tests (including 10K invariant property checks)
pnpm exec vitest run src/__tests__/seeds/factories/

# 3. Specifically run invariant suite
pnpm exec vitest run src/__tests__/seeds/factories/invariants/

# 4. File count check (expected: 78 in factories/, 8+ in tests/)
Get-ChildItem -Path prisma\seeds\factories -Recurse -File | Measure-Object | Select-Object Count
Get-ChildItem -Path src\__tests__\seeds\factories -Recurse -File | Measure-Object | Select-Object Count

# 5. Stage everything
cd C:\Users\Admin\Projects\datun
git add packages/db/prisma/seeds/factories/
git add packages/db/src/__tests__/seeds/factories/
git status
```

## Expected Outcomes

- TS compile: 0 errors
- Tests: ~50+ tests pass (5 invariants × 10K iterations + builders + distribution + perf)
- Files staged: ~86 (78 factories + 8 tests)
- Branch: still `task-43-seed-script` (DO NOT push yet)

## Troubleshooting

| Issue                                                           | Fix                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `cannot find module @faker-js/faker`                            | `pnpm add -D @faker-js/faker@10.4.0`                                |
| `cannot find module fast-check`                                 | `pnpm add -D fast-check`                                            |
| TypeScript: `Property 'address' does not exist on PrismaClient` | Schema doesn't have Address model — factory persist is no-op (safe) |
| Vitest: `out of memory`                                         | Reduce `numRuns` in property tests from 1000 → 200                  |
