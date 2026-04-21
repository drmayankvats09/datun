// ═══════════════════════════════════════════════════════════════
// AUTH — Barrel exports
// ═══════════════════════════════════════════════════════════════

export { AuthService } from './auth.service.js';
export { JwtService } from './jwt.service.js';
export { OtpService } from './otp.service.js';
export { PasswordService } from './password.service.js';
export { GoogleOAuthService } from './google-oauth.service.js';
export type {
  DecodedToken,
  AuthMethod,
  AuthResponse,
  AuthTokens,
  SignupWithEmailDTO,
  LoginWithEmailDTO,
  SendOtpDTO,
  VerifyOtpDTO,
  GoogleAuthDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  RefreshTokenDTO,
  OtpSendResponse,
} from './types.js';
