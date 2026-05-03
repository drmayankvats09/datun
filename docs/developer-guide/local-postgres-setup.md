# Developer Guide: Local Postgres Setup

One-time setup required for any developer on Datun. Mirrors production (Postgres 18).

---

## Prerequisites

- Windows 10/11, macOS, or Linux
- Admin access to install software
- ~500 MB free disk space

## Install Postgres 18

### Windows

1. Download installer: https://www.postgresql.org/download/windows/
2. Choose **PostgreSQL 18.x** (must match Railway production version)
3. Run installer as Administrator
4. Defaults are fine. Set superuser password (save in password manager)
5. Port 5432 (default)
6. After install, verify in PowerShell:

```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

Expected: `psql (PostgreSQL) 18.x`

7. Add to PATH (admin PowerShell):

```powershell
   [Environment]::SetEnvironmentVariable(
     "Path",
     [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\PostgreSQL\18\bin",
     "Machine"
   )
```

Restart PowerShell.

### macOS

```bash
brew install postgresql@18
brew services start postgresql@18
```

### Linux (Ubuntu/Debian)

```bash
sudo apt install -y postgresql-18 postgresql-client-18
sudo systemctl start postgresql
```

## Create Datun databases

```bash
psql -U postgres
```

```sql
CREATE DATABASE datun_dev;
CREATE DATABASE datun_shadow;
\q
```

## Configure Datun

Create `packages/db/.env` (gitignored):

DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/datun_dev?schema=public"
SHADOW_DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@localhost:5432/datun_shadow?schema=public"

URL-encode special characters in password:

- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `:` → `%3A`

## Apply schema

```bash
cd packages/db
pnpm prisma migrate deploy
```

Verify:

```bash
pnpm prisma migrate status
```

Expected: `Database schema is up to date!`

## Troubleshooting

See [shadow-database-issues.md](../runbooks/shadow-database-issues.md).
