// ═══════════════════════════════════════════════════════════════
// AUTH TYPES — Complete type system for Datun's own auth
// No Auth0. No 3rd-party redirect. 100% own system.
// Pattern: Google Identity Platform, Clerk, Supabase Auth.
// ═══════════════════════════════════════════════════════════════

import type { UserPrimaryRole } from '@repo/db';

// ── JWT Payload ──

export interface DecodedToken {
  /** User UUID from our database */
  sub: string;
  /** User email */
  email: string;
  /** User's primary role */
  role: UserPrimaryRole;
  /** Token type: 'access' or 'refresh' */
  type: 'access' | 'refresh';
  /** Issued at (Unix timestamp) */
  iat: number;
  /** Expiry (Unix timestamp) */
  exp: number;
  /** Issuer — always 'datun' */
  iss: string;
}

// ── Auth Method Types ──

export type AuthMethod = 'email' | 'phone' | 'google' | 'apple';

// ── Request DTOs ──

export interface SignupWithEmailDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginWithEmailDTO {
  email: string;
  password: string;
}

export interface SendOtpDTO {
  /** Email or phone number */
  destination: string;
  /** 'email' or 'phone' */
  channel: 'email' | 'phone';
}

export interface VerifyOtpDTO {
  destination: string;
  channel: 'email' | 'phone';
  code: string;
  /** If verifying for signup, include name */
  name?: string;
}

export interface GoogleAuthDTO {
  /** Authorization code from Google OAuth popup */
  code: string;
  /** Redirect URI used in the OAuth flow */
  redirectUri: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

// ── Response DTOs ──

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    role: UserPrimaryRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface OtpSendResponse {
  success: boolean;
  /** Masked destination for UI (e.g., "d***@gmail.com" or "****5340") */
  maskedDestination: string;
  /** Seconds until OTP expires */
  expiresInSeconds: number;
  /** Seconds until user can request another OTP */
  retryAfterSeconds: number;
}

// ── OTP Storage (in-memory, Redis later) ──

export interface StoredOtp {
  /** bcrypt hash of the 6-digit OTP */
  hash: string;
  /** Destination (email or phone) */
  destination: string;
  /** Channel used */
  channel: 'email' | 'phone';
  /** When OTP expires */
  expiresAt: Date;
  /** Number of verification attempts */
  attempts: number;
  /** Max allowed attempts */
  maxAttempts: number;
  /** When created */
  createdAt: Date;
}

// ── Password Reset Token ──

export interface StoredResetToken {
  /** bcrypt hash of the reset token */
  hash: string;
  /** User ID */
  userId: string;
  /** When token expires */
  expiresAt: Date;
  /** Whether token has been used */
  used: boolean;
}
