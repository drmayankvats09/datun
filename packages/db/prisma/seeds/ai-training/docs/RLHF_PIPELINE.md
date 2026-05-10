# RLHF Pipeline

## Stages

1. Generate A/B candidates with two different models (e.g., Sonnet vs Haiku)
2. Surface to human reviewer via admin UI (Task #44)
3. Reviewer picks A, B, or tie + 1-5 confidence + optional rationale
4. Store as `PreferencePair` with model attribution
5. Export DPO dataset (chosen vs rejected) when corpus reaches threshold

## DPO export format

```jsonl
{
  "prompt": "...",
  "chosen": "...",
  "rejected": "..."
}
```

Compatible with TRL v0.28+ `DPOTrainer` out of the box.

## Reward modeling readiness

When `PreferencePair` count exceeds 5,000 with > 70% confidence ≥ 4, the corpus is ready for reward model fine-tuning. Run:

```bash
pnpm --filter @repo/db exec tsx -e "import('./prisma/seeds/ai-training/rlhf').then(m => m.exportDpoDataset(prisma, './tmp/datun-dpo.jsonl'))"
```

## Safety-critical pairs

Pairs flagged `safetyRelevant: true` (e.g., medication for pregnancy, child) are oversampled in DPO training to reinforce safety boundaries.
