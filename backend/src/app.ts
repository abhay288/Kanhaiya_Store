import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { apiV1Router } from './routes';
import { healthRouter } from './modules/health/health.router';
import { errorHandler } from './middleware/error.middleware';
import { standardRateLimiter } from './middleware/rateLimiter';
import { NotFoundError } from './utils/errors';

import { correlationMiddleware } from './middleware/correlation.middleware';
import { noSqlSanitizer } from './middleware/nosql-sanitize.middleware';

export const app = express();

// Request correlation ID tracking
app.use(correlationMiddleware);

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps or curl) or in allowlist
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Guest-Token', 'X-Idempotency-Key'],
  })
);

// Standard rate limiter for global API protection
app.use(standardRateLimiter);

// Request body parsers with strict size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL query operator injection protection
app.use(noSqlSanitizer);

// HTTP access logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Base health endpoint for cloud platform health checks (Render, Kubernetes, etc.)
app.use(healthRouter);

// Mount versioned API routes
app.use('/api/v1', apiV1Router);

// 404 fallback for undefined routes
app.use((req, _res, next) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);
