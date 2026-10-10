import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  return sendSuccess(res, [], 'Notifications feed initialized');
});

export const notificationRouter = router;
