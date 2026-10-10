import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

async function bootstrap() {
  // Attempt DB connection gracefully (will not crash app if offline in dev)
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Kanhaiya General Store API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`👉 Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      logger.info('Process termination complete');
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failure:', err);
  process.exit(1);
});
