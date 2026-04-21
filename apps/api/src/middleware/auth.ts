// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Own JWT verification, RBAC
// No Auth0. Verifies Datun-issued JWTs only.
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/db';
import type { UserPrimaryRole } from '@repo/db';
import { logger } from '../lib/logger.js';
import { AuthenticationError, ForbiddenError, NotFoundError } from '../errors/index.js';
import { JwtService } from '../services/auth/jwt.service.js';
import type { DecodedToken } from '../services/auth/types.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) throw new AuthenticationError('Bearer token required');

  try {
    req.auth = JwtService.verifyAccessToken(token);
    next();
  } catch (err) {
    logger.warn('Token verification failed', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    throw new AuthenticationError('Invalid or expired token');
  }
}

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

  prisma.user
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {});

  next();
}

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
    req.auth = JwtService.verifyAccessToken(token);
  } catch {}

  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}
