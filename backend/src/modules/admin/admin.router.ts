import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize-admin';
import { sendSuccess } from '../../utils/apiResponse';

const router = Router();

// Phase 2 test route: Strictly guarded behind authenticate AND authorizeAdmin
router.get('/test', authenticate, authorizeAdmin, (req, res) => {
  return sendSuccess(
    res,
    {
      authorized: true,
      message: 'Admin authorization successfully verified.',
      user: req.user,
      serverTimestamp: new Date().toISOString(),
    },
    'Access granted to authorized store administrator.'
  );
});

// Operational metrics placeholder for Phase 6
router.get('/metrics', authenticate, authorizeAdmin, (_req, res) => {
  return sendSuccess(
    res,
    {
      totalOrdersToday: 0,
      pendingVerifications: 0,
      lowStockAlerts: 0,
      storeOperationalStatus: 'Open',
    },
    'Admin metrics summary'
  );
});

export const adminRouter = router;
