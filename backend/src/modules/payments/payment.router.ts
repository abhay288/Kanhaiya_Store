import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/methods', (_req, res) => {
  return sendSuccess(res, [
    { id: 'cod', name: 'Cash on Delivery', description: 'Pay cash when groceries arrive at your doorstep' },
    { id: 'whatsapp_qr', name: 'WhatsApp QR / UPI', description: 'Scan QR code and share reference on WhatsApp' }
  ], 'Payment methods');
});

export const paymentRouter = router;
