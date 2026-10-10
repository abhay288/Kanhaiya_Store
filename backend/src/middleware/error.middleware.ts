import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 'Request validation failed', 400, 'VALIDATION_ERROR', err.flatten());
    return;
  }

  // Fallback for unhandled unexpected exceptions
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
}
