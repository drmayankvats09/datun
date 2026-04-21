// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES — /api/auth/*
// Complete auth endpoints. Zero 3rd-party redirects.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { authLimiter } from '../middleware/rate-limit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuthService } from '../services/auth/auth.service.js';
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

authRouter.post(
  '/auth/signup',
  authLimiter,
  validate(signupEmailSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.signupWithEmail(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post('/auth/login', authLimiter, validate(loginEmailSchema), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithEmail(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/otp/send', authLimiter, validate(sendOtpSchema), async (req, res, next) => {
  try {
    const result = await AuthService.sendOtp(req.body);
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
      const statusCode = result.isNewUser ? 201 : 200;
      res.status(statusCode).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post('/auth/google', authLimiter, validate(googleAuthSchema), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithGoogle(req.body);
    const statusCode = result.isNewUser ? 201 : 200;
    res.status(statusCode).json({ success: true, data: result });
  } catch (err) {
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
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post('/auth/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const tokens = await AuthService.refreshToken(req.body);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getCurrentUser(req.auth!.sub);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});
