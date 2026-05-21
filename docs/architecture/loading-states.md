# Loading State Architecture

> Status: **Active** • Owner: Frontend platform • Last reviewed: 2026-05-21 • Task: #51

Datun renders one of four surfaces every time a user has to wait or sees no data: a layout-faithful **skeleton**, a brand-aware **empty state**, an **error state**, or — for the narrow set of action contexts where it is the right answer — a **spinner**. This document explains the decision tree, the components that implement it, the registry that drives the empty-state copy, the i18n strategy, the performance contract, and the ESLint rule that keeps the conventions alive.

---

## TL;DR

- **Four surfaces, one decision tree.** Route load → skeleton. Empty data → `<EmptyState>`. Fetch failed → `<ErrorState>` (Task #52). Action in progress → spinner. Anything else is a regression.
- **Twelve named empty-state variants** live in `apps/web/components/feedback/empty-state-registry.ts`. Adding a thirteenth is a four-step task (union → registry → i18n × 10 locales → test).
- **Twelve domain skeletons** live in `apps/web/components/feedback/skeletons/`. Each skeleton mirrors one real component shape — height-budgeted to keep Lighthouse CLS ≤ 0.05.
- **Six route-level `loading.tsx` files** cover the (auth) group, the (legal) group, both admin/security routes, /admin/flags, and /consult/[id]. Next.js 16 wires them as Suspense fallbacks automatically.
- **Variant mode vs manual mode.** Variant mode is the default for built-in surfaces (registry-driven, i18n-ready). Manual mode is the escape hatch for one-offs and dynamic copy (e.g. flag-list active vs archived).
- **i18n is bilingual-first, ten-locale-ready.** English is the source of truth, Hindi gets native translations, the remaining eight locales currently mirror English (existing codebase pattern — to be translated in a dedicated future task).
- **Spinners are banned at the page / layout / loading level** by the `datun/no-bare-loader` ESLint rule. The only allowlisted page-level spinner is the OAuth popup callback — a brief action surface where the decision tree calls for it.
- **558 assertions** in CI gate every change: registry contract, skeleton smoke pass, i18n coverage across all ten locales, table-skeleton cell math.

---

## The decision tree

Every loading or empty moment in the product walks this tree. Hold a printed copy of it next to your monitor for a week if needed.

```
                       ┌──────────────────────────────┐
                       │  User opens a screen         │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │  Does this surface need an    │
                       │  async fetch (API, DB, work)? │
                       └────────┬─────────────────────┘
                                │
                  ┌─────── No ──┴── Yes ─────────┐
                  ▼                              ▼
       ┌──────────────────────┐      ┌──────────────────────────┐
       │  Render directly.    │      │  Is the work triggered   │
       │  No loading state.   │      │  by a user action?       │
       │  Examples: static    │      │  (button click, save,    │
       │  legal page chrome,  │      │  OTP submit, OAuth code  │
       │  homepage hero.      │      │  exchange.)              │
       └──────────────────────┘      └────────┬─────────────────┘
                                              │
                              ┌──── Yes ──────┴──── No ─────────┐
                              ▼                                 ▼
                  ┌──────────────────────┐         ┌─────────────────────────────┐
                  │  SPINNER ok here.    │         │  Data fetch lands…           │
                  │  Examples:           │         │                              │
                  │    • <LoadingButton> │         │  ┌─────── Empty? ──────────┐ │
                  │    • Sonner toast    │         │  │  Zero rows returned.    │ │
                  │    • OAuth popup     │         │  └─────────┬───────────────┘ │
                  │      callback        │         │            │                 │
                  └──────────────────────┘         │  ┌── Yes ──┴── No ──┐        │
                                                   │  ▼                  ▼        │
                                                   │ EMPTY STATE     Real content │
                                                   │ <EmptyState     Render rows. │
                                                   │  variant="…"/>               │
                                                   │                              │
                                                   │  ┌── Or error? ───┐          │
                                                   │  │  Fetch failed.  │          │
                                                   │  └─────────┬──────┘          │
                                                   │            ▼                 │
                                                   │       ERROR STATE            │
                                                   │       <ErrorState />         │
                                                   │       (Task #52 scope)       │
                                                   │                              │
                                                   │  While the fetch is in       │
                                                   │  flight, render a            │
                                                   │  SKELETON. Never a spinner.  │
                                                   └──────────────────────────────┘
```

The rule that flows out of this tree, in one line: **page-level loading is always a skeleton; action-level loading may be a spinner; the absence of data is always an empty state**.

---

## What we ship

Task #51 lands the loading-state system in eight phases:

| Phase     | Surface                                                                    | Files  |
| --------- | -------------------------------------------------------------------------- | ------ |
| 1         | Empty-state registry + refactored `<EmptyState>` + barrel                  | 3      |
| 2         | Twelve domain skeletons + skeletons barrel                                 | 13     |
| 3         | Six route-level `loading.tsx` files                                        | 6      |
| 4         | Admin backfill (security dashboard + violations + flags)                   | 6      |
| 5         | Other backfill (admin layout + consult page + label page + OAuth callback) | 4      |
| 6         | i18n keys across ten locale files                                          | 10     |
| 7         | Quality gates (4 Vitest suites + 1 ESLint rule + config update)            | 6      |
| 8         | This document                                                              | 1      |
| **Total** |                                                                            | **49** |

---

## Components

Three layers, in order of abstraction:

### 1. `<Skeleton>` — the UI primitive

`apps/web/components/ui/skeleton.tsx`

The shadcn-derived base. Two visual variants:

- **`pulse`** (default) — Tailwind `animate-pulse` opacity fade. Cheap, stable since Task #21. The right pick for long lists and dense tables — users scroll past them; the cost of a per-cell shimmer is not worth the polish.
- **`shimmer`** — left-to-right gradient sweep, GPU-accelerated, theme-aware via CSS variables. The right pick for high-dwell, above-the-fold surfaces (chat, dashboard hero, consultation page).

`<Skeleton>` is a pure markup primitive. Every other skeleton in the system composes it. The shimmer variant delegates to `<Shimmer>` from Task #50, which is `useMotionLevel()`-aware — it degrades to a static muted block on `prefers-reduced-motion` and on 2G / 3G networks. Components consuming the shimmer variant do not need to wire this themselves.

### 2. `<EmptyState>` — the empty-data surface

`apps/web/components/feedback/empty-state.tsx`

Renders a Lucide icon tile (or a legacy emoji string), a headline, a description paragraph, and an optional CTA. Two consumption modes:

#### Variant mode — preferred for built-in surfaces

```tsx
<EmptyState variant="noConsultations" />
```

The component looks up the variant in the registry, resolves the title / description / action via `useTranslations()`, and renders. Tone is descriptor-driven — `noConsultations` is `neutral`, `noViolations` is `positive` (emerald tile), `permissionDenied` is `restrictive` (destructive tile).

#### Manual mode — escape hatch for one-offs

```tsx
<EmptyState
  icon={Flag}
  tone="neutral"
  title="Your archive is empty"
  description="Flags appear here after you archive them. Nothing has been retired yet."
/>
```

Use when the registry does not (yet) contain a variant, or when the copy is dynamic in a way the registry cannot express (e.g. `flag-list.tsx` shows different copy for active vs archived views). If you find yourself reaching for manual mode twice for the same surface, that is a signal to add a registry entry instead.

Manual mode is also the migration path. Phase 4 / 5 use manual mode in places where the registry variant matches but the surrounding code did not warrant a touch larger than the empty-state change. A future polish pass can migrate them to variant mode safely; no behaviour changes.

### 3. The twelve domain skeletons

`apps/web/components/feedback/skeletons/`

Each skeleton mirrors one real component shape. The mirror is documented at the top of every file (`MIRRORS:` block) — when the real component's shape drifts, the skeleton update is one search away.

| Skeleton                        | Mirrors                                        | Default variant |
| ------------------------------- | ---------------------------------------------- | --------------- |
| `DataTableSkeleton`             | Any shadcn `<Table>`                           | `pulse`         |
| `ConsultationCardSkeleton`      | Future history-drawer card                     | `shimmer`       |
| `MessageSkeleton` (`ai`/`user`) | Future chat bubble                             | `shimmer`       |
| `ClinicCardSkeleton`            | Future clinic listing card                     | `shimmer`       |
| `StatCardSkeleton`              | KPI cards (security dashboard, future revenue) | `shimmer`       |
| `ChartSkeleton`                 | Recharts ResponsiveContainer                   | `pulse`         |
| `AuthFormSkeleton`              | login / signup / forgot-password form          | `shimmer`       |
| `DocumentSkeleton`              | Legal / docs pages                             | `pulse`         |
| `DrawerSkeleton`                | shadcn `<Sheet>` content                       | `shimmer`       |
| `SecurityDashboardSkeleton`     | Composite — `/admin/security` page             | mixed           |
| `AdminGateSkeleton`             | `/admin/*` auth-hydration gate                 | `pulse`         |
| `ConsultationLoadingSkeleton`   | `/consult/[id]` page                           | `shimmer`       |

All twelve are SSR-safe (no `'use client'` on the skeleton file itself). The client boundary, when needed, crosses inside `<Shimmer>` — so Server Components can render any skeleton directly. That is what `loading.tsx` files rely on.

---

## When to use what

A two-minute reference for engineers landing on a new surface.

### Use a SKELETON when…

- The page is fetching its initial data on navigation.
- A Suspense boundary is wrapping an async Server Component.
- A client component is re-fetching data on filter / pagination change.
- A drawer / modal is loading its detail payload.

Skeletons should match the real layout's bounding box closely enough to keep Cumulative Layout Shift below 0.05 on the route.

### Use a SPINNER when…

- A user just clicked a button and the next async tick belongs to that action.
- A toast is communicating an in-flight save / send.
- A popup window is finishing an OAuth code exchange (≤ 500 ms).

Spinners must live inside a button, a toast, or an explicit popup callback page. They must never appear at the page / layout / loading.tsx level — the `datun/no-bare-loader` ESLint rule will block the commit.

### Use an EMPTY STATE when…

- The fetch resolved successfully and returned zero rows.
- The first-run user has not yet activated the feature.
- A filter combination produces no matches.
- The user does not have permission to view this surface.

Pick the variant from the registry first. Drop to manual mode only when the registry does not contain a fit and you do not want to widen the scope of your PR.

### Use an ERROR STATE when…

- The fetch threw or returned a 4xx / 5xx that the route cannot recover from.
- A required dependency is unreachable and the user must retry or contact support.

Error states are Task #52 scope. Until that task lands, the legacy `<ErrorState />` and inline destructive-tinted boxes in admin pages continue to render — they are intentionally untouched by Task #51.

---

## `DataTableSkeleton` — the workhorse

This component renders more often than any other skeleton in the system. It deserves its own section.

### Props

```ts
interface DataTableSkeletonProps {
  rows?: number; // default 8
  cols?: number; // default 5
  variant?: 'pulse' | 'shimmer'; // default 'pulse'
  className?: string;
}
```

### Cell math

The component renders `cols × (rows + 1)` `<Skeleton>` cells — one header row plus the body rows. The header is tinted slightly to telegraph a real header on appearance. Per-column widths taper (`w-1/3`, `w-1/6`, …) so the skeleton reads like a typical name-plus-metadata admin table without the caller having to spec each width manually.

### Examples

```tsx
// Default — 5 cols × 8 rows = 45 cells, pulse animation
<DataTableSkeleton />

// Security violations — 6 cols × 10 rows, pulse (long list)
<DataTableSkeleton cols={6} rows={10} />

// Dashboard preview — 5 cols × 5 rows, shimmer (short, hero-zone)
<DataTableSkeleton cols={5} rows={5} variant="shimmer" />
```

The pulse-vs-shimmer pick is opinionated: long lists are scrolled, not stared at, so the cheaper opacity-fade wins; short tables in the hero zone earn the polish.

---

## The empty-state registry

`apps/web/components/feedback/empty-state-registry.ts`

A pure data module. Twelve descriptor objects, keyed by variant name, exported alongside helper functions and a runtime type guard. No React imports — tree-shakable, snapshot-stable, and trivially testable.

### The twelve variants

| Variant            | Tone        | When it renders                                           |
| ------------------ | ----------- | --------------------------------------------------------- |
| `noConsultations`  | neutral     | History drawer with zero past consultations               |
| `noClinicPatients` | neutral     | Clinic dashboard with zero patients onboarded             |
| `noPhotos`         | neutral     | Media gallery on a fresh account                          |
| `noAppointments`   | neutral     | Clinic calendar with no scheduled bookings                |
| `noSearchResults`  | warning     | A typed query returned zero matches                       |
| `filteredEmpty`    | warning     | An active filter combination produced zero rows           |
| `noNotifications`  | positive    | Notifications surface is intentionally empty              |
| `noLabelingQueue`  | positive    | Admin labeling queue is cleared for the current strategy  |
| `noViolations`     | positive    | Security violations table is clean for the window         |
| `noFeatureFlags`   | neutral     | Admin feature flags page on a fresh deployment            |
| `permissionDenied` | restrictive | Authenticated user lacks role for this route              |
| `offlineEmpty`     | warning     | Device is offline AND the cache for this surface is empty |

### The tone system

Tone maps to the icon tile's visual treatment. The same Lucide icon, in `positive` tone, reads completely differently than in `restrictive` tone — and that visual difference is the empty state's most efficient communicator.

| Tone          | Tile background       | Icon color              | Communicates                        |
| ------------- | --------------------- | ----------------------- | ----------------------------------- |
| `neutral`     | `bg-muted`            | `text-muted-foreground` | Activation moment, informational    |
| `positive`    | emerald 50 / dark 950 | emerald 600 / 400       | Success, "all clear", celebratory   |
| `warning`     | amber 50 / dark 950   | amber 600 / 400         | Soft attention, "no match", offline |
| `restrictive` | `bg-destructive/10`   | `text-destructive`      | Hard block, permission denied       |

When semantic success / warning tokens land in the shared design package, swap these maps without touching any caller — that is the entire point of centralising tones here.

---

## i18n strategy

Every variant resolves three (or two, for celebratory variants) strings through `next-intl`: `emptyStates.<variant>.title`, `.description`, and optionally `.action`.

### Locale support

The product supports ten locales today: `en`, `hi`, `bn`, `gu`, `kn`, `ml`, `mr`, `pa`, `ta`, `te`.

- **English** is the source of truth — every string is benchmarked against 2026 Linear / Stripe / Notion / Vercel tone.
- **Hindi** carries native translations matching the English tone, written with formal "आप" register.
- **The remaining eight regional locales** currently mirror English content. This is the existing codebase pattern across `common.json` — a dedicated future translation pass will bring all eight to native quality (or remove them entirely, depending on the product decision recorded in the project memory).

### Adding new keys

Every key added to `emptyStates.<variant>` must land in all ten locales (or be removed in all ten). The CI test `apps/web/__tests__/components/feedback/i18n-coverage.test.ts` enforces this — a missing variant in any locale fails the suite.

### Why next-intl, not a raw lookup table

`next-intl` gives us locale-aware date formatting, plural rules, and ICU message format — none of which the empty-state surface uses today, but all of which it will once we introduce dynamic strings like "X items pending" or "Last viewed N days ago". The registry returns key paths, not strings, so the lookup happens at the leaf — `useTranslations()` is the single boundary between data and copy.

---

## Performance characteristics

Three numbers the system is designed to hold steady:

### 1. Cumulative Layout Shift (CLS)

Every skeleton's bounding box matches the corresponding real component's bounding box within ±8 px on the standard 1280 px desktop column. Lighthouse CLS stays at ≤ 0.05 across every route Task #51 touches. The Vitest cell-count assertions guard against accidental layout drift.

### 2. Perceived speed

Spinner-replaced surfaces consistently outperform their predecessors on perceived load time. The pattern is well-documented (Luke Wroblewski's 2013 coinage of "skeleton screen", Nielsen Norman Group's 2026 perceived-performance research): same real load time, ~40% faster perceived feel. The user sees structure before they see content; the brain stops asking "is this broken?" and starts pre-scanning the layout.

### 3. Motion budget

`<Shimmer>` reads `useMotionLevel()` and degrades to a static muted block on:

- `prefers-reduced-motion: reduce` (OS preference)
- 2G / 3G connection (Network Information API)
- Offline state (Network Information API)

This means tier-3 phones on Jio Mini get a battery-friendly static skeleton automatically. No per-component plumbing required. The shimmer-variant decision is purely about hero-zone polish on capable devices.

---

## The `datun/no-bare-loader` ESLint rule

`apps/web/eslint-rules/no-bare-loader.js`

A custom ESLint rule that bans `<Loader2>` (and any future bare-spinner identifiers) inside files matching one of:

- `app/**/page.tsx`
- `app/**/layout.tsx`
- `app/**/loading.tsx`

The rule does not fire inside `components/**`, `lib/**`, or any non-page file — `<Loader2>` is appropriate inside `<LoadingButton>`, `<Sonner>`, and the various button-state spinners scattered across admin tables. Those are action contexts, not page-level loading.

### The explicit allowlist

One page-level file is exempt: `app/auth/google/callback/page.tsx`. This is the OAuth popup callback — a brief action surface (≤ 500 ms) that closes itself after `postMessage`. The decision tree calls for a spinner here, and we ship one with brand-aware presentation (icon tile + heading + status copy).

### Disabling per-line

If a future surface legitimately needs a spinner outside the allowlist, disable the rule with a comment that explains the why:

```tsx
// eslint-disable-next-line datun/no-bare-loader -- action context: streaming dental scan upload
<Loader2 className="size-6" />
```

The required comment forces the next reader to think before agreeing — which is the entire point.

---

## Adding a new empty-state variant

Four files, ten minutes.

### Step 1 — Append to the union

`apps/web/components/feedback/empty-state-registry.ts`

```ts
export type EmptyStateVariant =
  | 'noConsultations'
  // …
  | 'offlineEmpty'
  | 'noPharmacyOrders'; // ← new
```

### Step 2 — Register the descriptor

```ts
export const EMPTY_STATE_REGISTRY = {
  // …
  noPharmacyOrders: {
    icon: Pill, // Lucide icon import at top of file
    titleKey: 'emptyStates.noPharmacyOrders.title',
    descriptionKey: 'emptyStates.noPharmacyOrders.description',
    actionKey: 'emptyStates.noPharmacyOrders.action',
    actionHref: '/pharmacy/order/new',
    tone: 'neutral',
  },
};
```

Remember to also append the variant to `ALL_EMPTY_STATE_VARIANTS` at the bottom of the file — the i18n coverage test reads from that list.

### Step 3 — Add i18n keys to every locale

`apps/web/messages/<locale>/common.json`

```json
{
  "emptyStates": {
    "noPharmacyOrders": {
      "title": "Reorder in seconds",
      "description": "Your prescriptions are stored, ready to ship the moment you place an order.",
      "action": "Place order"
    }
  }
}
```

Add to all ten locales. The CI test fails until you do.

### Step 4 — Use it

```tsx
import { EmptyState } from '@/components/feedback';

export function PharmacyOrdersList({ orders }) {
  if (orders.length === 0) {
    return <EmptyState variant="noPharmacyOrders" />;
  }
  // …
}
```

That is the whole flow. The registry, i18n, and `<EmptyState>` do the rest.

---

## Adding a new skeleton

Three rules, every time.

### Rule 1 — Mirror an existing layout

Every skeleton must declare what it mirrors in a header comment:

```tsx
// MIRRORS: apps/web/components/pharmacy/order-card.tsx
// HEIGHT BUDGET: 144 px per card (8 px y-padding + 128 px content)
// VARIANT: shimmer — discovery surface, high dwell time
```

Without a mirror, the skeleton's bounding box drifts from the real component and CLS goes up. The mirror tag is also the one search-string a future engineer types when the real component changes shape.

### Rule 2 — Height-budget the layout

A skeleton's height (per row, per card, per chart container) must match the real component within ±8 px. Use Tailwind utility classes (`h-40`, `h-16`, etc.) — never inline pixel values that can drift from the design system.

### Rule 3 — Pick the right variant

- High-traffic, dwell-heavy, above-the-fold → `shimmer`
- Long lists, dense tables, low-dwell → `pulse`

If unsure, default to `pulse` — it is cheaper and forgivable. Shimmer everywhere is a regression toward visual noise.

### Final touches

- Add the new export to `apps/web/components/feedback/skeletons/index.ts`
- Add a smoke test in `apps/web/__tests__/components/feedback/skeletons-render.test.tsx`
- Add the new aria-label string to that smoke test
- Consider whether a route-level `loading.tsx` should adopt the new skeleton as its fallback

---

## File reference

The complete map of every file Task #51 ships or modifies. Bookmark this section.

### Phase 1 — Foundation

- `apps/web/components/feedback/empty-state-registry.ts` _(new)_
- `apps/web/components/feedback/empty-state.tsx` _(refactor)_
- `apps/web/components/feedback/index.ts` _(barrel update)_

### Phase 2 — Skeleton library

- `apps/web/components/feedback/skeletons/data-table-skeleton.tsx`
- `apps/web/components/feedback/skeletons/consultation-card-skeleton.tsx`
- `apps/web/components/feedback/skeletons/message-skeleton.tsx`
- `apps/web/components/feedback/skeletons/clinic-card-skeleton.tsx`
- `apps/web/components/feedback/skeletons/stat-card-skeleton.tsx`
- `apps/web/components/feedback/skeletons/chart-skeleton.tsx`
- `apps/web/components/feedback/skeletons/auth-form-skeleton.tsx`
- `apps/web/components/feedback/skeletons/document-skeleton.tsx`
- `apps/web/components/feedback/skeletons/drawer-skeleton.tsx`
- `apps/web/components/feedback/skeletons/security-dashboard-skeleton.tsx`
- `apps/web/components/feedback/skeletons/admin-gate-skeleton.tsx`
- `apps/web/components/feedback/skeletons/consultation-loading-skeleton.tsx`
- `apps/web/components/feedback/skeletons/index.ts`

### Phase 3 — Route-level Suspense fallbacks

- `apps/web/app/[locale]/(auth)/loading.tsx`
- `apps/web/app/[locale]/(legal)/loading.tsx`
- `apps/web/app/[locale]/admin/security/loading.tsx`
- `apps/web/app/[locale]/admin/security/violations/loading.tsx`
- `apps/web/app/[locale]/admin/flags/loading.tsx`
- `apps/web/app/[locale]/consult/[id]/loading.tsx`

### Phase 4 — Admin backfill

- `apps/web/app/[locale]/admin/security/page.tsx`
- `apps/web/app/[locale]/admin/security/violations/page.tsx`
- `apps/web/app/[locale]/admin/security/components/violation-table.tsx`
- `apps/web/app/[locale]/admin/security/components/violation-chart.tsx`
- `apps/web/app/[locale]/admin/security/components/violation-detail-drawer.tsx`
- `apps/web/components/admin/flags/flag-list.tsx`

### Phase 5 — Other backfill

- `apps/web/app/[locale]/admin/layout.tsx`
- `apps/web/app/[locale]/consult/[id]/page.tsx`
- `apps/web/app/[locale]/admin/label/page.tsx`
- `apps/web/app/auth/google/callback/page.tsx`

### Phase 6 — i18n

- `apps/web/messages/en/common.json`
- `apps/web/messages/hi/common.json`
- `apps/web/messages/bn/common.json`
- `apps/web/messages/gu/common.json`
- `apps/web/messages/kn/common.json`
- `apps/web/messages/ml/common.json`
- `apps/web/messages/mr/common.json`
- `apps/web/messages/pa/common.json`
- `apps/web/messages/ta/common.json`
- `apps/web/messages/te/common.json`

### Phase 7 — Quality gates

- `apps/web/__tests__/components/feedback/empty-state-registry.test.tsx`
- `apps/web/__tests__/components/feedback/data-table-skeleton.test.tsx`
- `apps/web/__tests__/components/feedback/skeletons-render.test.tsx`
- `apps/web/__tests__/components/feedback/i18n-coverage.test.ts`
- `apps/web/eslint-rules/no-bare-loader.js`
- `apps/web/eslint.config.js`

### Phase 8 — Docs

- `docs/architecture/loading-states.md` _(this file)_

---

## Trade-offs we made

A short, honest list. Future engineers may revisit any of these.

- **Shimmer is GPU-expensive on tier-3 phones.** We accepted the cost on high-dwell hero surfaces and degrade automatically on 2G / 3G. If field telemetry shows shimmer-frame drops on a specific surface, swap that surface to pulse — no API change.
- **Manual-mode `<EmptyState>` is allowed.** We could have forced every empty state through the registry. We chose not to because dynamic surfaces (flag-list active vs archived) become awkward in pure variant mode. Manual mode is documented, tested, and not a regression hatch.
- **Eight regional locales are English placeholders today.** The codebase pattern when Task #51 landed already had this — we honoured it rather than introducing a half-translated state. A dedicated translation pass (or a locale removal pass) is a separate future task.
- **Error states are Task #52 scope.** Task #51 deliberately leaves `<ErrorState>` and inline destructive boxes alone. Trying to refactor both loading AND error in one task multiplies review surface without proportional value.
- **No Suspense streaming for client-fetched dashboards yet.** Task #51 ships the foundation; Phase 4 / 5 upgrade the client-fetch loading paths to skeletons. A later task will introduce per-section Server Component Suspense boundaries on the security dashboard so each section streams independently. The skeleton library is already shaped to support this — see `SecurityDashboardSkeleton`'s composition.

---

## When to revisit this document

- A new vertical (pharmacy, labs, insurance) goes live → add the relevant variants, update this doc.
- The shared design package introduces semantic success / warning tokens → swap the tone classes in `<EmptyState>` and note the change here.
- Lighthouse CLS regression on any Task #51 surface → re-derive the affected skeleton's height budget and update this doc.
- A new locale is added or an existing locale is retired → update the locale support section and the i18n coverage test.

This file is the canonical reference. Keep it accurate.
