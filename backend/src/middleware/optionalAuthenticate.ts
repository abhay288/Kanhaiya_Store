import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthSessionPayload } from '../modules/auth/auth.service';

/**
 * Optional authentication middleware.
 * If Authorization header is present and valid, attaches req.user.
 * Does not reject requests if header is missing or token is invalid.
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
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthSessionPayload;
    req.user = {
      id: decoded.id,
      firebaseUid: decoded.firebaseUid,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (_ignored) {
    // Silently continue as guest
  }

  next();
}
