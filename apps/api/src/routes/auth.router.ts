// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES — /api/auth/*
// Complete auth endpoints. Zero 3rd-party redirects.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { authLimiter } from '../middleware/rate-limit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuthService } from '../services/auth/auth.service.js';
import { blacklist } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
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

// ── Signup ──
authRouter.post(
  '/auth/signup',
  authLimiter,
  validate(signupEmailSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.signupWithEmail(req.body);
      // Clear any previous blacklist (fresh login after logout+signup)
      await blacklist.remove(result.user.id);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── Login ──
authRouter.post('/auth/login', authLimiter, validate(loginEmailSchema), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithEmail(req.body);
    // Clear blacklist on fresh login
    await blacklist.remove(result.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── OTP Send ──
authRouter.post('/auth/otp/send', authLimiter, validate(sendOtpSchema), async (req, res, next) => {
  try {
    const result = await AuthService.sendOtp(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── OTP Verify ──
authRouter.post(
  '/auth/otp/verify',
  authLimiter,
  validate(verifyOtpSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.verifyOtp(req.body);
      await blacklist.remove(result.user.id);
      const statusCode = result.isNewUser ? 201 : 200;
      res.status(statusCode).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── Google OAuth ──
authRouter.post('/auth/google', authLimiter, validate(googleAuthSchema), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithGoogle(req.body);
    await blacklist.remove(result.user.id);
    const statusCode = result.isNewUser ? 201 : 200;
    res.status(statusCode).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── Google Consent URL ──
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

// ── Forgot Password ──
authRouter.post(
  '/auth/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      await AuthService.forgotPassword(req.body);
      res.json({
        success: true,
        data: { message: 'If an account exists, a reset code has been sent' },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Reset Password ──
authRouter.post(
  '/auth/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await AuthService.resetPassword(email, otp, newPassword);
      // Blacklist old tokens — force re-login on all devices
      await blacklist.add(result.user.id, Math.floor(Date.now() / 1000) + 7 * 24 * 3600);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── Refresh Token ──
authRouter.post('/auth/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const tokens = await AuthService.refreshToken(req.body);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
});

// ── Get Current User ──
authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getCurrentUser(req.auth!.sub);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ── Logout ──
authRouter.post('/auth/logout', requireAuth, async (req, res, next) => {
  try {
    // Blacklist this user's tokens until current token expires
    const tokenExp = req.auth!.exp;
    await blacklist.add(req.auth!.sub, tokenExp);
    logger.info('User logged out', { userId: req.auth!.sub });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});
