import { Router } from 'express';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', (_req, res) => {
  return sendSuccess(res, { items: [], total: 0 }, 'Products module initialized (Phase 1)');
});

export const productRouter = router;
