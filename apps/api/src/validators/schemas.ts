// ═══════════════════════════════════════════════════════════════
// ZOD VALIDATORS — Request body schemas for every endpoint
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

// ── Auth Schemas ──

export const signupEmailSchema = z.object({
  email: z.string().email('Valid email required').max(254),
  password: z.string().min(8, 'Minimum 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(200).trim(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Valid phone number required')
    .optional(),
});

export const loginEmailSchema = z.object({
  email: z.string().email('Valid email required').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

export const sendOtpSchema = z.object({
  destination: z.string().min(1, 'Email or phone required'),
  channel: z.enum(['email', 'phone']),
});

export const verifyOtpSchema = z.object({
  destination: z.string().min(1, 'Email or phone required'),
  channel: z.enum(['email', 'phone']),
  code: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
  name: z.string().max(200).trim().optional(),
});

export const googleAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  redirectUri: z.string().url('Valid redirect URI required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email required').max(254),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Valid email required').max(254),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
  newPassword: z.string().min(8, 'Minimum 8 characters').max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// ── Existing Schemas ──

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
  dateOfBirth: z.string().optional(),
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
