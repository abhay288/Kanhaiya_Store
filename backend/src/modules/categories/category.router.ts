import { Router } from 'express';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', (_req, res) => {
  return sendSuccess(res, [], 'Categories module initialized (Phase 1)');
});

export const categoryRouter = router;
