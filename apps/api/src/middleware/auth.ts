// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Own JWT verification, RBAC, Token Blacklist
// No Auth0. Verifies Datun-issued JWTs only.
// Blacklist check via Redis — logout/password-change invalidation.
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/db';
import type { UserPrimaryRole } from '@repo/db';
import { logger } from '../lib/logger.js';
import { AuthenticationError, ForbiddenError, NotFoundError } from '../errors/index.js';
import { JwtService } from '../services/auth/jwt.service.js';
import { blacklist } from '../lib/redis.js';
import type { DecodedToken } from '../services/auth/types.js';

/**
 * Verify JWT + check blacklist. Lightweight — no DB call.
 * Use for endpoints that only need auth identity, not full user.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) throw new AuthenticationError('Bearer token required');

  try {
    req.auth = JwtService.verifyAccessToken(token);
  } catch (err) {
    logger.warn('Token verification failed', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    throw new AuthenticationError('Invalid or expired token');
  }

  // Check blacklist (Redis-backed — survives restart)
  const isBlocked = await blacklist.isBlacklisted(req.auth.sub);
  if (isBlocked) {
    throw new AuthenticationError('Session expired. Please log in again.');
  }

  next();
}

/**
 * Verify JWT + check blacklist + load full user from DB.
 * Use for endpoints that need user profile data.
 */
export async function requireUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) throw new AuthenticationError('Bearer token required');

  try {
    req.auth = JwtService.verifyAccessToken(token);
  } catch (err) {
    logger.warn('Token verification failed', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    throw new AuthenticationError('Invalid or expired token');
  }

  // Check blacklist
  const isBlocked = await blacklist.isBlacklisted(req.auth.sub);
  if (isBlocked) {
    throw new AuthenticationError('Session expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
  });

  if (!user) {
    throw new NotFoundError('User', req.auth.sub);
  }

  if (!user.isActive) {
    throw new AuthenticationError('Account is deactivated');
  }

  req.dbUser = user;

  // Update last login (non-blocking)
  prisma.user
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {});

  next();
}

/**
 * RBAC — require specific role(s).
 * Must be used AFTER requireAuth or requireUser.
 */
export function requireRole(
  ...allowedRoles: UserPrimaryRole[]
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw new AuthenticationError('Authentication required');
    }

    const userRole = req.auth.role as UserPrimaryRole;
    if (!allowedRoles.includes(userRole)) {
      logger.warn('Access denied — insufficient role', {
        userId: req.auth.sub,
        userRole,
        requiredRoles: allowedRoles,
        requestId: req.requestId,
      });
      throw new ForbiddenError(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`,
      );
    }

    next();
  };
}

/**
 * Optional auth — sets req.auth if valid token, continues without error if not.
 * Use for endpoints that work both logged-in and anonymous.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = JwtService.verifyAccessToken(token);
    const isBlocked = await blacklist.isBlacklisted(decoded.sub);
    if (!isBlocked) {
      req.auth = decoded;
    }
  } catch {
    // Invalid token — continue as anonymous
  }

  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}
