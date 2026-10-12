import { Request, Response, NextFunction } from 'express';

function sanitizeObject(target: any, depth = 0): void {
  if (depth > 10 || !target || typeof target !== 'object') {
    return;
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      sanitizeObject(item, depth + 1);
    }
    return;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      sanitizeObject(target[key], depth + 1);
    }
  }
}

/**
 * Strips MongoDB operator keys ($gt, $ne, $where, etc.) from request query, params, and body
 * to prevent NoSQL injection attacks.
 */
export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }
  next();
}
