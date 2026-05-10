# Disaster Recovery Playbook

## RTO / RPO targets

- **RTO**: 30 minutes (recovery time objective)
- **RPO**: 1 hour (recovery point objective — snapshot frequency)

## Runbook: full prod restore

### 1. Declare the incident

Page the on-call via PagerDuty. Open an incident channel in Slack. Capture initial state: timestamp, observed symptoms, suspected cause.

### 2. Cut over to read-only

Update the application config flag `READ_ONLY=1`. This bypasses the primary and routes all reads to the most recent replica.

### 3. Trigger DR restore

```bash
gh workflow run seed-dr-drill.yml -f dry_run=false
```

The workflow:

1. Pulls the latest snapshot from `s3://datun-dr-snapshots/snapshots/`.
2. Drops `public` schema on the staging-DR Postgres.
3. Restores via `psql -f`.
4. Verifies row counts on critical tables.

### 4. Promote DR to primary

When validation passes:

1. Update DNS / connection strings to point to the DR endpoint.
2. Clear `READ_ONLY=1`.
3. Resume normal traffic.

### 5. Post-incident

- Capture timing for each step.
- File a post-mortem in `docs/post-mortems/YYYY-MM-DD.md`.
- Update RTO targets if exceeded.

## Quarterly drill

The first day of each quarter at 04:00 UTC, the `seed-dr-drill.yml` workflow runs in dry-run mode. The first-of-quarter manual run executes the real restore against staging-DR. Success criteria: RTO < 30 min, all critical row counts match.

## Snapshot schedule

| Frequency | Source             | Retention      |
| --------- | ------------------ | -------------- |
| Hourly    | Production primary | 24 hours       |
| Daily     | Production primary | 30 days        |
| Weekly    | Production primary | 12 months      |
| Monthly   | Production primary | 7 years (DPDP) |
