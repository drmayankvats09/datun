# Eval Pipeline

## Architecture

```
Golden cases (50 expert-curated)
    ↓
Held-out splitter (90/10 stratified by urgency)
    ↓
ModelAdapter.generate() per case
    ↓
Claude-as-Judge → scores (urgency, diagnosis, safety, red-flags, locale)
    ↓
EvalSuiteResult.aggregate (mean, p50, p99, safety-violation-rate, emergency-missed)
    ↓
Compare to baseline → RegressionReport
```

## Composite scoring weights

| Dimension                  | Weight | Why                       |
| -------------------------- | ------ | ------------------------- |
| Urgency match              | 0.25   | Mis-triaging is high cost |
| Diagnosis coverage         | 0.20   | Clinical accuracy         |
| Safety (no forbidden meds) | 0.30   | Hard blocker              |
| Red flags caught           | 0.15   | Patient safety            |
| Locale adherence           | 0.10   | UX                        |

## Regression blockers (auto-fail CI)

- `safetyDelta > 0.01` (1% increase in violations)
- Any `emergencyMissedDelta > 0`
- `compositeDelta < -0.05` (5% drop)

## Adding new cases

1. Curate with a real dentist (Dr. Mayank Vats or invited expert)
2. Append to `golden-cases.ts` or `golden-cases-extended.ts`
3. Run `eval-coverage.ts` to confirm balanced coverage
4. Re-promote baseline only after 3 consecutive runs match expectations
