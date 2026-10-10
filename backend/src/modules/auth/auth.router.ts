import { Router } from 'express';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.post('/google', (_req, res) => {
  return sendSuccess(res, {
    message: 'Authentication module initialized. Production token exchange pending Phase 2 Firebase setup.',
  });
});

export const authRouter = router;
