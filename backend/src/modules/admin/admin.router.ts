import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize-admin';
import { sendSuccess } from '../../utils/apiResponse';
import {
  upload,
  uploadSingleImage,
  uploadMultipleImages,
  getSignedUploadParams,
  deleteImage,
} from './upload.controller';

import {
  getOverview,
  getSalesAnalytics,
  getProductReports,
  getInventoryReports,
  getOrderReports,
  getCustomers,
  getCustomerDetails,
  exportReport,
  getStoreSettingsAdmin,
  updateStoreSettingsAdmin,
} from './analytics.controller';
import { AdminUsersController } from './users.controller';
import { OrderController } from '../orders/order.controller';

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

// Phase 8: Business Analytics & KPIs
router.get('/analytics/overview', authenticate, authorizeAdmin, getOverview);
router.get('/analytics/sales', authenticate, authorizeAdmin, getSalesAnalytics);

// Phase 8: Comprehensive Reports
router.get('/reports/products', authenticate, authorizeAdmin, getProductReports);
router.get('/reports/inventory', authenticate, authorizeAdmin, getInventoryReports);
router.get('/reports/orders', authenticate, authorizeAdmin, getOrderReports);
router.get('/reports/payments', authenticate, authorizeAdmin, getOrderReports);
router.get('/reports/export/:reportType', authenticate, authorizeAdmin, exportReport);

// Direct Admin Order Operations & Tracking Endpoints
router.get('/orders/metrics', authenticate, authorizeAdmin, OrderController.getAdminMetrics as any);
router.get('/orders/all', authenticate, authorizeAdmin, OrderController.listAdminOrders as any);
router.get('/orders', authenticate, authorizeAdmin, OrderController.listAdminOrders as any);
router.get('/orders/:idOrNumber', authenticate, authorizeAdmin, OrderController.getOrder as any);
router.patch('/orders/:idOrNumber/status', authenticate, authorizeAdmin, OrderController.updateStatus as any);
router.post('/orders/:idOrNumber/status', authenticate, authorizeAdmin, OrderController.updateStatus as any);
router.patch('/orders/:idOrNumber/verify-payment', authenticate, authorizeAdmin, OrderController.verifyWhatsAppPayment as any);
router.post('/orders/:idOrNumber/verify-payment', authenticate, authorizeAdmin, OrderController.verifyWhatsAppPayment as any);
router.patch('/orders/:idOrNumber/collect-cod', authenticate, authorizeAdmin, OrderController.collectCodPayment as any);
router.post('/orders/:idOrNumber/collect-cod', authenticate, authorizeAdmin, OrderController.collectCodPayment as any);
router.delete('/orders/:idOrNumber', authenticate, authorizeAdmin, OrderController.deleteAdminOrder as any);

// Direct MongoDB User Management CRUD
router.get('/users', authenticate, authorizeAdmin, AdminUsersController.listUsers);
router.post('/users', authenticate, authorizeAdmin, AdminUsersController.createUser);
router.get('/users/:id', authenticate, authorizeAdmin, AdminUsersController.getUser);
router.patch('/users/:id', authenticate, authorizeAdmin, AdminUsersController.updateUser);
router.delete('/users/:id', authenticate, authorizeAdmin, AdminUsersController.deleteUser);

// Phase 8: Customer Management (Legacy Analytics)
router.get('/customers', authenticate, authorizeAdmin, getCustomers);
router.get('/customers/:id', authenticate, authorizeAdmin, getCustomerDetails);

// Phase 8: Store Configuration
router.get('/settings', authenticate, authorizeAdmin, getStoreSettingsAdmin);
router.patch('/settings', authenticate, authorizeAdmin, updateStoreSettingsAdmin);

// Operational metrics
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

// Cloudinary Image Management (Strictly Admin only)
router.post(
  '/upload',
  authenticate,
  authorizeAdmin,
  upload.single('image'),
  uploadSingleImage
);

router.post(
  '/upload-multiple',
  authenticate,
  authorizeAdmin,
  upload.array('images', 10),
  uploadMultipleImages
);

router.post(
  '/upload/sign',
  authenticate,
  authorizeAdmin,
  getSignedUploadParams
);

router.delete(
  '/upload/:publicId(*)',
  authenticate,
  authorizeAdmin,
  deleteImage
);

export const adminRouter = router;

