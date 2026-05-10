# Wave 7 — AI Training Data Foundation

Wave 7 builds the moat layer for Datun's proprietary fine-tuned dental AI. Where Waves 1-6.1 built a seed pipeline, Wave 7 builds the **training-data lifecycle**: eval, synthesis, quality filtering, lineage, RLHF, and privacy budgets.

## Why Wave 7 (and not Wave 8 yet)

The 2026 healthcare AI consensus (Nature 2025, npj Digital Medicine 2025, Anthropic eval-harness, OpenAI evals): **build the eval pipeline before you train**. Datun is pre-training. The eval pipeline must exist before the first labeling session in Task #44.

Waves 8-12 are revenue-gated:

- Wave 8 — Production Data Quality (Great Expectations): after 5 paying clinics
- Wave 9 — Federated Learning Prep: after 50 clinics
- Wave 10 — Real-time CDC: after 500 clinics
- Wave 11 — ML Feature Store: after 1L users
- Wave 12 — Continuous Training Loop: after commercial AI launch

## Layer overview (Wave 7)

| Layer                     | Scope                                               | Files  |
| ------------------------- | --------------------------------------------------- | ------ |
| Eval                      | held-out + 50 golden cases + LLM judge + regression | 10     |
| Synthesis                 | Claude-driven persona/evol/back-translate           | 10     |
| Quality                   | IFD + LLM judge + diversity selector                | 5      |
| Lineage                   | DB-backed provenance + model collapse detector      | 5      |
| RLHF                      | preference pairs + DPO export                       | 4      |
| Privacy budget            | multi-run ε composition                             | 4      |
| Docs + workflows + barrel |                                                     | 12     |
| **Total**                 |                                                     | **50** |

## Quick start

```bash
# 1. Apply schema additions
pnpm --filter @repo/db exec prisma migrate dev --name wave7-ai-training

# 2. Run eval suite against current Claude
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts eval run --model claude-sonnet-4-6

# 3. Generate synthetic training set (500 examples)
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts synthesize --strategy persona-vary --target-final 500

# 4. Check privacy budget
pnpm --filter @repo/db exec tsx -e "import('./prisma/seeds/ai-training/privacy-budget').then(m => new m.BudgetAccumulator(null).advancedComposition(0.1, 100))"
```

## Forward compatibility

- New synthesis strategies → add to `SynthesisStrategy` union; orchestrator picks up automatically
- New compliance regimes → add to `ComplianceProfile` (Wave 5)
- New eval dimensions → extend `EvalResult.scores`; LLM judge prompt updates accordingly
- Federated learning (Wave 9) → consumes per-tenant `TrainingExample` partitions
