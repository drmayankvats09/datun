# Eval Guide — Datun AI Training

How to add an eval case, run the suite, promote a baseline, and detect regressions.

## Adding a golden case

Edit `prisma/seeds/ai-training/eval/golden-cases/golden-cases.ts` and append an `EvalCase` object. Each case must specify:

- `caseId` — stable, snake-case identifier
- `category` — diagnosis | medication-safety | escalation | locale-handling
- `chiefComplaint` — the patient-supplied input
- `patientContext` — age, gender, allergies, conditions, current medications
- `expectedResponse` — urgency, diagnosisIncludes, medicationsAllowed, medicationsForbidden, redFlagsToCatch
- `difficulty` — 1 (easy) to 5 (expert)
- `judgmentRequired` — true if response requires LLM judge

## Running the suite

```bash
pnpm --filter @repo/db eval:run -- --model claude-sonnet-4 --suite golden
```

## Promoting a baseline

After a clean run on a new model checkpoint, promote the result so future runs are compared against it:

```bash
pnpm --filter @repo/db eval:baseline:promote -- --model claude-sonnet-4 --suite golden
```

The baseline is stored at `prisma/seeds/ai-training/eval/baselines/<suite>__<model>.baseline.json`. Commit this file to the repo so CI sees it.

## Detecting regressions

`orchestrateEval({ ..., compareBaseline: true })` returns a `regression` field that the nightly workflow inspects. If `hasRegression === true`, the workflow fails and pages on-call.

Tolerance defaults: 2-percentage-point pass-rate drop, 25 % p95 latency increase, any per-category drop > 2 pp.

## Adding a new category

Update both:

1. The `category` literal union in `eval.types.ts`
2. The category coverage display in the nightly report

A green build requires every new category to have at least 5 golden cases.
