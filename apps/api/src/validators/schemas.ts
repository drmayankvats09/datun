// ═══════════════════════════════════════════════════════════════
// ZOD VALIDATORS — Request body schemas for every endpoint
// validate(schema) middleware auto-strips unknown fields.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

export const chatMessageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.union([z.string(), z.array(z.unknown())]),
      }),
    )
    .min(1),
  language: z.string().max(10).default('en'),
  patientName: z.string().max(100).optional(),
  patientAge: z.string().max(5).optional(),
  patientGender: z.string().max(30).optional(),
  sessionId: z.string().max(100).optional(),
});

export const authUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
  picture: z.string().url().optional(),
  preferred_language: z.string().max(10).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  languagePreference: z.string().max(10).optional(),
});

export const consultationStartSchema = z.object({
  clientUuid: z.string().min(1).max(64),
  language: z.string().max(10).default('en'),
});

export const consultationMessageSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  language: z.string().max(10).optional(),
});
