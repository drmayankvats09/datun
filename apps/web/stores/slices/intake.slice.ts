// ═══════════════════════════════════════════════════════════════
// INTAKE SLICE — Patient intake form draft state
//
// This slice owns:
//   - `intakeDraft` (form fields: name, age, gender, language)
//   - `language` (top-level — duplicates intakeDraft.language by design)
//   - `updateIntakeDraft` (partial-merge updates)
//   - `setLanguage` (atomic language update — syncs both fields)
//   - `clearDraft` (reset to empty — used internally by clearConsultation)
//
// Why `language` exists in TWO places:
//   - `intakeDraft.language` is the form-input bound value (controlled
//     <select>); it has to live inside `intakeDraft` so the form
//     submit-handler sees the latest choice without prop-drilling.
//   - The top-level `language` is the "active consultation language" —
//     it persists across `clearDraft()` calls so a returning patient
//     keeps their language preference even after submitting one
//     consultation and starting another.
//   The interlock is enforced by `setLanguage` which writes BOTH —
//   never set them independently in components.
//
// ⚠ PII WARNING:
//   `intakeDraft` contains patient identifiers (name, age, gender).
//   In Phase 1's plain-localStorage setup, this is at-rest in clear
//   text. The Phase 2 consultation.store.ts wires `intakeDraft` through
//   `createEncryptedStorage` + `createTTLStorage` to address DPDP
//   data-at-rest requirements + 24h auto-expiry.
// ═══════════════════════════════════════════════════════════════

import type { StateCreator } from 'zustand';
import type { IntakeFormDraft } from '../types';
import type { ConsultationStore } from '../consultation.store';

/**
 * Default empty intake draft — referenced on initial state and on every
 * `clearDraft()` call. Defaulting `language` to 'en' (not '') ensures
 * the form-select component always has a valid value to bind to.
 */
const EMPTY_DRAFT: IntakeFormDraft = {
  name: '',
  age: '',
  gender: '',
  language: 'en',
};

/**
 * The portion of `ConsultationStore` owned by this slice.
 */
export interface IntakeSlice {
  /**
   * Patient intake form draft (PII — name, age, gender, language).
   * Persisted with encryption + 24h TTL in production.
   */
  intakeDraft: IntakeFormDraft;

  /**
   * Active consultation language code (BCP-47 short codes: 'en', 'hi',
   * 'ta', 'mr', 'gu', etc.). Persists across consultations so a returning
   * patient doesn't need to re-pick their language each time.
   */
  language: string;

  /**
   * Partial-merge update to the intake draft. Use this from controlled
   * form fields:
   * ```tsx
   * <input onChange={(e) => updateIntakeDraft({ name: e.target.value })} />
   * ```
   *
   * Side effect: sets `hasUnsavedChanges` to `true`.
   */
  updateIntakeDraft: (partial: Partial<IntakeFormDraft>) => void;

  /**
   * Atomically update the active language. Writes to BOTH `language` and
   * `intakeDraft.language` to keep them in lockstep — never set them
   * separately. Side effect: sets `hasUnsavedChanges` to `true`.
   */
  setLanguage: (language: string) => void;

  /**
   * Reset the intake draft to empty (preserving the active `language`).
   * Used internally by `clearConsultation` in the core slice.
   *
   * Why preserve `language`: a patient who submitted one consultation in
   * Hindi shouldn't have to re-pick Hindi for their next one. Pattern
   * matches WhatsApp / Google Translate (last language sticky).
   */
  clearDraft: () => void;
}

/**
 * Create the intake slice.
 *
 * @see Phase 2 `consultation.store.ts` for how this composes with other
 *      slices behind the encrypted + TTL storage stack.
 */
export const createIntakeSlice: StateCreator<
  ConsultationStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  IntakeSlice
> = (set) => ({
  // Spread to avoid the shared-reference footgun: mutating one consultation's
  // intake should never affect another consultation's defaults.
  intakeDraft: { ...EMPTY_DRAFT },
  language: 'en',

  updateIntakeDraft: (partial) =>
    set(
      (state) => ({
        intakeDraft: { ...state.intakeDraft, ...partial },
        hasUnsavedChanges: true,
      }),
      false,
      'intake/updateDraft',
    ),

  setLanguage: (language) =>
    set(
      (state) => ({
        language,
        intakeDraft: { ...state.intakeDraft, language },
        hasUnsavedChanges: true,
      }),
      false,
      'intake/setLanguage',
    ),

  clearDraft: () =>
    set(
      (state) => ({
        // Preserve current active language across the wipe.
        intakeDraft: { ...EMPTY_DRAFT, language: state.language },
      }),
      false,
      'intake/clearDraft',
    ),
});
