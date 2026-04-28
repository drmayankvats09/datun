# Changelog

All notable changes to Datun will be documented in this file.

## [Unreleased] — v2.0.0

### Added

- Monorepo architecture (Turborepo + pnpm)
- Own auth system (JWT + bcrypt, Google OAuth, Phone OTP)
- Multi-provider AI fallback (Claude → GPT-4 → Gemini)
- i18n support (English + Hindi)
- WhatsApp Business integration
- Sentry error tracking + Better Stack logging

### Changed

- Frontend: Next.js 16, React 19, Tailwind v4, shadcn/ui
- Backend: Express 5, Prisma 6, TypeScript strict
- Brand: "Datun AI" → "Datun"

### Removed

- Auth0 dependency
- googleapis library
