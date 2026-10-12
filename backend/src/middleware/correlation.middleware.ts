import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Attaches a unique request correlation ID to trace requests across logs and responses.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'] as string | undefined;
  // If valid format (alphanumeric with hyphens, 8-64 chars), reuse; otherwise generate fresh UUID
  const correlationId =
    incomingId && /^[a-zA-Z0-9_-]{8,64}$/.test(incomingId)
      ? incomingId
      : crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Request-Id', correlationId);
  next();
}
