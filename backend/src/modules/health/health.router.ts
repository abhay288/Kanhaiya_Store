import { Router } from 'express';
import { getHealthStatus } from './health.controller';

const router = Router();

router.get('/health', getHealthStatus);
router.head('/health', (_req, res) => res.status(200).end());

router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Kanhaiya General Store API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
router.head('/', (_req, res) => res.status(200).end());

export const healthRouter = router;
