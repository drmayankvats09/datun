// packages/shared/src/types/clinic.ts
// ═══════════════════════════════════════════════════════════════
// CLINIC DTO TYPES — Task #47 Phase 1
//
// Partner clinics directory + dashboard surface area.
//
// Used by:
//   - Task #57 — "Book Dentist Near Me" CTA on the assessment card
//   - Task #59 — Clinic owner dashboard (paying B2B users)
//   - Future: Patient-facing clinic discovery page
//
// Pricing tiers align with the documented business model:
//   FREE        — listed in directory, no dashboard, no analytics
//   PRO         — ₹2,000/month, dashboard + leads + WhatsApp inbox
//   ENTERPRISE  — multi-location chains (post-PMF, custom pricing)
// ═══════════════════════════════════════════════════════════════

// ─── Enums ─────────────────────────────────────────────────

export type ClinicVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type ClinicSubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

// ─── Sub-objects ───────────────────────────────────────────

export interface ClinicHoursDTO {
  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday. */
  readonly day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** "HH:mm" 24-hour. Null when closed. */
  readonly open: string | null;
  /** "HH:mm" 24-hour. Null when closed. */
  readonly close: string | null;
}

export interface ClinicLocationDTO {
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly pincode: string;
  /** WGS-84 latitude. Null when geocoding pending. */
  readonly lat: number | null;
  /** WGS-84 longitude. Null when geocoding pending. */
  readonly lng: number | null;
}

export interface ClinicServiceDTO {
  readonly name: string;
  /** Price in INR (paise). Null when "consult for price". */
  readonly priceMin: number | null;
  readonly priceMax: number | null;
}

// ─── List item (lightweight) ───────────────────────────────

export interface ClinicListItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly tagline: string | null;
  readonly photoUrl: string | null;
  readonly location: ClinicLocationDTO;
  /** 0–5 stars (one decimal). Null when no reviews yet. */
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly specialties: readonly string[];
  readonly verificationStatus: ClinicVerificationStatus;
  /**
   * Distance from the user's location in km (one decimal).
   * Populated only when the query includes a `nearby` filter,
   * else null.
   */
  readonly distanceKm: number | null;
}

// ─── Detail (full view) ────────────────────────────────────

export interface ClinicDetail extends ClinicListItem {
  readonly description: string | null;
  readonly hours: readonly ClinicHoursDTO[];
  readonly phone: string;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly services: readonly ClinicServiceDTO[];
  readonly subscription: ClinicSubscriptionTier;
}

// ─── Filters ───────────────────────────────────────────────

export interface ClinicNearbyFilter {
  /** WGS-84 latitude. */
  readonly lat: number;
  /** WGS-84 longitude. */
  readonly lng: number;
  /** Search radius in kilometres. Default 5 km on the server side. */
  readonly radiusKm: number;
}

export interface ClinicFilters {
  readonly city?: string;
  readonly specialty?: string;
  readonly verified?: boolean;
  readonly nearby?: ClinicNearbyFilter;
  readonly page?: number;
  readonly pageSize?: number;
}
