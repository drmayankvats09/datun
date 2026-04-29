// ═══════════════════════════════════════════════════════════════
// AUTH SCHEMAS — Request + Response for all auth endpoints
// Export names MATCH existing schemas.ts for backwards compat.
//
// NEW: Response schemas — guarantee API output shape.
//      userResponseSchema EXCLUDES passwordHash — leak impossible.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import {
  emailField,
  passwordField,
  loginPasswordField,
  phoneField,
  nameField,
  otpField,
} from '../primitives/index';

// ── Request Schemas (existing names preserved) ──

export const signupEmailSchema = z.object({
  email: emailField,
  password: passwordField,
  name: nameField,
  phone: phoneField.optional(),
});

export const loginEmailSchema = z.object({
  email: emailField,
  password: loginPasswordField,
});

export const sendOtpSchema = z.object({
  destination: z.string().min(1, 'Email or phone required'),
  channel: z.enum(['email', 'phone']),
});

export const verifyOtpSchema = z.object({
  destination: z.string().min(1, 'Email or phone required'),
  channel: z.enum(['email', 'phone']),
  code: otpField,
  name: nameField.optional(),
});

export const googleAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  redirectUri: z.string().url('Valid redirect URI required'),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  email: emailField,
  otp: otpField,
  newPassword: passwordField,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// ── Response Schemas (NEW — prevents passwordHash leak) ──

/** User data returned to frontend — NEVER includes sensitive fields */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.string(),
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
});

/** Token pair returned on login/signup */
export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

/** Full auth result — user + tokens + isNewUser flag */
export const authResultSchema = z.object({
  user: userResponseSchema,
  tokens: tokenPairSchema,
  isNewUser: z.boolean(),
});

/** OTP send response */
export const otpSendResponseSchema = z.object({
  maskedDestination: z.string(),
  expiresInSeconds: z.number(),
  retryAfterSeconds: z.number(),
});

// ── Type Exports ──

export type SignupRequest = z.infer<typeof signupEmailSchema>;
export type LoginRequest = z.infer<typeof loginEmailSchema>;
export type SendOtpRequest = z.infer<typeof sendOtpSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;
export type GoogleAuthRequest = z.infer<typeof googleAuthSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;

export type AuthUser = z.infer<typeof userResponseSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
export type OtpSendResponse = z.infer<typeof otpSendResponseSchema>;
