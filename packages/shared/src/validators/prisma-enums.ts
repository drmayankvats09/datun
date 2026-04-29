// ═══════════════════════════════════════════════════════════════
// PRISMA ENUM MIRRORS — Zod versions of Prisma enums
// These MUST match packages/db/prisma/schema.prisma exactly.
// Drift detection test verifies sync (Session 3).
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);
export type Gender = z.infer<typeof genderSchema>;

export const userRoleSchema = z.enum([
  'PATIENT',
  'CLINIC_OWNER',
  'CLINIC_STAFF',
  'DOCTOR',
  'ADMIN',
  'SUPER_ADMIN',
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const authProviderSchema = z.enum([
  'EMAIL',
  'GOOGLE',
  'PHONE',
  'AUTH0',
  'APPLE',
  'MAGIC_LINK',
]);
export type AuthProvider = z.infer<typeof authProviderSchema>;

export const consultationStatusSchema = z.enum([
  'IN_PROGRESS',
  'COMPLETED',
  'ABANDONED',
  'EXPIRED',
]);
export type ConsultationStatus = z.infer<typeof consultationStatusSchema>;

export const urgencyLevelSchema = z.enum(['EMERGENCY', 'URGENT', 'MODERATE', 'ROUTINE']);
export type UrgencyLevel = z.infer<typeof urgencyLevelSchema>;

export const messageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageContentTypeSchema = z.enum(['TEXT', 'IMAGE', 'CHIPS', 'SYSTEM_EVENT']);
export type MessageContentType = z.infer<typeof messageContentTypeSchema>;

export const subscriptionTierSchema = z.enum(['FREE', 'PRO']);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
