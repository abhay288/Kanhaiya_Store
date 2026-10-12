import { Router } from 'express';
import { SettingsService } from './settings.service';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

router.get('/public', async (_req, res, next) => {
  try {
    const settings = await SettingsService.getSettings();
    return sendSuccess(
      res,
      {
        storeName: settings.storeName,
        phone: settings.storePhone,
        whatsappNumber: settings.storeWhatsapp,
        upiId: settings.storeUpiId,
        storeAddress: settings.storeAddress,
        pickupInstructions: settings.pickupInstructions,
        isDeliveryEnabled: settings.isDeliveryEnabled,
        serviceablePincodes: settings.serviceablePincodes,
        minOrderValue: settings.minOrderValue,
        standardDeliveryFee: settings.standardDeliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        estimatedDeliveryWindow: settings.estimatedDeliveryWindow,
        isWhatsappQrEnabled: settings.isWhatsappQrEnabled,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
      },
      'Public store configuration'
    );
  } catch (err) {
    next(err);
  }
});

router.post('/check-serviceability', async (req, res, next) => {
  try {
    const { pincode, subtotal } = req.body;
    const result = await SettingsService.checkServiceability(
      pincode,
      typeof subtotal === 'number' ? subtotal : 0
    );
    return sendSuccess(res, result, 'Delivery serviceability check completed');
  } catch (err) {
    next(err);
  }
});

router.get('/check-serviceability', async (req, res, next) => {
  try {
    const pincode = req.query.pincode as string;
    const subtotal = Number(req.query.subtotal) || 0;
    const result = await SettingsService.checkServiceability(pincode, subtotal);
    return sendSuccess(res, result, 'Delivery serviceability check completed');
  } catch (err) {
    next(err);
  }
});

export const settingsRouter = router;
