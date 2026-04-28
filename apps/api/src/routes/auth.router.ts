// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES — /api/auth/*
// Security events logged for DPDP compliance + threat detection.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { authLimiter } from '../middleware/rate-limit.js';
import { requireAuth, requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuthService } from '../services/auth/auth.service.js';
import { blacklist } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { logSecurityEvent } from '../lib/security-logger.js';
import {
  signupEmailSchema,
  loginEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../validators/schemas.js';

export const authRouter = Router();

function reqMeta(req: import('express').Request) {
  return {
    ip: (req.headers['x-real-ip'] as string) ?? req.ip ?? 'unknown',
    userAgent: req.headers['user-agent'],
  };
}

authRouter.post(
  '/auth/signup',
  authLimiter,
  validate(signupEmailSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.signupWithEmail(req.body);
      await blacklist.remove(result.user.id);
      logSecurityEvent({
        event: 'auth.signup.success',
        userId: result.user.id,
        email: result.user.email,
        ...reqMeta(req),
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      logSecurityEvent({
        event: 'auth.login.failed',
        email: req.body.email,
        ...reqMeta(req),
        details: { reason: (err as Error).message, endpoint: 'signup' },
      });
      next(err);
    }
  },
);

authRouter.post('/auth/login', authLimiter, validate(loginEmailSchema), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithEmail(req.body);
    await blacklist.remove(result.user.id);
    logSecurityEvent({
      event: 'auth.login.success',
      userId: result.user.id,
      email: result.user.email,
      ...reqMeta(req),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    logSecurityEvent({
      event: 'auth.login.failed',
      email: req.body.email,
      ...reqMeta(req),
      details: { reason: (err as Error).message },
    });
    next(err);
  }
});

authRouter.post('/auth/otp/send', authLimiter, validate(sendOtpSchema), async (req, res, next) => {
  try {
    const result = await AuthService.sendOtp(req.body);
    logSecurityEvent({
      event: 'auth.otp.requested',
      email: req.body.email,
      ...reqMeta(req),
      details: { channel: req.body.channel ?? 'email' },
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/auth/otp/verify',
  authLimiter,
  validate(verifyOtpSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.verifyOtp(req.body);
      await blacklist.remove(result.user.id);
      logSecurityEvent({
        event: 'auth.otp.verified',
        userId: result.user.id,
        email: result.user.email,
        ...reqMeta(req),
        details: { isNewUser: result.isNewUser },
      });
      res.status(result.isNewUser ? 201 : 200).json({ success: true, data: result });
    } catch (err) {
      logSecurityEvent({
        event: 'auth.otp.failed',
        email: req.body.email,
        ...reqMeta(req),
        details: { reason: (err as Error).message },
      });
      next(err);
    }
  },
);

authRouter.post('/auth/google', authLimiter, validate(googleAuthSchema), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithGoogle(req.body);
    await blacklist.remove(result.user.id);
    logSecurityEvent({
      event: 'auth.google.success',
      userId: result.user.id,
      email: result.user.email,
      ...reqMeta(req),
      details: { isNewUser: result.isNewUser },
    });
    res.status(result.isNewUser ? 201 : 200).json({ success: true, data: result });
  } catch (err) {
    logSecurityEvent({
      event: 'auth.google.failed',
      ...reqMeta(req),
      details: { reason: (err as Error).message },
    });
    next(err);
  }
});

authRouter.get('/auth/google/consent-url', (req, res, next) => {
  try {
    const redirectUri = (req.query['redirect_uri'] as string) || '';
    if (!redirectUri) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'redirect_uri query param required' },
      });
      return;
    }
    const url = AuthService.getGoogleConsentUrl(redirectUri);
    res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/auth/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      await AuthService.forgotPassword(req.body);
      logSecurityEvent({
        event: 'auth.password.reset.requested',
        email: req.body.email,
        ...reqMeta(req),
      });
      res.json({
        success: true,
        data: { message: 'If an account exists, a reset code has been sent' },
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/auth/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await AuthService.resetPassword(email, otp, newPassword);
      await blacklist.add(result.user.id, Math.floor(Date.now() / 1000) + 7 * 24 * 3600);
      logSecurityEvent({
        event: 'auth.password.changed',
        userId: result.user.id,
        email,
        ...reqMeta(req),
      });
      res.json({ success: true, data: result });
    } catch (err) {
      logSecurityEvent({
        event: 'auth.otp.failed',
        email: req.body.email,
        ...reqMeta(req),
        details: { reason: (err as Error).message, endpoint: 'reset-password' },
      });
      next(err);
    }
  },
);

authRouter.post('/auth/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const tokens = await AuthService.refreshToken(req.body);
    logSecurityEvent({ event: 'auth.token.refresh', ...reqMeta(req) });
    res.json({ success: true, data: tokens });
  } catch (err) {
    logSecurityEvent({
      event: 'auth.token.expired',
      ...reqMeta(req),
      details: { reason: (err as Error).message },
    });
    next(err);
  }
});

authRouter.get('/auth/me', requireUser, async (req, res, next) => {
  try {
    // P2-F11: requireUser already loaded user from DB — no second lookup
    const u = req.dbUser!;
    res.json({
      success: true,
      data: {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        role: u.primaryRole,
        isEmailVerified: u.isEmailVerified,
        isPhoneVerified: u.isPhoneVerified,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await blacklist.add(req.auth!.sub, req.auth!.exp);
    logSecurityEvent({ event: 'auth.logout', userId: req.auth!.sub, ...reqMeta(req) });
    logger.info('User logged out', { userId: req.auth!.sub });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});
