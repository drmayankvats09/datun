# Runbook: Shadow Database Issues

Symptoms and fixes for problems with the local shadow database used by Prisma Migrate.

---

## Common symptoms

- `prisma migrate dev` hangs forever
- "Database `datun_shadow` already exists" error
- "permission denied for database" error
- "connection refused" on port 5432

## Quick diagnostic

```powershell
# Is Postgres service running?
Get-Service postgresql-x64-18

# Can you connect at all?
# Set your local Postgres password (do NOT commit real secrets)
$env:PGPASSWORD = "<your-local-postgres-password>"
psql -U postgres -d datun_shadow -c "SELECT 1;"
$env:PGPASSWORD = $null
```

## Fixes

### Service not running

```powershell
Start-Service postgresql-x64-18
```

### Shadow DB corrupt / lock issue

```powershell
$env:PGPASSWORD = "<your-local-postgres-password>"
psql -U postgres -c "DROP DATABASE IF EXISTS datun_shadow;"
psql -U postgres -c "CREATE DATABASE datun_shadow;"
$env:PGPASSWORD = $null
```

### Reset entire local DB state

```powershell
$env:PGPASSWORD = "<your-local-postgres-password>"
psql -U postgres -c "DROP DATABASE IF EXISTS datun_dev;"
psql -U postgres -c "DROP DATABASE IF EXISTS datun_shadow;"
psql -U postgres -c "CREATE DATABASE datun_dev;"
psql -U postgres -c "CREATE DATABASE datun_shadow;"
$env:PGPASSWORD = $null

cd packages\db
pnpm prisma migrate deploy
```

### Permission denied

The `postgres` superuser needs full access. Verify:

```sql
\du
```

postgres should have Superuser, Create role, Create DB privileges.
