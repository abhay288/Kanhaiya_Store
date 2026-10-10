import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string;
  role: 'customer' | 'admin' | 'store_manager';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication Middleware Interface.
 * In Phase 2: Verifies incoming Authorization Bearer JWT/Firebase ID Token.
 * Phase 1: Provides typed structure and rejects unauthenticated requests on protected endpoints.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new UnauthorizedError('Bearer token is empty'));
  }

  // Development/Mock fallback only if specifically allowed in dev mode
  if (process.env.NODE_ENV === 'development' && token === 'dev-mock-admin-token') {
    req.user = {
      id: 'mock-admin-id',
      firebaseUid: 'mock-firebase-admin-uid',
      email: 'admin@kanhaiyastore.com',
      role: 'admin',
    };
    return next();
  }

  if (process.env.NODE_ENV === 'development' && token === 'dev-mock-customer-token') {
    req.user = {
      id: 'mock-customer-id',
      firebaseUid: 'mock-firebase-customer-uid',
      email: 'customer@example.com',
      role: 'customer',
    };
    return next();
  }

  // Production authentication will resolve via Firebase Admin SDK in Phase 2
  return next(new UnauthorizedError('Firebase token verification is pending Phase 2 configuration'));
}
