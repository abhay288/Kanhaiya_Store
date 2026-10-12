import { Router } from 'express';
import { healthRouter } from '../modules/health/health.router';
import { authRoutes } from '../modules/auth/auth.routes';
import { categoryRouter } from '../modules/categories/category.router';
import { productRouter } from '../modules/products/product.router';
import { cartRouter } from '../modules/cart/cart.router';
import { orderRouter } from '../modules/orders/order.router';
import { paymentRouter } from '../modules/payments/payment.router';
import { invoiceRouter } from '../modules/invoices/invoice.router';
import { notificationRouter } from '../modules/notifications/notification.router';
import { adminRouter } from '../modules/admin/admin.router';
import { settingsRouter } from '../modules/settings/settings.router';

import { inventoryRouter } from '../modules/inventory/inventory.router';
import { addressRouter } from '../modules/addresses/address.router';

const router = Router();

// Base health and monitoring
router.use(healthRouter);

// Domain API endpoints
router.use('/auth', authRoutes);
router.use('/categories', categoryRouter);
router.use('/products', productRouter);
router.use('/inventory', inventoryRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/addresses', addressRouter);
router.use('/payments', paymentRouter);
router.use('/invoices', invoiceRouter);
router.use('/notifications', notificationRouter);
router.use('/admin', adminRouter);
router.use('/settings', settingsRouter);

export const apiV1Router = router;
