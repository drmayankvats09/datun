# A/B Testing Guide

## When to A/B test

Every prompt version change > 1% of system prompt by char count. Every model migration. Every change to safety thresholds. Every UX change in /admin/label-data.

## Workflow

1. **Define** — write `ExperimentDefinition` with variants, primary metric, MDE, sample size
2. **Assign** — use `recordAssignment(prisma, experiment, userId)` at request entry
3. **Expose** — when a variant-controlled feature renders, set `metricExposed = true`
4. **Measure** — record `conversionValue` on success events
5. **Check SRM** — daily, fail loud if observed split deviates from configured weights
6. **Sequential test** — run mSPRT every 6 hours; auto-stop if `canStopEarly`
7. **Decide** — promote winner, document in ADR

## Sample sizing

For a primary metric with baseline mean μ and stddev σ, MDE δ, alpha 0.05, power 0.8:

```
n_per_variant ≈ 16 × σ² / δ²
```

For Datun consultation completion (μ ≈ 0.4, σ ≈ 0.5, MDE = 0.05):

```
n ≈ 16 × 0.25 / 0.0025 = 1,600 per variant
```

Most prompt experiments need 1,500-3,000 users per variant for 95% confidence.

## Guardrail metrics (always check)

- `safety_violation_rate < 0.5%`
- `emergency_missed_count = 0`
- `latency_p99 < 5,000ms`
- `error_rate < 1%`

If any guardrail breaches, abort experiment regardless of primary metric lift.
