![CI](https://github.com/drmayankvats09/datun/actions/workflows/ci.yml/badge.svg)

# Datun

AI-powered dental care platform for India — beginning with dental triage, expanding to unified healthcare aggregation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-latest-EF4444)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey)](#license)

---

## Overview

Datun is a patient-first dental healthcare platform combining AI-assisted clinical triage with a provider network. Patients describe symptoms, receive AI-guided dental assessments, and connect with verified clinics.

## Repository Structure

Turborepo monorepo:

### Applications

- `apps/web` — Patient-facing web application (Next.js 16, React 19, Tailwind v4, shadcn/ui)
- `apps/api` — Backend API service (Express 5, TypeScript, Prisma 6, PostgreSQL)

### Packages

- `packages/shared` — Shared types, constants, brand configuration
- `packages/db` — Prisma schema and database client
- `packages/ui` — Shared React component library
- `packages/eslint-config` — Shared ESLint configuration
- `packages/typescript-config` — Shared TypeScript configuration

## Prerequisites

- Node.js 20 or later
- pnpm 9 or later
- PostgreSQL 16 (Railway or local)

## Local Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Start all apps in development mode
pnpm dev

# Build all packages
pnpm build

# Run linting
pnpm lint

# Type check
pnpm check-types

# Run tests with coverage
pnpm test:coverage

# Format code
pnpm format
```

## Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Nova preset)
- **Backend:** Express 5, TypeScript, Prisma 6, PostgreSQL
- **AI:** Anthropic Claude (primary), OpenAI GPT-4 (fallback), Google Gemini (emergency)
- **Authentication:** Own JWT + bcrypt system, Google OAuth, Phone OTP (MSG91)
- **Email:** Resend
- **Messaging:** WhatsApp Business Platform (Meta Cloud API)
- **Deployment:** Vercel (frontend), Railway (backend + database)
- **Observability:** Sentry, Better Stack, UptimeRobot
- **i18n:** next-intl (10 Indian languages)

## Security and Compliance

- Aligned with the Digital Personal Data Protection Act, 2023 (India)
- Medical data handling per industry standards
- Redundant infrastructure across critical dependencies
- Automated security scanning (Semgrep, Gitleaks)

## Contact

Dr. Mayank Vats — Founder and CEO
Email: dr.mayankvats09@gmail.com

## License

Proprietary. All rights reserved. © 2026 Datun.
