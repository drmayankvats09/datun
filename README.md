# Datun

An AI-powered healthcare platform for India, beginning with dental care and expanding to a unified healthcare aggregation ecosystem.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-latest-EF4444)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey)](#license)

---

## Overview

Datun is a patient-first healthcare platform combining AI-assisted clinical guidance with a unified provider network. The platform supports concurrent usage across dental, pharmacy, laboratory, and specialty consultation verticals.

## Repository Structure

This repository is a Turborepo monorepo.

### Applications

- `apps/web` — Patient and clinic-facing web application (Next.js 15, React 19)
- `apps/api` — Backend API service (Node.js, Express, Prisma)

### Packages

- `packages/shared` — Shared TypeScript types and utilities
- `packages/db` — Prisma schema and database client
- `packages/ui` — Shared React component library
- `packages/eslint-config` — Shared ESLint configuration
- `packages/typescript-config` — Shared TypeScript configuration

## Prerequisites

- Node.js 20 or later
- pnpm 9 or later

## Local Development

Install dependencies:Run all applications in development mode:Build all applications and packages:Run linting across the monorepo:

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL
- **AI:** Anthropic Claude
- **Authentication:** Auth0
- **Payments:** Razorpay, Stripe
- **Messaging:** WhatsApp Business Platform
- **Deployment:** Vercel, Railway
- **Observability:** Sentry, Better Stack

## Security and Compliance

- Compliant with the Digital Personal Data Protection Act, 2023 (India)
- Medical data handling practices aligned with international standards
- Redundant infrastructure across critical dependencies
- Scheduled security audits

## Contact

Dr. Mayank Vats — Founder and Chief Executive Officer  
Email: dr.mayankvats@gmail.com

## License

Proprietary. All rights reserved. © 2026 Datun Health Private Limited.
