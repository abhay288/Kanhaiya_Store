import { Router } from 'express';
import { getHealthStatus } from './health.controller';

const router = Router();

router.get('/health', getHealthStatus);

export const healthRouter = router;
