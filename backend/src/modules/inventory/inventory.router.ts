import { Router } from 'express';
import {
  adjustStock,
  reconcileStock,
  getInventorySummary,
  listMovements,
  getProductMovements,
  getLowStockReport,
  getExpiryReport,
  listAlerts,
  acknowledgeAlert,
  resolveAlert,
} from './inventory.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize-admin';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  stockAdjustmentSchema,
  stockReconciliationSchema,
  listMovementsQuerySchema,
  listAlertsQuerySchema,
  alertIdParamSchema,
  expiryReportQuerySchema,
} from './inventory.schema';
import { productIdParamSchema } from '../products/product.schema';

const router = Router();

// All inventory operations require Admin authorization
router.use(authenticate, authorizeAdmin);

// Inventory Dashboard Metrics & Reports
router.get('/summary', getInventorySummary);
router.get('/low-stock', getLowStockReport);
router.get('/expiry-report', validateRequest(expiryReportQuerySchema), getExpiryReport);

// Stock Adjustments and Reconciliation
router.post('/adjust', validateRequest(stockAdjustmentSchema), adjustStock);
router.post('/reconcile', validateRequest(stockReconciliationSchema), reconcileStock);

// Stock Movement Audit Log
router.get('/movements', validateRequest(listMovementsQuerySchema), listMovements);
router.get('/movements/:id', validateRequest(productIdParamSchema), getProductMovements);

// Low-Stock & Out-of-Stock Alerts
router.get('/alerts', validateRequest(listAlertsQuerySchema), listAlerts);
router.patch('/alerts/:id/acknowledge', validateRequest(alertIdParamSchema), acknowledgeAlert);
router.patch('/alerts/:id/resolve', validateRequest(alertIdParamSchema), resolveAlert);

export const inventoryRouter = router;
