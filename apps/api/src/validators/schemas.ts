// ═══════════════════════════════════════════════════════════════
// RE-EXPORT PROXY — Backwards compatibility layer
// Routes import from here: import { signupEmailSchema } from '../validators/schemas.js'
// Actual schemas live in @repo/shared/validators (Task #38).
// Task #53.5 W2: import path moved to the /validators subpath —
// the root barrel no longer re-exports zod schemas (client bundle diet).
//
// WHY: Zero route changes. Routes keep importing from same path.
// FUTURE: When all routes migrate to direct @repo/shared import,
//         delete this file.
// ═══════════════════════════════════════════════════════════════

export {
  // Auth
  signupEmailSchema,
  loginEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  // Consultation
  chatMessageSchema,
  consultationStartSchema,
  consultationMessageSchema,
  // User
  authUserSchema,
  profileUpdateSchema,
} from '@repo/shared/validators';
