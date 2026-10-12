/* eslint-disable no-console */

const SENSITIVE_KEY_REGEX = /^(authorization|password|token|secret|private_key|privatekey|api_key|apikey|cookie|access_token|refresh_token)$/i;

/**
 * Deeply redacts sensitive keys and values from arguments before logging.
 */
export function sanitizeLogArg(arg: unknown, depth = 0): unknown {
  if (depth > 5) return '[MAX_DEPTH]';
  if (!arg) return arg;

  if (typeof arg === 'string') {
    // Redact bearer tokens and long JWTs
    return arg
      .replace(/Bearer\s+[A-Za-z0-9\-_=.]+/gi, 'Bearer [REDACTED]')
      .replace(/eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g, '[REDACTED_JWT]');
  }

  if (Array.isArray(arg)) {
    return arg.map((item) => sanitizeLogArg(item, depth + 1));
  }

  if (typeof arg === 'object' && arg !== null) {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(arg)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeLogArg(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return arg;
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    const cleaned = args.map((a) => sanitizeLogArg(a));
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...cleaned);
  },
  warn: (msg: string, ...args: unknown[]) => {
    const cleaned = args.map((a) => sanitizeLogArg(a));
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...cleaned);
  },
  error: (msg: string, ...args: unknown[]) => {
    const cleaned = args.map((a) => sanitizeLogArg(a));
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...cleaned);
  },
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      const cleaned = args.map((a) => sanitizeLogArg(a));
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, ...cleaned);
    }
  },
};
