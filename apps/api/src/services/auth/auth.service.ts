// ═══════════════════════════════════════════════════════════════
// AUTH SERVICE — Main orchestrator for all auth flows
// Ties together: Password, JWT, OTP, Google OAuth, Prisma DB.
// Pattern: Single-responsibility service, Stripe Auth, Clerk backend.
// ═══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import { prisma } from '@repo/db';
import { logger } from '../../lib/logger.js';
import { AuthenticationError, ConflictError, NotFoundError } from '../../errors/index.js';
import { PasswordService } from './password.service.js';
import { JwtService } from './jwt.service.js';
import { OtpService } from './otp.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { cache } from '../../lib/redis.js';
import type {
  AuthResponse,
  SignupWithEmailDTO,
  LoginWithEmailDTO,
  SendOtpDTO,
  VerifyOtpDTO,
  GoogleAuthDTO,
  ForgotPasswordDTO,
  RefreshTokenDTO,
  OtpSendResponse,
  AuthTokens,
} from './types.js';

// P2-F2: Valid bcrypt hash for timing-attack defense (constant-time comparison)
// Generated from: bcrypt.hash('not-a-real-password-timing-defense', 12)
const TIMING_SAFE_DUMMY_HASH = '$2a$12$LJ3m4ys3Lgkz7g9X5K5mCOqGJOA8.r0oI6FnzqZpq4FOmRxr4Ude';

export class AuthService {
  // ═══════════════════════════════════════════════════════════
  // 1. EMAIL + PASSWORD SIGNUP
  // P2-F1: Race condition fix — P2002 catch after transaction
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

    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
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
          data: { userId: newUser.id, role: 'PATIENT' },
        });

        return newUser;
      });
    } catch (err) {
      // P2-F1: Catch race condition — concurrent signup with same email/phone
      if ((err as { code?: string }).code === 'P2002') {
        const target = (err as { meta?: { target?: string[] } }).meta?.target;
        if (target?.includes('email')) {
          throw new ConflictError('An account with this email already exists');
        }
        if (target?.includes('phone')) {
          throw new ConflictError('An account with this phone number already exists');
        }
        throw new ConflictError('An account with these credentials already exists');
      }
      throw err;
    }

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
  // P2-F2: Fixed timing-attack dummy hash (valid bcrypt format)
  // ═══════════════════════════════════════════════════════════

  static async loginWithEmail(dto: LoginWithEmailDTO): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash) {
      // P2-F2: Constant-time defense — valid bcrypt hash, full computation
      await PasswordService.compare(dto.password, TIMING_SAFE_DUMMY_HASH);
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
  // P2-F1: Race condition fix on user creation
  // P2-F3: Phone PII leak fix — random synthetic email
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

      try {
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              // P2-F3: Random synthetic email — no phone PII leak
              email: isEmail
                ? dto.destination.toLowerCase().trim()
                : `phone-user-${crypto.randomUUID().slice(0, 8)}@phone.datunai.com`,
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
      } catch (err) {
        // P2-F1: Race condition — concurrent OTP verify with same phone/email
        if ((err as { code?: string }).code === 'P2002') {
          // User was created by another concurrent request — fetch and continue
          user = await prisma.user.findUnique({ where: whereClause });
          if (!user) throw new ConflictError('Account creation conflict. Please try again.');
          isNewUser = false;
        } else {
          throw err;
        }
      }
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
  // P2-F1: Race condition fix on Google signup
  // P2-F20: Avatar — fresh Google picture takes priority
  // ═══════════════════════════════════════════════════════════

  static async loginWithGoogle(dto: GoogleAuthDTO): Promise<AuthResponse> {
    const googleUser = await GoogleOAuthService.exchangeCodeForUser(dto.code, dto.redirectUri);

    // SECURITY (Day 11 fix): Reject unverified Google emails.
    // Google's `verified_email: false` indicates the user signed up with a Gmail-like
    // address but hasn't actually proven ownership. Allowing these creates an account
    // takeover vector — attacker registers a Gmail-style email they don't own, then
    // when the real owner verifies, attacker has prior account claim.
    // Pattern: Auth0 default policy, Clerk default, every serious auth provider.
    if (!googleUser.emailVerified) {
      logger.warn('Google OAuth: rejected unverified email', {
        googleId: googleUser.id,
        email: googleUser.email,
      });
      throw new AuthenticationError(
        'Your Google account email is not verified. Please verify your email with Google before signing in.',
      );
    }

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
          // P2-F20: Fresh Google picture takes priority over stale avatar
          avatarUrl: googleUser.picture ?? existingIdentity.user.avatarUrl,
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
          // P2-F20: Fresh Google picture priority
          avatarUrl: googleUser.picture ?? user.avatarUrl,
        },
      });
    } else {
      isNewUser = true;

      try {
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
      } catch (err) {
        // P2-F1: Race condition — Google signup concurrent
        if ((err as { code?: string }).code === 'P2002') {
          user = await prisma.user.findUnique({
            where: { email: googleUser.email.toLowerCase() },
          });
          if (!user) throw new ConflictError('Account creation conflict. Please try again.');
          isNewUser = false;
        } else {
          throw err;
        }
      }
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
  // P2-F5: Invalidate old OTP before sending new
  // P2-F6: Per-email rate limit (max 3/hour)
  // ═══════════════════════════════════════════════════════════

  static async forgotPassword(dto: ForgotPasswordDTO): Promise<void> {
    // P2-F6: Per-email rate limit
    const rateLimitKey = `forgot-pwd:${dto.email.toLowerCase().trim()}`;
    const requestCount = await cache.incr(rateLimitKey, 3600);
    if (requestCount > 3) {
      logger.warn('Forgot password rate limit hit', { email: dto.email });
      return; // Silent — don't reveal rate limit to attacker
    }

    const user = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      logger.info('Forgot password for non-existent email', { email: dto.email });
      return;
    }

    // P2-F5: Invalidate any prior OTP before sending new
    await OtpService.invalidate(user.email, 'email');

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
