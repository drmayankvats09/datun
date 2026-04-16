# Datun Design System

Reference document for design tokens, component usage, and visual standards.

## Brand Colors

| Token           | Light Mode | Dark Mode | Usage                              |
| --------------- | ---------- | --------- | ---------------------------------- |
| `--primary`     | `#00A896`  | `#00C4AA` | Primary actions, links, highlights |
| `--foreground`  | `#0A0F1A`  | `#F9FAFB` | Body text                          |
| `--background`  | `#FFFFFF`  | `#0A0F1A` | Page background                    |
| `--card`        | `#FFFFFF`  | `#1A2332` | Card surfaces                      |
| `--muted`       | `#F3F4F6`  | `#1A2332` | Subtle backgrounds                 |
| `--destructive` | `#EF4444`  | `#DC2626` | Errors, delete actions             |
| `--border`      | `#E5E7EB`  | `#2D3748` | Borders, dividers                  |

## Typography

- **Font Family:** Inter (loaded via `next/font/google`, self-hosted)
- **Body:** 16px / 1.6 line-height
- **Headings:** font-weight 700, tracking-tight
- **Small text:** 14px for labels, 12px for captions

## Border Radius

| Token         | Value                  | Usage            |
| ------------- | ---------------------- | ---------------- |
| `--radius-sm` | `calc(0.625rem - 4px)` | Small badges     |
| `--radius-md` | `calc(0.625rem - 2px)` | Inputs, buttons  |
| `--radius-lg` | `0.625rem`             | Cards, dialogs   |
| `--radius-xl` | `calc(0.625rem + 4px)` | Large containers |

## Component Library

Built on shadcn/ui (Radix Primitives). Installed components:

`button`, `input`, `label`, `textarea`, `card`, `dialog`, `alert-dialog`,
`sheet`, `dropdown-menu`, `select`, `tabs`, `skeleton`, `badge`, `separator`,
`tooltip`, `avatar`, `alert`, `scroll-area`, `checkbox`, `switch`, `sonner`

All components are accessible (WCAG 2.1 AA) via Radix UI primitives.

### Adding New Components

```bash
cd apps/web
npx shadcn@latest add [component-name]
```

Components are installed to `apps/web/components/ui/`.

## Dark Mode

- Toggle via `class` attribute on `<html>` element
- Managed by `next-themes` library
- User preference persisted in `localStorage`
- System preference auto-detected on first visit
- Default: light mode

## Utility Function

```typescript
import { cn } from '@/lib/utils';

// Merges Tailwind classes with conflict resolution
cn('px-4 py-2', 'px-6'); // → 'py-2 px-6' (px-6 wins)
```

## File Structure

```
apps/web/
├── components/
│   ├── ui/              # shadcn/ui components (do not edit directly)
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   └── utils.ts         # cn() utility
└── app/
    └── globals.css      # Theme tokens (light + dark)
```
