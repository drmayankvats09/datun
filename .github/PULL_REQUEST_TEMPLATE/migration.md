## Migration PR

### What is changing?

<!-- 1-2 sentence summary -->

### Why?

<!-- Business / technical justification -->

### Migration name

`<YYYYMMDDHHMMSS_descriptive_name>`

### Risk classification

- [ ] Additive only (new tables, new nullable columns, new indexes)
- [ ] Backfill required (separate batched script post-deploy)
- [ ] Destructive (drop / rename) — using expand-contract pattern
- [ ] Performance-sensitive (lock duration > 1s expected)

### Pre-flight checklist

- [ ] `prisma format` + `prisma validate` clean
- [ ] `db:rollback:gen` ran and ROLLBACK.sql reviewed
- [ ] Lint passes (CI will verify)
- [ ] Dry run on shadow DB succeeded
- [ ] Pre-migration data integrity checks pass
- [ ] Tests added / updated for new schema

### Rollback plan

<!-- Describe how rollback is tested -->

### Production deploy plan

- [ ] Standard (Railway build phase auto-applies)
- [ ] Coordinated (requires write traffic pause — describe below)

<!-- If coordinated, describe -->

### Related

- Issue: #
- ADR: docs/adr/
- Runbook: docs/runbooks/
