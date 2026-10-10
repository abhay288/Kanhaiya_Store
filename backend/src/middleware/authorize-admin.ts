import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Authorize Admin Middleware.
 * Enforces strict role verification for administrative endpoints.
 * Never trusts client headers, client roles, or unauthenticated requests.
 */
export function authorizeAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required before admin authorization check.'));
  }

  if (req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Access denied: Administrator privileges required.'));
  }

  next();
}
