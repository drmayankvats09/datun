# Wave 8 — Production Data Quality

Wave 8 builds the runtime data-quality layer for Datun. Architecture:

```
Application writes → Contract validator → Quarantine if violation
                  ↘ Soda CLI (daily)
                  ↘ Custom Expectations (clinical-domain rules)
                  ↘ Anomaly detector (statistical + categorical)
                  ↘ SLO evaluator → SloBreach table
```

## Layers

| Layer                    | Files  | Purpose                             |
| ------------------------ | ------ | ----------------------------------- |
| Contracts                | 5      | Producer-consumer guarantees        |
| Soda                     | 4      | YAML/SQL checks via Soda Core       |
| Expectations             | 5      | Clinical-domain TS checks           |
| Anomaly                  | 4      | Statistical + categorical detection |
| Quarantine               | 5      | Bad-row routing + auto-remediation  |
| SLO                      | 3      | Error budget tracking               |
| Workflow + barrel + docs | 4      | CI integration                      |
| **Total**                | **30** |                                     |

## Quick start

```bash
# 1. Apply schema
pnpm --filter @repo/db exec prisma migrate dev --name wave8-data-quality

# 2. Validate contracts against current DB
pnpm --filter @repo/db exec tsx -e "
import { PrismaClient } from '@prisma/client';
import { ALL_CONTRACTS, validateContract } from './prisma/seeds/data-quality/contracts';
const p = new PrismaClient();
for (const c of ALL_CONTRACTS) console.log(c.tableName, await validateContract(p, c));
"

# 3. Run expectations
pnpm --filter @repo/db exec tsx -e "
import { PrismaClient } from '@prisma/client';
import { runAllExpectations } from './prisma/seeds/data-quality/expectations/expectation-runner';
const p = new PrismaClient();
console.log(JSON.stringify(await runAllExpectations(p), null, 2));
"

# 4. Evaluate SLOs
pnpm --filter @repo/db exec tsx -e "
import { PrismaClient } from '@prisma/client';
import { evaluateAllSlos } from './prisma/seeds/data-quality/slo/slo-evaluator';
import { ALL_SLOS } from './prisma/seeds/data-quality/slo/datun-slos';
const p = new PrismaClient();
console.log(JSON.stringify(await evaluateAllSlos(p, ALL_SLOS), null, 2));
"
```
