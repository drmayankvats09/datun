# Contributing to Datun

Thank you for your interest in contributing to Datun.

## Development Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Generate Prisma client: `pnpm db:generate`
4. Start development: `pnpm dev`

## Code Standards

- TypeScript strict mode
- ESLint + Prettier enforced via pre-commit hooks
- All PRs must pass: `pnpm check-types && pnpm lint && pnpm test:coverage && pnpm build`

## Pull Request Process

1. Create a feature branch from `main`
2. Follow conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`
3. Ensure all CI checks pass
4. Request review from `@drmayankvats09`

## Branch Naming

- `feat/short-description` — New features
- `fix/short-description` — Bug fixes
- `chore/short-description` — Maintenance

## Testing

- Backend: `apps/api/src/__tests__/`
- Frontend: `apps/web/__tests__/`
- Shared: `packages/shared/src/__tests__/`
- Run: `pnpm test:coverage`
- Minimum coverage: 60% lines

## Questions?

Email: dr.mayankvats09@gmail.com
