// ═══════════════════════════════════════════════════════════════
// OTP SERVICE — Email (Resend) + SMS (MSG91)
// 6-digit codes, 10-min expiry, max 3 verify attempts, rate limited.
// In-memory storage now, Redis (Task #29) later — interface same.
// Pattern: Razorpay OTP, Zomato phone verify, Google 2FA.
// ═══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { BRAND } from '@repo/shared';
import type { StoredOtp, OtpSendResponse } from './types.js';

// ── Config ──
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const OTP_MAX_ATTEMPTS = 3;
const OTP_COOLDOWN_SECONDS = 60; // 1 min between sends
const OTP_MAX_PER_HOUR = 5; // max 5 OTPs per destination per hour
const BCRYPT_SALT_ROUNDS = 10;

// ── In-memory OTP store (Redis later via Task #29) ──
const otpStore = new Map<string, StoredOtp>();
const sendCountStore = new Map<string, { count: number; windowStart: Date }>();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, otp] of otpStore) {
    if (otp.expiresAt < now) otpStore.delete(key);
  }
  for (const [key, data] of sendCountStore) {
    if (now.getTime() - data.windowStart.getTime() > 3600_000) {
      sendCountStore.delete(key);
    }
  }
}, 300_000);

export class OtpService {
  // ── Send OTP ──

  static async send(destination: string, channel: 'email' | 'phone'): Promise<OtpSendResponse> {
    const storeKey = `${channel}:${destination}`;

    // Rate limit: cooldown between sends
    const existing = otpStore.get(storeKey);
    if (existing) {
      const secondsSinceSend = (Date.now() - existing.createdAt.getTime()) / 1000;
      if (secondsSinceSend < OTP_COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(OTP_COOLDOWN_SECONDS - secondsSinceSend);
        return {
          success: false,
          maskedDestination: OtpService.maskDestination(destination, channel),
          expiresInSeconds: 0,
          retryAfterSeconds: retryAfter,
        };
      }
    }

    // Rate limit: max per hour
    const hourlyKey = `hourly:${storeKey}`;
    const hourly = sendCountStore.get(hourlyKey);
    if (hourly) {
      const elapsed = Date.now() - hourly.windowStart.getTime();
      if (elapsed < 3600_000 && hourly.count >= OTP_MAX_PER_HOUR) {
        logger.warn('OTP hourly rate limit hit', { destination: storeKey });
        return {
          success: false,
          maskedDestination: OtpService.maskDestination(destination, channel),
          expiresInSeconds: 0,
          retryAfterSeconds: Math.ceil((3600_000 - elapsed) / 1000),
        };
      }
      if (elapsed >= 3600_000) {
        sendCountStore.set(hourlyKey, { count: 1, windowStart: new Date() });
      } else {
        hourly.count++;
      }
    } else {
      sendCountStore.set(hourlyKey, { count: 1, windowStart: new Date() });
    }

    // Generate 6-digit OTP
    const code = OtpService.generateCode();
    const hash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);

    // Store hashed OTP
    otpStore.set(storeKey, {
      hash,
      destination,
      channel,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      createdAt: new Date(),
    });

    // Send via appropriate channel
    try {
      if (channel === 'email') {
        await OtpService.sendEmailOtp(destination, code);
      } else {
        await OtpService.sendSmsOtp(destination, code);
      }
    } catch (err) {
      logger.error('Failed to send OTP', {
        channel,
        destination: storeKey,
        error: (err as Error).message,
      });
      otpStore.delete(storeKey);
      throw new Error(`Failed to send OTP via ${channel}`);
    }

    logger.info('OTP sent', { channel, destination: storeKey });

    return {
      success: true,
      maskedDestination: OtpService.maskDestination(destination, channel),
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      retryAfterSeconds: OTP_COOLDOWN_SECONDS,
    };
  }

  // ── Verify OTP ──

  static async verify(
    destination: string,
    channel: 'email' | 'phone',
    code: string,
  ): Promise<boolean> {
    const storeKey = `${channel}:${destination}`;
    const stored = otpStore.get(storeKey);

    if (!stored) {
      logger.warn('OTP not found or expired', { destination: storeKey });
      return false;
    }

    if (stored.expiresAt < new Date()) {
      otpStore.delete(storeKey);
      logger.warn('OTP expired', { destination: storeKey });
      return false;
    }

    if (stored.attempts >= stored.maxAttempts) {
      otpStore.delete(storeKey);
      logger.warn('OTP max attempts exceeded', { destination: storeKey });
      return false;
    }

    stored.attempts++;

    const isValid = await bcrypt.compare(code, stored.hash);

    if (isValid) {
      otpStore.delete(storeKey);
      logger.info('OTP verified', { channel, destination: storeKey });
      return true;
    }

    logger.warn('OTP verification failed', {
      destination: storeKey,
      attemptsUsed: stored.attempts,
      maxAttempts: stored.maxAttempts,
    });

    return false;
  }

  // ── Private: Generate 6-digit code ──

  private static generateCode(): string {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0) % 1_000_000;
    return num.toString().padStart(OTP_LENGTH, '0');
  }

  // ── Private: Send email OTP via Resend ──

  private static async sendEmailOtp(email: string, code: string): Promise<void> {
    if (!env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set — OTP logged to console (dev only)', {
        email,
        code,
      });
      return;
    }

    const resend = new Resend(env.RESEND_API_KEY);

    await resend.emails.send({
      from: `${BRAND.name} <noreply@${env.RESEND_FROM_DOMAIN || 'datunai.com'}>`,
      to: email,
      subject: `${code} is your ${BRAND.name} verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0A0F1A; margin-bottom: 8px;">${BRAND.name}</h2>
          <p style="color: #666; font-size: 15px; line-height: 1.5;">Your verification code is:</p>
          <div style="background: #F5F5F5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0A0F1A;">${code}</span>
          </div>
          <p style="color: #999; font-size: 13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #bbb; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });
  }

  // ── Private: Send SMS OTP via MSG91 ──

  private static async sendSmsOtp(phone: string, code: string): Promise<void> {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
      logger.warn('MSG91 keys not set — OTP logged to console (dev only)', {
        phone,
        code,
      });
      return;
    }

    await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: env.MSG91_TEMPLATE_ID,
        mobile: phone.startsWith('+91') ? phone.slice(1) : `91${phone.replace(/^\+/, '')}`,
        otp: code,
        otp_length: OTP_LENGTH,
        otp_expiry: Math.ceil(OTP_EXPIRY_SECONDS / 60),
      },
      {
        headers: {
          authkey: env.MSG91_AUTH_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );
  }

  // ── Private: Mask destination for UI ──

  private static maskDestination(destination: string, channel: 'email' | 'phone'): string {
    if (channel === 'email') {
      const [local, domain] = destination.split('@');
      if (!local || !domain) return '***@***';
      const maskedLocal = local.length <= 2 ? local[0] + '***' : local[0] + '***' + local.slice(-1);
      return `${maskedLocal}@${domain}`;
    }

    if (destination.length <= 4) return '****';
    return '****' + destination.slice(-4);
  }
}
