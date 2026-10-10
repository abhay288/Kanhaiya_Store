import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  return sendSuccess(res, [], 'Orders module initialized (Phase 1)');
});

export const orderRouter = router;
