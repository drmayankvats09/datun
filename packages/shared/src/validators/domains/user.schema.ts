// ═══════════════════════════════════════════════════════════════
// USER SCHEMAS — Profile, settings, medical history
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { nameField, optionalLocaleField } from '../primitives/index';
import { genderSchema } from '../prisma-enums';

// ── Existing schema (name preserved) ──

export const authUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
  picture: z.string().url().optional(),
  preferred_language: z.string().max(10).optional(),
});

export const profileUpdateSchema = z.object({
  name: nameField.optional(),
  dateOfBirth: z.string().optional(),
  gender: genderSchema.optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  languagePreference: optionalLocaleField,
});

// ── Medical History (Task #65 — future, structure ready) ──

export const medicalHistorySchema = z.object({
  allergies: z.array(z.string().max(100)).max(20).optional(),
  chronicConditions: z.array(z.string().max(100)).max(10).optional(),
  currentMedications: z.array(z.string().max(200)).max(20).optional(),
  smokingStatus: z.enum(['NEVER', 'FORMER', 'CURRENT']).optional(),
  pregnancyStatus: z
    .enum(['NOT_PREGNANT', 'PREGNANT', 'BREASTFEEDING', 'NOT_APPLICABLE'])
    .optional(),
});

// ── Type Exports ──

export type AuthUserUpdate = z.infer<typeof authUserSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type MedicalHistory = z.infer<typeof medicalHistorySchema>;
