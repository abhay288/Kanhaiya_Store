import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

// -------------------------------------------------------------
// Admin Protected Order Management Endpoints
// -------------------------------------------------------------
router.get('/admin/metrics', authenticate, requireAdmin, OrderController.getAdminMetrics as any);
router.get('/admin/all', authenticate, requireAdmin, OrderController.listAdminOrders as any);
router.get('/admin', authenticate, requireAdmin, OrderController.listAdminOrders as any);
router.post('/admin', authenticate, requireAdmin, OrderController.createAdminOrder as any);
router.get('/admin/:idOrNumber', authenticate, requireAdmin, OrderController.getOrder as any);
router.patch('/admin/:idOrNumber', authenticate, requireAdmin, OrderController.updateAdminOrder as any);
router.delete('/admin/:idOrNumber', authenticate, requireAdmin, OrderController.deleteAdminOrder as any);

router.patch('/admin/:idOrNumber/status', authenticate, requireAdmin, OrderController.updateStatus as any);
router.post('/admin/:idOrNumber/status', authenticate, requireAdmin, OrderController.updateStatus as any);

router.patch('/admin/:idOrNumber/verify-payment', authenticate, requireAdmin, OrderController.verifyWhatsAppPayment as any);
router.post('/admin/:idOrNumber/verify-payment', authenticate, requireAdmin, OrderController.verifyWhatsAppPayment as any);

router.patch('/admin/:idOrNumber/collect-cod', authenticate, requireAdmin, OrderController.collectCodPayment as any);
router.post('/admin/:idOrNumber/collect-cod', authenticate, requireAdmin, OrderController.collectCodPayment as any);

router.patch('/admin/:idOrNumber/cancel', authenticate, requireAdmin, OrderController.cancelOrder as any);
router.post('/admin/:idOrNumber/cancel', authenticate, requireAdmin, OrderController.cancelOrder as any);

// -------------------------------------------------------------
// Customer / Public Endpoints
// -------------------------------------------------------------
// Place order (guest checkout or authenticated customer)
router.post('/', optionalAuthenticate, OrderController.createOrder as any);

// Customer order history (supports /orders/my and /orders)
router.get('/my', authenticate, OrderController.getMyOrders as any);
router.get('/', authenticate, OrderController.getMyOrders as any);

// Customer / Guest order tracking timeline
router.get('/:idOrNumber/track', optionalAuthenticate, OrderController.getTracking as any);
router.get('/:idOrNumber/tracking', optionalAuthenticate, OrderController.getTracking as any);

// Customer / Guest / Admin PDF invoice download
router.get('/:idOrNumber/invoice', optionalAuthenticate, OrderController.downloadInvoice as any);

// Single order details by ID or orderNumber (must remain after specific /my and /admin routes)
router.get('/:idOrNumber', optionalAuthenticate, OrderController.getOrder as any);

// Customer / Admin delete order invoice
router.delete('/:idOrNumber', authenticate, OrderController.deleteCustomerOrder as any);

export const orderRouter = router;
