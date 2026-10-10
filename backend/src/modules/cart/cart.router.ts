import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  return sendSuccess(res, { items: [], subtotal: 0 }, 'Cart module initialized (Phase 1)');
});

export const cartRouter = router;
