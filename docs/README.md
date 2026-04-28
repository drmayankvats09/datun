# Datun — Documentation

## Architecture

- **Frontend:** Next.js 16 App Router with `[locale]` dynamic segment
- **Backend:** Express 5 + TypeScript with modular service architecture
- **Database:** PostgreSQL via Prisma 6 ORM
- **AI:** Multi-provider fallback chain (Claude → GPT-4 → Gemini)

## Key Design Decisions

1. **Own auth system** — JWT + bcrypt, no Auth0. FAANG pattern: never redirect to 3rd-party login.
2. **Monorepo** — Turborepo + pnpm. Shared types, single CI pipeline.
3. **i18n from Day 1** — next-intl with 10 Indian languages.
4. **Observability from Day 1** — Sentry, Better Stack, UptimeRobot.

## Folder Structure

See main README.md for repository structure.

## API Documentation

API endpoints documented inline via JSDoc comments in route files.
See `apps/api/src/routes/` for available endpoints.
