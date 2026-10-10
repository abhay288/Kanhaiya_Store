import { Router } from 'express';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/public', (_req, res) => {
  return sendSuccess(res, {
    storeName: env.STORE_NAME,
    phone: env.STORE_PHONE,
    whatsappNumber: env.STORE_WHATSAPP,
    upiId: env.STORE_UPI_ID,
    minOrderValue: 100,
    freeDeliveryThreshold: 500,
    standardDeliveryFee: 30,
    currency: 'INR',
    currencySymbol: '₹',
  }, 'Public store configuration');
});

export const settingsRouter = router;
