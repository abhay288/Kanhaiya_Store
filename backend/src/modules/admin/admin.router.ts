import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

// Strictly guarded behind requireAuth AND requireAdmin
router.get('/metrics', requireAuth, requireAdmin, (_req, res) => {
  return sendSuccess(res, {
    totalOrdersToday: 0,
    pendingVerifications: 0,
    lowStockAlerts: 0,
    storeOperationalStatus: 'Open',
  }, 'Admin metrics summary');
});

export const adminRouter = router;
