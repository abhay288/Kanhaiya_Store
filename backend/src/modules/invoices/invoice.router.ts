import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/:id', authenticate, (req, res) => {
  return sendSuccess(res, { orderId: req.params.id }, 'Invoice metadata placeholder');
});

export const invoiceRouter = router;
