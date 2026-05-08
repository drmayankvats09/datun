# Wave 12 (Essentials) — Continuous Training & Production AI Safety

Wave 12 closes the loop on Datun's AI lifecycle: detect drift → guard outputs → A/B test changes → shadow-test candidates → version + roll out prompts safely.

## Layers (1-year-essential cut)

| Layer                    | Files  | Why now                                                                              |
| ------------------------ | ------ | ------------------------------------------------------------------------------------ |
| Drift detection          | 5      | Critical the moment Claude prompts go to production with real users                  |
| Safety guardrails        | 8      | Hard blockers (NSAID + blood-thinners, child<6, pregnancy) — already in memory rules |
| A/B harness              | 6      | Safe rollout of every prompt change — uses existing ExperimentAssignment             |
| Shadow mode              | 4      | Test candidate models without user exposure                                          |
| Prompt registry          | 5      | Versioned prompts with cache keys + automated rollouts                               |
| Workflow + docs + barrel | 6      | CI integration                                                                       |
| **Total**                | **34** |                                                                                      |

**Deferred to post-fine-tune** (premature today):

- Active learning loop with uncertainty sampling
- Auto-trigger DPO fine-tuning
- Model gateway with traffic split (using A/B harness covers most cases for now)
- Online eval guardrails (Wave 7's eval suite + nightly is sufficient pre-fine-tune)

## Quick start

```bash
# 1. Migrate
pnpm --filter @repo/db exec prisma migrate dev --name wave12-continuous-training

# 2. Test guardrails
pnpm --filter @repo/db exec vitest run prisma/seeds/continuous-training/guardrails

# 3. Run drift detection
pnpm --filter @repo/db exec tsx -e "
  import { PrismaClient } from '@prisma/client';
  import { detectAgeDrift } from './prisma/seeds/continuous-training/drift/input-drift';
  const p = new PrismaClient();
  console.log(await detectAgeDrift(p));
"

# 4. Activate a new prompt with rollout plan
pnpm --filter @repo/db exec tsx -e "
  import { PrismaClient } from '@prisma/client';
  import { PromptStore, PromptRolloutOrchestrator } from './prisma/seeds/continuous-training/prompts';
  const p = new PrismaClient();
  const store = new PromptStore(p);
  const v = await store.createVersion({
    version: 'v1.3.0',
    modelTarget: 'claude-sonnet-4-6',
    systemPrompt: 'You are Datun dental triage AI...',
    notes: 'Improved Punjabi support'
  });
  await new PromptRolloutOrchestrator(p).startRollout(v.id, 10, 20, 24);
"
```

## Integration with API path

In `apps/api/src/services/ai-triage.ts` (or equivalent):

```typescript
import {
  checkInputGuardrails,
  checkOutputGuardrails,
  logGuardrailResult,
} from '@repo/db/seeds/continuous-training/guardrails';
import { writeOutboxEvent } from '@repo/db/seeds/outbox';

// Input phase
const guard = checkInputGuardrails(userMessage);
if (!guard.passed) {
  return { error: 'Input rejected for safety reasons' };
}
// Use guard.redactedInput for the Claude call

// Claude call ...

// Output phase
const out = checkOutputGuardrails(claudeResponse, {
  patientAgeYears: patient.ageYears,
  patientGender: patient.gender,
  safetyConstraints: patient.safetyConstraints,
  preferredLocale: patient.preferredLocale,
});
if (!out.passed) {
  await logGuardrailResult(prisma, consultation.id, 'output', out);
  // Block response, fall back to canned safe message
}
```
