// apps/web/lib/query/keys.ts
// ═══════════════════════════════════════════════════════════════
// QUERY KEY FACTORY — Task #47 Phase 1
//
// The SINGLE source of truth for every TanStack Query cache key.
// Hierarchical design (Linear / Stripe / Notion pattern):
//
//   .all          → root of the domain (invalidate ALL sub-keys)
//   .lists()      → root of every list view in the domain
//   .list(filt)   → fully scoped key for ONE filter combination
//   .details()    → root of every detail fetch in the domain
//   .detail(id)   → fully scoped key for ONE resource id
//
// Granularity rules of thumb (memorise these):
//   - Mutation that touches ONE resource     → invalidate
//                                              .detail(id) + .lists()
//   - Mutation that touches the WHOLE list   → invalidate .all
//   - Mutation that affects multiple domains → invalidate each .all
//
// Why `as const`:
//   - Gives literal-typed tuples → `invalidateQueries({ queryKey })`
//     accepts them without `as any` gymnastics
//   - TypeScript can structurally distinguish key shapes for tools
//     like ESLint plugins / codemods later
//
// Why functions for .list(filters):
//   - Same filter object → same key reference equality is impossible
//     across renders, but TanStack uses deep-equal on keys, so the
//     filters object identity does not matter (deep-equal handles it)
//   - Functions give us a hook for runtime validation later
//
// Anti-patterns this prevents:
//   - Typo'd keys (`['consulation']` vs `['consultations']`) cause
//     ghost cache entries that never invalidate
//   - Inconsistent shape (`['consultations', id]` vs
//     `['consultations', 'detail', id]`) breaks `.invalidateQueries`
//     with broad keys
//   - Hardcoded filter merging across components
// ═══════════════════════════════════════════════════════════════

import type {
  ConsultationFilters,
  ClinicFilters,
  NotificationListFilters,
  LabelingQueueStrategy,
} from '@repo/shared';

export const queryKeys = {
  // ── Auth ──────────────────────────────────────────────────
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // ── Users ─────────────────────────────────────────────────
  users: {
    all: ['users'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
  },

  // ── Consultations ─────────────────────────────────────────
  consultations: {
    all: ['consultations'] as const,
    lists: () => [...queryKeys.consultations.all, 'list'] as const,
    list: (filters: ConsultationFilters) => [...queryKeys.consultations.lists(), filters] as const,
    infinite: (filters: ConsultationFilters) =>
      [...queryKeys.consultations.all, 'infinite', filters] as const,
    details: () => [...queryKeys.consultations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.consultations.details(), id] as const,
    pdf: (id: string) => [...queryKeys.consultations.all, 'pdf', id] as const,
  },

  // ── Clinics ───────────────────────────────────────────────
  clinics: {
    all: ['clinics'] as const,
    lists: () => [...queryKeys.clinics.all, 'list'] as const,
    list: (filters: ClinicFilters) => [...queryKeys.clinics.lists(), filters] as const,
    details: () => [...queryKeys.clinics.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clinics.details(), id] as const,
    search: (q: string) => [...queryKeys.clinics.all, 'search', q] as const,
  },

  // ── Appointments ──────────────────────────────────────────
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...queryKeys.appointments.all, 'list'] as const,
    list: (filters: {
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }) => [...queryKeys.appointments.lists(), filters] as const,
    details: () => [...queryKeys.appointments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.appointments.details(), id] as const,
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: NotificationListFilters) =>
      [...queryKeys.notifications.lists(), filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  // ── Prescriptions (Task #58) ──────────────────────────────
  prescriptions: {
    all: ['prescriptions'] as const,
    lists: () => [...queryKeys.prescriptions.all, 'list'] as const,
    details: () => [...queryKeys.prescriptions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.prescriptions.details(), id] as const,
  },

  // ── Health Score (Task #32) ───────────────────────────────
  healthScore: {
    all: ['health-score'] as const,
    current: () => [...queryKeys.healthScore.all, 'current'] as const,
    history: (range: '30d' | '90d' | '180d' | '365d') =>
      [...queryKeys.healthScore.all, 'history', range] as const,
  },

  // ── Media ─────────────────────────────────────────────────
  media: {
    all: ['media'] as const,
    asset: (id: string) => [...queryKeys.media.all, 'asset', id] as const,
  },

  // ── Feature Flags (Task #49) ──────────────────────────────
  flags: {
    all: ['flags'] as const,
    list: (userId: string | null) => [...queryKeys.flags.all, 'list', userId] as const,
  },

  // ── Admin / Labeling (Task #44) ───────────────────────────
  labeling: {
    all: ['labeling'] as const,
    queue: (strategy: LabelingQueueStrategy, limit: number) =>
      [...queryKeys.labeling.all, 'queue', strategy, limit] as const,
    stats: () => [...queryKeys.labeling.all, 'stats'] as const,
    conflicts: (limit: number) => [...queryKeys.labeling.all, 'conflicts', limit] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
