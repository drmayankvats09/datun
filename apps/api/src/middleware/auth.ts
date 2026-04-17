// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Provider-agnostic token verification
// requireAuth: verifies token only (fast, for webhooks/read routes)
// requireUser: verifies token + loads Prisma User (for user routes)
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { getAuthProvider } from '../services/auth/index.js';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { AuthenticationError, NotFoundError } from '../errors/index.js';

/**
 * Verify JWT only — sets req.auth
 * Use for endpoints that need auth but not user data.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) throw new AuthenticationError('Bearer token required');

  try {
    const provider = getAuthProvider();
    req.auth = await provider.verifyToken(token);
    next();
  } catch (err) {
    logger.warn('Token verification failed', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Verify JWT + load full User from database — sets req.auth + req.dbUser
 * Use for endpoints that need user context (profile, consultations, etc.)
 */
export async function requireUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) throw new AuthenticationError('Bearer token required');

  // Verify token
  try {
    const provider = getAuthProvider();
    req.auth = await provider.verifyToken(token);
  } catch (err) {
    logger.warn('Token verification failed', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    throw new AuthenticationError('Invalid or expired token');
  }

  // Load user from DB via auth identity
  const identity = await prisma.userAuthIdentity.findFirst({
    where: { providerUserId: req.auth.sub },
    include: { user: true },
  });

  if (!identity) {
    throw new NotFoundError('User', req.auth.sub);
  }

  req.dbUser = identity.user;

  // Update last login timestamp (fire-and-forget, don't block request)
  prisma.user
    .update({
      where: { id: identity.user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {
      /* silent — non-critical */
    });

  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}
