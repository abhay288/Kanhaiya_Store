import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Admin Role Authorization Middleware.
 * Strictly verifies that the authenticated user possesses 'admin' or 'store_manager' role.
 * Never trusts client-supplied query, body, or custom client headers.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required before authorization check'));
  }

  if (req.user.role !== 'admin' && req.user.role !== 'store_manager') {
    return next(new ForbiddenError('Access denied: Administrator privileges required'));
  }

  next();
}
