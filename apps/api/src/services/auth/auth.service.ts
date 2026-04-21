// ═══════════════════════════════════════════════════════════════
// AUTH SERVICE — Main orchestrator for all auth flows
// Ties together: Password, JWT, OTP, Google OAuth, Prisma DB.
// Pattern: Single-responsibility service, Stripe Auth, Clerk backend.
// ═══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import { prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/index.js';
import { PasswordService } from './password.service.js';
import { JwtService } from './jwt.service.js';
import { OtpService } from './otp.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import type {
  AuthResponse,
  SignupWithEmailDTO,
  LoginWithEmailDTO,
  SendOtpDTO,
  VerifyOtpDTO,
  GoogleAuthDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshTokenDTO,
  OtpSendResponse,
  StoredResetToken,
  AuthTokens,
} from './types.js';

// ── In-memory reset token store (Redis later via Task #29) ──
const resetTokenStore = new Map<string, StoredResetToken>();

setInterval(() => {
  const now = new Date();
  for (const [key, token] of resetTokenStore) {
    if (token.expiresAt < now || token.used) resetTokenStore.delete(key);
  }
}, 900_000);

export class AuthService {
  // ═══════════════════════════════════════════════════════════
  // 1. EMAIL + PASSWORD SIGNUP
  // ═══════════════════════════════════════════════════════════

  static async signupWithEmail(dto: SignupWithEmailDTO): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    if (dto.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictError('An account with this phone number already exists');
      }
    }

    const passwordHash = await PasswordService.hash(dto.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          name: dto.name.trim(),
          phone: dto.phone || null,
          passwordHash,
          primaryRole: 'PATIENT',
          isEmailVerified: false,
          lastLoginAt: new Date(),
        },
      });

      await tx.patient.create({
        data: { userId: newUser.id },
      });

      await tx.userAuthIdentity.create({
        data: {
          userId: newUser.id,
          provider: 'EMAIL',
          providerUserId: newUser.id,
          emailAtProvider: newUser.email,
          isPrimary: true,
          lastUsedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          role: 'PATIENT',
        },
      });

      return newUser;
    });

    const tokens = JwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.primaryRole,
    });

    logger.info('User signed up with email', { userId: user.id, email: user.email });

    OtpService.send(user.email, 'email').catch((err) => {
      logger.error('Failed to send verification OTP after signup', {
        userId: user.id,
        error: (err as Error).message,
      });
    });

    return AuthService.buildAuthResponse(user, tokens, true);
  }

  // ═══════════════════════════════════════════════════════════
  // 2. EMAIL + PASSWORD LOGIN
  // ═══════════════════════════════════════════════════════════

  static async loginWithEmail(dto: LoginWithEmailDTO): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash) {
      await PasswordService.compare(dto.password, '$2a$12$dummyhashfortimingattak');
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    const isValid = await PasswordService.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = JwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.primaryRole,
    });

    logger.info('User logged in with email', { userId: user.id });

    return AuthService.buildAuthResponse(user, tokens, false);
  }

  // ═══════════════════════════════════════════════════════════
  // 3. OTP — SEND
  // ═══════════════════════════════════════════════════════════

  static async sendOtp(dto: SendOtpDTO): Promise<OtpSendResponse> {
    return OtpService.send(dto.destination, dto.channel);
  }

  // ═══════════════════════════════════════════════════════════
  // 4. OTP — VERIFY (login OR signup)
  // ═══════════════════════════════════════════════════════════

  static async verifyOtp(dto: VerifyOtpDTO): Promise<AuthResponse> {
    const isValid = await OtpService.verify(dto.destination, dto.channel, dto.code);
    if (!isValid) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    const isEmail = dto.channel === 'email';
    const whereClause = isEmail
      ? { email: dto.destination.toLowerCase().trim() }
      : { phone: dto.destination };

    let user = await prisma.user.findUnique({ where: whereClause });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const name = dto.name || (isEmail ? dto.destination.split('@')[0] || 'User' : 'User');

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: isEmail
              ? dto.destination.toLowerCase().trim()
              : `${dto.destination}@phone.datunai.com`,
            phone: !isEmail ? dto.destination : null,
            name,
            primaryRole: 'PATIENT',
            isEmailVerified: isEmail,
            isPhoneVerified: !isEmail,
            lastLoginAt: new Date(),
          },
        });

        await tx.patient.create({ data: { userId: newUser.id } });

        await tx.userAuthIdentity.create({
          data: {
            userId: newUser.id,
            provider: isEmail ? 'EMAIL' : 'PHONE',
            providerUserId: newUser.id,
            emailAtProvider: isEmail ? dto.destination : null,
            phoneAtProvider: !isEmail ? dto.destination : null,
            isPrimary: true,
            lastUsedAt: new Date(),
          },
        });

        await tx.userRole.create({
          data: { userId: newUser.id, role: 'PATIENT' },
        });

        return newUser;
      });
    } else {
      const updateData: Record<string, unknown> = { lastLoginAt: new Date() };
      if (isEmail) updateData.isEmailVerified = true;
      else updateData.isPhoneVerified = true;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    const tokens = JwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.primaryRole,
    });

    logger.info('User authenticated via OTP', {
      userId: user.id,
      channel: dto.channel,
      isNewUser,
    });

    return AuthService.buildAuthResponse(user, tokens, isNewUser);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. GOOGLE OAUTH
  // ═══════════════════════════════════════════════════════════

  static async loginWithGoogle(dto: GoogleAuthDTO): Promise<AuthResponse> {
    const googleUser = await GoogleOAuthService.exchangeCodeForUser(dto.code, dto.redirectUri);

    const existingIdentity = await prisma.userAuthIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'GOOGLE',
          providerUserId: googleUser.id,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      const user = await prisma.user.update({
        where: { id: existingIdentity.user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: existingIdentity.user.avatarUrl || googleUser.picture,
        },
      });

      await prisma.userAuthIdentity.update({
        where: { id: existingIdentity.id },
        data: { lastUsedAt: new Date() },
      });

      const tokens = JwtService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.primaryRole,
      });

      logger.info('User logged in with Google', { userId: user.id });
      return AuthService.buildAuthResponse(user, tokens, false);
    }

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
    });

    let isNewUser = false;

    if (user) {
      await prisma.userAuthIdentity.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerUserId: googleUser.id,
          emailAtProvider: googleUser.email,
          isPrimary: false,
          lastUsedAt: new Date(),
        },
      });

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          isEmailVerified: true,
          avatarUrl: user.avatarUrl || googleUser.picture,
        },
      });
    } else {
      isNewUser = true;

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: googleUser.email.toLowerCase(),
            name: googleUser.name,
            avatarUrl: googleUser.picture,
            primaryRole: 'PATIENT',
            isEmailVerified: true,
            lastLoginAt: new Date(),
          },
        });

        await tx.patient.create({ data: { userId: newUser.id } });

        await tx.userAuthIdentity.create({
          data: {
            userId: newUser.id,
            provider: 'GOOGLE',
            providerUserId: googleUser.id,
            emailAtProvider: googleUser.email,
            isPrimary: true,
            lastUsedAt: new Date(),
          },
        });

        await tx.userRole.create({
          data: { userId: newUser.id, role: 'PATIENT' },
        });

        return newUser;
      });
    }

    const tokens = JwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.primaryRole,
    });

    logger.info('User authenticated via Google', { userId: user.id, isNewUser });
    return AuthService.buildAuthResponse(user, tokens, isNewUser);
  }

  // ═══════════════════════════════════════════════════════════
  // 6. FORGOT PASSWORD
  // ═══════════════════════════════════════════════════════════

  static async forgotPassword(dto: ForgotPasswordDTO): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      logger.info('Forgot password for non-existent email', { email: dto.email });
      return;
    }

    await OtpService.send(user.email, 'email');
    logger.info('Password reset OTP sent', { userId: user.id });
  }

  // ═══════════════════════════════════════════════════════════
  // 7. RESET PASSWORD
  // ═══════════════════════════════════════════════════════════

  static async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const isValid = await OtpService.verify(email, 'email', otp);
    if (!isValid) {
      throw new AuthenticationError('Invalid or expired reset code');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundError('User', email);
    }

    const passwordHash = await PasswordService.hash(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        lastLoginAt: new Date(),
      },
    });

    const tokens = JwtService.generateTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.primaryRole,
    });

    logger.info('Password reset successful', { userId: user.id });
    return AuthService.buildAuthResponse(updatedUser, tokens, false);
  }

  // ═══════════════════════════════════════════════════════════
  // 8. REFRESH TOKEN
  // ═══════════════════════════════════════════════════════════

  static async refreshToken(dto: RefreshTokenDTO): Promise<AuthTokens> {
    const decoded = JwtService.verifyRefreshToken(dto.refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid refresh token');
    }

    return JwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.primaryRole,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 9. GET CURRENT USER
  // ═══════════════════════════════════════════════════════════

  static async getCurrentUser(userId: string): Promise<AuthResponse['user']> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.primaryRole,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 10. GOOGLE CONSENT URL
  // ═══════════════════════════════════════════════════════════

  static getGoogleConsentUrl(redirectUri: string): string {
    return GoogleOAuthService.getConsentUrl(redirectUri);
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Build consistent auth response
  // ═══════════════════════════════════════════════════════════

  private static buildAuthResponse(
    user: {
      id: string;
      email: string;
      name: string;
      phone: string | null;
      avatarUrl: string | null;
      primaryRole: string;
      isEmailVerified: boolean;
      isPhoneVerified: boolean;
    },
    tokens: AuthTokens,
    isNewUser: boolean,
  ): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.primaryRole as AuthResponse['user']['role'],
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      tokens,
      isNewUser,
    };
  }
}
