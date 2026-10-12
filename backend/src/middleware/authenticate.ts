import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { AuthSessionPayload } from '../modules/auth/auth.service';
import { verifyFirebaseIdToken } from '../config/firebase-admin';
import { User, UserRole } from '../models/user.model';

export interface AuthenticatedUserPayload {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

/**
 * Authentication middleware.
 * Verifies Authorization Bearer token (supports application session JWT and direct Firebase ID tokens).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token required in Authorization header.'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new UnauthorizedError('Bearer token is empty.'));
  }

  try {
    // 1. First attempt verifying as application session JWT
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthSessionPayload;
      let authoritativeRole = decoded.role;

      if (decoded.id) {
        try {
          const user = await User.findById(decoded.id);
          if (user) {
            if (!user.isActive) {
              return next(new UnauthorizedError('User account has been deactivated.'));
            }
            authoritativeRole = user.role;
          }
        } catch {
          // Disconnected or mock test fallback
        }
      }

      req.user = {
        id: decoded.id,
        firebaseUid: decoded.firebaseUid,
        email: decoded.email,
        role: authoritativeRole,
      };
      return next();
    } catch (jwtErr) {
      if (jwtErr instanceof UnauthorizedError) {
        return next(jwtErr);
      }
      // If not an app JWT, try validating as a Firebase ID token
    }

    // 2. Attempt verifying as direct Firebase ID token
    const decodedFirebase = await verifyFirebaseIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedFirebase.uid });
    if (!user || !user.isActive) {
      return next(new UnauthorizedError('User account not found or deactivated.'));
    }

    req.user = {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired authentication token.'));
  }
}

/**
 * Optional authentication middleware.
 * If Bearer token is provided, decodes and attaches user to req.user; otherwise continues as guest.
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthSessionPayload;
      let authoritativeRole = decoded.role;

      if (decoded.id) {
        try {
          const user = await User.findById(decoded.id);
          if (user) {
            if (!user.isActive) {
              return next();
            }
            authoritativeRole = user.role;
          }
        } catch {
          // Disconnected or mock test fallback
        }
      }

      req.user = {
        id: decoded.id,
        firebaseUid: decoded.firebaseUid,
        email: decoded.email,
        role: authoritativeRole,
      };
      return next();
    } catch {
      // Not an app JWT
    }

    const decodedFirebase = await verifyFirebaseIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedFirebase.uid });
    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: user.role,
      };
    }
    next();
  } catch {
    // If token verification fails in optional mode, proceed without user
    next();
  }
}

