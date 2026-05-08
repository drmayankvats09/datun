# Synthesis Guide — Generating Training Data with Claude

How to grow training set 10× without compromising quality or privacy.

## Five strategies

| Strategy           | What it does                                                                                  | When to use                        |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| `persona-vary`     | Re-narrates same chief complaint from different patient personas (age/locale/health-literacy) | Increase locale diversity          |
| `evol-instruct`    | 6 evolutions per seed: add-constraints, deepening, concretizing, etc.                         | Increase difficulty distribution   |
| `back-translate`   | Translates EN → HI/TA/BN/etc → EN to surface paraphrasing                                     | Increase linguistic diversity      |
| `self-instruct`    | Generates entirely new examples from instruction templates                                    | Cold-start before any labeled data |
| `claude-generator` | Direct Claude prompt with curated constraints                                                 | Targeted gap-fill                  |

## Running synthesis

```bash
pnpm --filter @repo/db synthesize -- \
  --strategy persona-vary \
  --seed-count 100 \
  --target-final 500 \
  --quality-min 0.7
```

Pipeline:

1. Sample seeds from `training_example` where `source = 'real'` and `approvedAt` is set
2. Run the chosen strategy (Claude API)
3. Score with IFD + LLM-judge
4. Filter by quality threshold
5. Dedup against existing examples
6. Persist with `source = 'synthetic-<strategy>'`, `parentId = seed.id`

## Quality gates

Every synthetic example must:

- Pass length bounds (10 ≤ tokens ≤ 4000)
- Pass IFD scoring (`scoreIfd` ≥ 0.6 by default)
- Pass LLM-judge scoring (`scoreLlmJudge` ≥ 0.7 if judgmentRequired)
- Be deduplicated (cosine similarity < 0.9 against any existing example)

## Model collapse prevention

The lineage tracer enforces:

- Maximum synthetic chain depth = 3 (configurable)
- No single seed contributes > 5 % of training set
- No single generator authors > 60 % of synthetic data

`pnpm training:lineage:risk` runs weekly and blocks the next FT run if any threshold is breached. See `model-collapse-detector.ts`.
