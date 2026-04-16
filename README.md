# 🦷 Datun

> India's AI-powered healthcare aggregation platform.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-latest-red)](https://turbo.build/)

**Mission:** Healthcare is a Right, Not a Privilege.

---

## 🏗️ Architecture

This is a Turborepo monorepo containing:

### Apps

- `apps/web` — Next.js 15 frontend (patient + clinic interfaces)
- `apps/api` — Node.js / Express backend (to be added)

### Packages

- `packages/shared` — Shared TypeScript types + utilities
- `packages/db` — Prisma schema + database client
- `packages/ui` — Shared React component library
- `packages/eslint-config` — Shared ESLint configuration
- `packages/typescript-config` — Shared TypeScript configuration

---

## 🚀 Quick Start

**Prerequisites:**

- Node.js 20+
- pnpm 9+

**Setup:**

```bash
# Install dependencies
pnpm install

# Run all apps in development mode
pnpm dev

# Build all apps and packages
pnpm build

# Lint entire monorepo
pnpm lint
```

---

## 📦 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js 20+, Express, Prisma ORM
- **Database:** PostgreSQL (Railway)
- **AI:** Claude Sonnet 4 API
- **Auth:** Auth0
- **Payments:** Razorpay (primary), Stripe (fallback)
- **Messaging:** Meta WhatsApp Cloud API
- **Deployment:** Vercel (frontend), Railway (backend)
- **Monitoring:** Sentry, Better Stack

---

## 📚 Documentation

- **Architecture:** `/docs/architecture.md` (coming soon)
- **Design System:** `/docs/design-system.md` (coming soon)
- **API Docs:** `/docs/api.md` (coming soon)

---

## 🔒 Security & Compliance

- **DPDP Act 2023 compliant** (India Digital Personal Data Protection)
- **HIPAA-equivalent practices** for medical data
- **Zero single-point-of-failure** architecture
- **Quarterly security audits**

---

## 🦷 Founder

Dr. Mayank Vats — Founder & CEO  
BDS Dental Surgeon | Clinical Head, DAV Hospital, Delhi  
[LinkedIn](https://www.linkedin.com/in/drmayankvats) | [Email](mailto:dr.mayankvats@gmail.com)

---

## 📝 License

Proprietary. All rights reserved. © 2026 Datun Health Pvt Ltd.

---

**🚀 Day 1 of v2 rebuild: 17 April 2026. Target launch: 27 June 2026 (10-week sprint).**
