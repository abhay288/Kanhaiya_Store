import { Router } from 'express';
import { healthRouter } from '../modules/health/health.router';
import { authRouter } from '../modules/auth/auth.router';
import { categoryRouter } from '../modules/categories/category.router';
import { productRouter } from '../modules/products/product.router';
import { cartRouter } from '../modules/cart/cart.router';
import { orderRouter } from '../modules/orders/order.router';
import { paymentRouter } from '../modules/payments/payment.router';
import { invoiceRouter } from '../modules/invoices/invoice.router';
import { notificationRouter } from '../modules/notifications/notification.router';
import { adminRouter } from '../modules/admin/admin.router';
import { settingsRouter } from '../modules/settings/settings.router';

const router = Router();

// Base health and monitoring
router.use(healthRouter);

// Domain API endpoints
router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/products', productRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/payments', paymentRouter);
router.use('/invoices', invoiceRouter);
router.use('/notifications', notificationRouter);
router.use('/admin', adminRouter);
router.use('/settings', settingsRouter);

export const apiV1Router = router;
