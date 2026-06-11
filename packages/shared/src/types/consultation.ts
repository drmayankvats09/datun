// packages/shared/src/types/consultation.ts
// ═══════════════════════════════════════════════════════════════
// CONSULTATION DTO TYPES — Task #47 Phase 1 (HOTFIX 1)
//
// Exchanged between API ↔ web/mobile clients.
//
// IMPORTANT: These are DTOs, not Prisma model types.
// The backend MUST map Prisma rows into these shapes before sending.
// The frontend MUST NEVER import from `@repo/db`.
//
// HOTFIX (Task #47 Phase 1 — first verification pass):
//   The canonical `ConsultationStatus` enum lives in
//   `../validators/prisma-enums.ts` (mirrors the Prisma schema:
//   IN_PROGRESS / COMPLETED / ABANDONED / EXPIRED). We import the
//   type from there and use it internally — we do NOT re-export it
//   to avoid the TS2308 duplicate-export collision in the shared
//   barrel.
//
// Pagination convention (NEW for v2):
//   The standard envelope is `{ success: true, data: T }`.
//   For paginated endpoints we set `T = PaginatedData<Item>` so that:
//     - `authFetch` continues to return `body.data` unchanged
//     - hooks read `.items` and `.pagination` directly
//     - no separate `paginatedFetch` branch is needed
//
//   The existing top-level `PaginatedResponse<T>` interface in
//   envelope.schema.ts is preserved but unused — kept for backwards
//   compat only. New code uses `ApiSuccessResponse<PaginatedData<T>>`.
// ═══════════════════════════════════════════════════════════════

import type { PaginationMeta } from '../validators/responses/envelope.schema';
// Canonical Prisma enum — single source of truth for status values.
import type { ConsultationStatus } from '../validators/prisma-enums';

// ─── Enums (kept aligned with Prisma but redeclared as string-literal unions) ───
//
// Why redeclared instead of `import type { ConsultationStatus } from '@prisma/client'`:
//   - Prevents accidental Prisma import in frontend bundles
//   - Decouples FE deploy cadence from DB migrations
//   - Lints catch any drift via the API's response schema validation
//
// `ConsultationStatus` is NOT redeclared here — see hotfix note at the top.
// Consumers TYPE-import it from '@repo/shared' (the root barrel exposes the
// validators tree via `export type *` since Task #53.5 W2). The rare VALUE
// use (server-side enum object) imports from '@repo/shared/validators' —
// prisma-enums is zod-built, so value access must never enter client code.

export type ConsultationUrgency = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export type ConsultationLanguage =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa';

// ─── Chat message ──────────────────────────────────────────

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessageDTO {
  readonly id: string;
  readonly role: ChatMessageRole;
  readonly content: string;
  /** Unix epoch milliseconds. */
  readonly timestamp: number;
  /** Optional media asset IDs attached to this message. */
  readonly mediaAssetIds?: readonly string[];
}

// ─── Assessment ────────────────────────────────────────────

export interface ConsultationAssessmentDTO {
  readonly diagnosis: string;
  readonly urgency: ConsultationUrgency;
  /** 0–1 confidence as reported by the model. */
  readonly confidence: number;
  readonly chiefComplaint: string;
  readonly location: string | null;
  readonly painScale: number | null;
  readonly homeRemedies: readonly string[];
  readonly treatmentPlan: readonly string[];
  readonly xrayRecommendation: string | null;
  readonly redFlags: readonly string[];
}

// ─── List item (lightweight, for table rows) ───────────────

export interface ConsultationListItem {
  readonly id: string;
  readonly status: ConsultationStatus;
  readonly chiefComplaint: string | null;
  readonly diagnosis: string | null;
  readonly urgency: ConsultationUrgency | null;
  readonly language: ConsultationLanguage;
  /** ISO-8601 timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp. */
  readonly updatedAt: string;
  readonly hasPdf: boolean;
}

// ─── Detail (full view) ────────────────────────────────────

export interface ConsultationIntakeDTO {
  readonly name: string;
  readonly age: number | null;
  readonly gender: string | null;
  readonly allergies: string | null;
  readonly medicalConditions: string | null;
}

export interface ConsultationDetail extends ConsultationListItem {
  readonly messages: readonly ChatMessageDTO[];
  readonly assessment: ConsultationAssessmentDTO | null;
  readonly intake: ConsultationIntakeDTO;
}

// ─── Filters & paginated response ──────────────────────────

export interface ConsultationFilters {
  readonly status?: ConsultationStatus | 'ALL';
  readonly urgency?: ConsultationUrgency | 'ALL';
  /** ISO-8601 date (YYYY-MM-DD). */
  readonly fromDate?: string;
  /** ISO-8601 date (YYYY-MM-DD). */
  readonly toDate?: string;
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

/**
 * Standard paginated payload (lives INSIDE the envelope `data` field).
 *
 *   Envelope:  { success: true, data: PaginatedData<T> }
 *   Hook reads: query.data.items   and   query.data.pagination
 */
export interface PaginatedData<T> {
  readonly items: readonly T[];
  readonly pagination: PaginationMeta;
}

// ─── Mutation inputs / outputs ─────────────────────────────

export interface StartConsultationInput {
  readonly language: ConsultationLanguage;
  readonly intake: {
    readonly name: string;
    readonly age: number;
    readonly gender: string;
  };
}

export interface SendMessageInput {
  readonly content: string;
  readonly mediaAssetIds?: readonly string[];
  /**
   * Client-generated UUID. Used for:
   *   - Optimistic updates (replace temp message when server confirms)
   *   - Idempotent dedup if the user double-taps Send on a flaky network
   */
  readonly clientMessageId: string;
}

export interface SendMessageResponse {
  readonly messageId: string;
  readonly clientMessageId: string;
  readonly assistantMessage: ChatMessageDTO | null;
}

export interface CompleteConsultationResponse {
  readonly id: string;
  readonly assessment: ConsultationAssessmentDTO;
  readonly pdfReady: boolean;
}
