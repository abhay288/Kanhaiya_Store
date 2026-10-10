import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/:id', requireAuth, (req, res) => {
  return sendSuccess(res, { orderId: req.params.id }, 'Invoice metadata placeholder');
});

export const invoiceRouter = router;
