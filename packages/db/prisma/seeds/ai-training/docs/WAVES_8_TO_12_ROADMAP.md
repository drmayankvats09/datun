# Waves 8-12 — Revenue-Gated Roadmap

These waves are locked behind business milestones. Building them prematurely = founder trap (memory rule #16).

## Wave 8 — Production Data Quality

**Trigger**: 5 paying clinics live  
**Why**: real production data flowing → quality monitoring becomes meaningful  
**Scope** (~30 files): Great Expectations integration, Monte Carlo data observability, daily DQ scorecards, anomaly detection, data freshness SLOs  
**Effort**: ~2 weeks

## Wave 9 — Federated Learning Prep

**Trigger**: 50 clinics across multiple Indian states  
**Why**: per-state DPDP residency + per-clinic privacy partitioning  
**Scope** (~25 files): per-clinic data partition, DP budget per partition, FedAvg/FedProx aggregation harness, secure aggregation primitives  
**Effort**: ~3 weeks

## Wave 10 — Real-Time CDC

**Trigger**: 500 clinics + analytics latency < 1 min SLO breached  
**Why**: batch ETL no longer cuts it  
**Scope** (~40 files): Debezium + Kafka, schema registry, streaming transformations, real-time dashboards  
**Effort**: ~4 weeks

## Wave 11 — ML Feature Store

**Trigger**: 1L+ users + first AI personalization product  
**Why**: online + offline feature consistency at scale  
**Scope** (~35 files): Feast integration, online + offline parity tests, feature versioning, point-in-time correctness  
**Effort**: ~5 weeks

## Wave 12 — Continuous Training Loop

**Trigger**: commercial fine-tuned dental AI launched + 100K+ inferences/day  
**Why**: active learning loop closes the production-feedback flywheel  
**Scope** (~30 files): drift detection, auto-trigger fine-tune, A/B test harness, model gateway with traffic split, rollback automation  
**Effort**: ~6 weeks

## Trigger evaluation

Each quarter, review:

1. Are we past the trigger threshold?
2. Has the prior wave been in production for ≥ 3 months?
3. Is there a customer-facing pain point unblocking this?

If 3 of 3 yes → green-light. Else: defer one more quarter.
