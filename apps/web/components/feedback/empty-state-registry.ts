// ═══════════════════════════════════════════════════════════════
// EMPTY STATE REGISTRY — Single source of truth for every
// "no data" scenario across the Datun product surface.
//
// WHY THIS FILE EXISTS
// ─────────────────────
// In a FAANG-grade product, empty states are not afterthoughts —
// they are the highest-leverage activation moments. A user landing
// on a blank dashboard for the first time decides in under three
// seconds whether the product is worth their time. Stripe, Linear,
// Notion, and Vercel each maintain a central catalog of empty-state
// variants so that:
//
//   1. Designers tweak copy in one place; the change propagates.
//   2. Engineers add a new vertical (pharmacy, labs, insurance)
//      by appending a single registry entry, not by editing pages.
//   3. Translators receive a complete, finite list of i18n keys.
//   4. QA can enumerate every empty state for visual regression.
//
// Datun follows the same pattern. When the dental vertical ships,
// we expect a dozen variants. When pharmacy + labs + specialists
// join (per the long-term "Zomato of healthcare" vision), this
// file will grow to ~40 entries — still a single source of truth.
//
// ARCHITECTURE
// ────────────
// Pure data module — zero runtime side-effects, no React imports,
// tree-shakable. The accompanying `<EmptyState variant="…"/>`
// component reads from this registry. Manual-mode props remain
// supported for one-off cases outside the registry.
//
// COPY GUIDELINES (Memory rule #19)
// ─────────────────────────────────
// Every string in this file is professional FAANG-grade English
// benchmarked against Linear, Stripe, Notion, Vercel, Arc, and
// Raycast. Locale switches only when the user explicitly picks
// another language. Tone is confident, clear, and slightly
// punchy — Gen-Z reads punch, Millennials read polish. No casual
// Hinglish, no emoji-only headlines, no exclamation spam.
//
// ICON CHOICE
// ───────────
// Lucide icons are used in place of emoji glyphs. Lucide ships
// stroke-based SVG marks that scale crisply on retina displays,
// inherit currentColor (giving us free tone theming), and remain
// legible on tier-3 phones where emoji fonts vary. Each icon is
// chosen to map intuitively to the variant's semantics.
//
// References:
//   • Linear empty states  — https://linear.app
//   • Stripe Radar         — https://stripe.com/radar
//   • Notion onboarding    — https://notion.so
//   • Vercel dashboards    — https://vercel.com
//   • NN/g 2026 guidance   — https://www.nngroup.com/articles/empty-state/
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import type { LucideIcon } from 'lucide-react';
import {
  BellOff,
  CalendarDays,
  Camera,
  CheckCircle2,
  Filter,
  Flag,
  Lock,
  SearchX,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Every empty-state variant Datun can render today.
 *
 * Adding a new variant is a four-step task:
 *   1. Append the literal to this union.
 *   2. Add a `EmptyStateDescriptor` entry to `EMPTY_STATE_REGISTRY`.
 *   3. Add the matching `title` / `description` / `action` keys to
 *      every locale file under `apps/web/messages/<locale>/common.json`
 *      inside the `emptyStates.<variant>` namespace.
 *   4. Add a Vitest snapshot in
 *      `apps/web/__tests__/components/feedback/empty-state-registry.test.tsx`.
 *
 * The CI i18n coverage test will fail if any of (1) or (3) is
 * incomplete — that is by design.
 */
export type EmptyStateVariant =
  | 'noConsultations'
  | 'noClinicPatients'
  | 'noSearchResults'
  | 'noNotifications'
  | 'noFeatureFlags'
  | 'noLabelingQueue'
  | 'noViolations'
  | 'noPhotos'
  | 'noAppointments'
  | 'permissionDenied'
  | 'filteredEmpty'
  | 'offlineEmpty';

/**
 * Visual tone of the empty state.
 *
 *   • `neutral`     — default. Activation moments and informational empties.
 *   • `positive`    — celebratory. "You're all caught up" / "Zero violations".
 *                     Renders the icon in an emerald tint to telegraph success
 *                     without an explicit checkmark inside the headline.
 *   • `warning`     — soft alert. "Filtered set is empty" / "Offline".
 *                     Amber tint signals attention without alarm.
 *   • `restrictive` — hard block. Permission denied / locked resources.
 *                     Uses the destructive token so the user immediately
 *                     understands the issue is not a load delay.
 *
 * Tone is part of the descriptor (not a runtime prop) because the same
 * variant always carries the same emotional weight. If a future surface
 * needs to override it — e.g. a celebratory variant in a serious context —
 * the manual `<EmptyState>` API still supports a `tone` prop directly.
 */
export type EmptyStateTone = 'neutral' | 'positive' | 'warning' | 'restrictive';

/**
 * Immutable descriptor for a single empty-state variant.
 *
 * The fields are intentionally kept minimal so that translators see a
 * predictable shape, and so that future tooling (Storybook, visual
 * regression, copy QA dashboards) can introspect the registry without
 * brittle code paths.
 */
export interface EmptyStateDescriptor {
  /**
   * Lucide icon component rendered inside the round tile above the
   * headline. Use stroke-based marks; the tone classes color the
   * icon via `currentColor` so light/dark themes work automatically.
   */
  readonly icon: LucideIcon;

  /**
   * i18n key path for the headline.
   * Resolves under `useTranslations()` — usually keyed as
   * `emptyStates.<variant>.title` in `messages/<locale>/common.json`.
   */
  readonly titleKey: string;

  /**
   * i18n key path for the supporting paragraph (one to two sentences).
   */
  readonly descriptionKey: string;

  /**
   * Optional i18n key path for the primary CTA label. Omit for
   * variants that should not invite an immediate action — e.g.
   * celebratory states like `noViolations` and `noNotifications`.
   */
  readonly actionKey?: string;

  /**
   * Optional default route the CTA navigates to. The consumer may
   * override this via the `actionHref` prop on the component —
   * useful when the destination is dynamic (e.g. a clinic-scoped
   * route that includes a tenant slug).
   */
  readonly actionHref?: string;

  /**
   * Visual tone — see `EmptyStateTone`.
   */
  readonly tone: EmptyStateTone;
}

// ─────────────────────────────────────────────────────────────────
// THE REGISTRY
// ─────────────────────────────────────────────────────────────────
//
// Twelve entries cover the entirety of Datun's current product
// surface plus the highest-confidence near-term routes. Every
// string was researched against 2026 FAANG product copy and
// rewritten for clarity, brevity, and brand voice.
//
// Read each entry top-to-bottom as a tiny editorial unit:
//   icon  → what the user sees first (200 ms)
//   title → why they are here   (1 s)
//   desc  → what they can do    (2 s)
//   CTA   → the next click       (3 s)
//
// If any of these four steps breaks, the variant gets rewritten.
//
// ─────────────────────────────────────────────────────────────────

export const EMPTY_STATE_REGISTRY: Record<EmptyStateVariant, EmptyStateDescriptor> = {
  // ─── Patient activation surfaces ──────────────────────────────

  /**
   * Shown in the consultation history drawer when the user has not
   * yet started a single conversation with the AI dentist. This is
   * the single most important empty state in the product — it is
   * the gateway from sign-up to first activation.
   */
  noConsultations: {
    icon: Sparkles,
    titleKey: 'emptyStates.noConsultations.title',
    descriptionKey: 'emptyStates.noConsultations.description',
    actionKey: 'emptyStates.noConsultations.action',
    actionHref: '/consult/new',
    tone: 'neutral',
  },

  /**
   * Shown on a clinic operator dashboard when the freshly onboarded
   * clinic has zero patients in their roster. Treated as a sales
   * surface — the description doubles as activation copy.
   */
  noClinicPatients: {
    icon: Users,
    titleKey: 'emptyStates.noClinicPatients.title',
    descriptionKey: 'emptyStates.noClinicPatients.description',
    actionKey: 'emptyStates.noClinicPatients.action',
    actionHref: '/clinic/patients/new',
    tone: 'neutral',
  },

  /**
   * Shown on the photo gallery / media library when the patient has
   * not uploaded any dental photos. Renders below the upload affordance.
   */
  noPhotos: {
    icon: Camera,
    titleKey: 'emptyStates.noPhotos.title',
    descriptionKey: 'emptyStates.noPhotos.description',
    actionKey: 'emptyStates.noPhotos.action',
    actionHref: '/photos/upload',
    tone: 'neutral',
  },

  /**
   * Shown on the clinic calendar / booking screen when no appointments
   * are scheduled for the active filter (today, this week, etc.).
   */
  noAppointments: {
    icon: CalendarDays,
    titleKey: 'emptyStates.noAppointments.title',
    descriptionKey: 'emptyStates.noAppointments.description',
    actionKey: 'emptyStates.noAppointments.action',
    actionHref: '/clinic/appointments/new',
    tone: 'neutral',
  },

  // ─── Search & filter empties ──────────────────────────────────

  /**
   * Shown when a search query returns zero hits. Distinct from
   * `filteredEmpty` — search has an explicit user-typed query that
   * the copy can acknowledge.
   */
  noSearchResults: {
    icon: SearchX,
    titleKey: 'emptyStates.noSearchResults.title',
    descriptionKey: 'emptyStates.noSearchResults.description',
    actionKey: 'emptyStates.noSearchResults.action',
    tone: 'warning',
  },

  /**
   * Shown when an active filter combination produces an empty set.
   * The CTA resets the filters rather than the search input.
   */
  filteredEmpty: {
    icon: Filter,
    titleKey: 'emptyStates.filteredEmpty.title',
    descriptionKey: 'emptyStates.filteredEmpty.description',
    actionKey: 'emptyStates.filteredEmpty.action',
    tone: 'warning',
  },

  // ─── Celebratory empties (positive tone) ──────────────────────

  /**
   * Shown when the notifications surface is intentionally empty —
   * the user has handled everything. Celebratory by design.
   */
  noNotifications: {
    icon: BellOff,
    titleKey: 'emptyStates.noNotifications.title',
    descriptionKey: 'emptyStates.noNotifications.description',
    tone: 'positive',
  },

  /**
   * Shown on the admin labeling dashboard when the queue has been
   * cleared for the current strategy. Celebratory — reinforces the
   * habit of completing batches.
   */
  noLabelingQueue: {
    icon: CheckCircle2,
    titleKey: 'emptyStates.noLabelingQueue.title',
    descriptionKey: 'emptyStates.noLabelingQueue.description',
    actionKey: 'emptyStates.noLabelingQueue.action',
    tone: 'positive',
  },

  /**
   * Shown on the security violations table when zero violations
   * have been recorded for the active window. A healthy posture is
   * worth celebrating — it nudges admins to keep CSP enforced.
   */
  noViolations: {
    icon: ShieldCheck,
    titleKey: 'emptyStates.noViolations.title',
    descriptionKey: 'emptyStates.noViolations.description',
    tone: 'positive',
  },

  // ─── Admin / power-user empties ───────────────────────────────

  /**
   * Shown on the admin feature flags page when no flag has been
   * defined yet. Doubles as a primer on what flags unlock.
   */
  noFeatureFlags: {
    icon: Flag,
    titleKey: 'emptyStates.noFeatureFlags.title',
    descriptionKey: 'emptyStates.noFeatureFlags.description',
    actionKey: 'emptyStates.noFeatureFlags.action',
    actionHref: '/admin/flags/new',
    tone: 'neutral',
  },

  // ─── Restrictive empties (hard blocks) ────────────────────────

  /**
   * Shown when an authenticated user lands on a route their role
   * is not permitted to view. Distinct from "logged out" — that
   * scenario should redirect, not render an empty state.
   */
  permissionDenied: {
    icon: Lock,
    titleKey: 'emptyStates.permissionDenied.title',
    descriptionKey: 'emptyStates.permissionDenied.description',
    actionKey: 'emptyStates.permissionDenied.action',
    actionHref: 'mailto:dr.mayankvats09@gmail.com',
    tone: 'restrictive',
  },

  // ─── Network-state empties ────────────────────────────────────

  /**
   * Shown when the surface needs data but the device is offline
   * AND the relevant cache is empty. If the cache has stale data,
   * prefer `<OfflineState>` over this variant so the user sees the
   * cached content first.
   */
  offlineEmpty: {
    icon: WifiOff,
    titleKey: 'emptyStates.offlineEmpty.title',
    descriptionKey: 'emptyStates.offlineEmpty.description',
    actionKey: 'emptyStates.offlineEmpty.action',
    tone: 'warning',
  },
} as const;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve a descriptor by variant key.
 *
 * Throws an explicit, debuggable error when called with an unknown
 * variant. The error message points at the file the caller has to
 * edit — this saves real time during onboarding of new engineers.
 *
 * @param variant — one of the keys defined in `EmptyStateVariant`.
 * @returns the immutable descriptor for that variant.
 *
 * @example
 *   const descriptor = getEmptyStateDescriptor('noConsultations');
 *   console.log(descriptor.titleKey); // 'emptyStates.noConsultations.title'
 */
export function getEmptyStateDescriptor(variant: EmptyStateVariant): EmptyStateDescriptor {
  const descriptor = EMPTY_STATE_REGISTRY[variant];

  if (!descriptor) {
    // Unreachable under TypeScript, but defensive against runtime
    // string variants (e.g. config-driven flags, A/B routes).
    throw new Error(
      `[empty-state-registry] Unknown variant "${variant}". ` +
        `Add it to EMPTY_STATE_REGISTRY in ` +
        `apps/web/components/feedback/empty-state-registry.ts ` +
        `and ensure the corresponding i18n keys exist under ` +
        `emptyStates.${variant} in every locale file.`,
    );
  }

  return descriptor;
}

/**
 * Runtime type guard for `EmptyStateVariant`.
 *
 * Useful when reading variants from untyped sources — URL params,
 * feature flag payloads, analytics events, server-driven UI.
 *
 * @example
 *   const raw = searchParams.get('emptyVariant');
 *   if (isEmptyStateVariant(raw)) {
 *     return <EmptyState variant={raw} />;
 *   }
 */
export function isEmptyStateVariant(value: unknown): value is EmptyStateVariant {
  return typeof value === 'string' && value in EMPTY_STATE_REGISTRY;
}

/**
 * The full ordered list of variants — handy for tests, Storybook
 * stories, and visual regression sweeps.
 *
 * The order is intentional: activation surfaces first, then search,
 * then celebratory, then admin, then restrictive, then network.
 * Keep this ordering aligned with the registry above when adding
 * new variants.
 */
export const ALL_EMPTY_STATE_VARIANTS: ReadonlyArray<EmptyStateVariant> = [
  'noConsultations',
  'noClinicPatients',
  'noPhotos',
  'noAppointments',
  'noSearchResults',
  'filteredEmpty',
  'noNotifications',
  'noLabelingQueue',
  'noViolations',
  'noFeatureFlags',
  'permissionDenied',
  'offlineEmpty',
] as const;
