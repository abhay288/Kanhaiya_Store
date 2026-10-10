import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  return sendSuccess(res, [], 'Orders module initialized (Phase 1)');
});

export const orderRouter = router;
