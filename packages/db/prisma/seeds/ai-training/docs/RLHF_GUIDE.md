# RLHF Guide — Capturing Preference Pairs

How to collect preference data, export DPO datasets, and gate fine-tunes on safety pairs.

## Capturing a preference pair

In `apps/web` admin labeling UI (Task #131), reviewers compare two model responses to the same prompt and pick a preferred. The UI calls `collectPreference()` from this layer:

```ts
import { collectPreference } from '@repo/db/prisma/seeds/wave7';

await collectPreference({
  prompt,
  responseA,
  responseB,
  preferred: 'A',
  confidence: 5,
  rationale: 'Response A correctly flagged warfarin interaction',
  reviewerId: req.user.id,
  modelA: 'claude-sonnet-4',
  modelB: 'gpt-4o',
  safetyRelevant: true,
});
```

A row is created in `preference_pair`. Indexes on `(reviewerId, reviewedAt)` and `safetyRelevant` keep dashboard queries fast at 1L+ rows.

## Exporting DPO training data

Hugging Face TRL DPOTrainer expects JSONL with `prompt`, `chosen`, `rejected` fields:

```bash
pnpm --filter @repo/db rlhf:export-dpo -- \
  --output ./training-data/dpo-2026-q2.jsonl \
  --min-confidence 4
```

Pass `--safety-only` to filter to safety-relevant pairs only — this is required before any production fine-tune to ensure the model retains safety priorities.

## Quality bar before fine-tune

A fine-tune run must NOT proceed unless:

1. ≥ 1000 confidence-≥4 pairs are collected
2. ≥ 200 safety-relevant pairs (use `--safety-only` to count)
3. Inter-reviewer agreement (kappa) ≥ 0.6 on a held-out 50-pair sample
4. Privacy budget composition shows remaining ε ≥ 0.5 (see `epsilon:validate`)

The CI gate `rlhf-readiness-check.yml` enforces these before allowing a model registry push.
