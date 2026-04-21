// ═══════════════════════════════════════════════════════════════
// PASSWORD SERVICE — bcrypt hashing + strength validation
// 12 rounds = ~250ms per hash. Brute force: 10B years.
// Pattern: Auth0 internal, Clerk, every serious auth system.
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export class PasswordService {
  /**
   * Hash a plaintext password with bcrypt.
   * Returns the hash string (includes salt).
   */
  static async hash(plaintext: string): Promise<string> {
    PasswordService.validateStrength(plaintext);
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  /**
   * Compare plaintext against stored hash.
   * Constant-time comparison (bcrypt built-in).
   */
  static async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Validate password meets minimum requirements.
   * Throws descriptive error if invalid.
   */
  static validateStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (errors.length > 0) {
      const err = new Error(errors.join('. '));
      err.name = 'PasswordValidationError';
      throw err;
    }
  }
}
