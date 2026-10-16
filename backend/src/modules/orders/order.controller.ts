import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import { sendSuccess } from '../../utils/apiResponse';
import { UnauthorizedError } from '../../utils/errors';

export class OrderController {
  /**
   * Place an order (supports authenticated customer or guest checkout)
   */
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const idempotencyKey =
        (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;

      const order = await OrderService.placeOrder(
        {
          ...req.body,
          idempotencyKey,
        },
        req.user
      );

      return sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get an order by ID or order number (with object-level security)
   */
  static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.params.idOrNumber === 'my') {
        if (!req.user) {
          throw new UnauthorizedError('Authentication required to view order history');
        }
        return OrderController.getMyOrders(req, res, next);
      }

      const guestToken =
        (req.headers['x-guest-token'] as string) || (req.query.guestToken as string);
      const phone = req.query.phone as string;

      const order = await OrderService.getOrderByIdOrNumber(
        req.params.idOrNumber,
        req.user,
        guestToken || phone
      );
      return sendSuccess(res, order, 'Order details retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get authenticated user's order history
   */
  static async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await OrderService.getCustomerOrders(req.user!.id);
      return sendSuccess(res, orders, 'Customer order history retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List orders with server-side pagination, search & filters
   */
  static async listAdminOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.listAdminOrders({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search as string,
        orderStatus: (req.query.orderStatus || req.query.status) as string,
        paymentStatus: req.query.paymentStatus as string,
        paymentMethod: req.query.paymentMethod as string,
        fulfillmentMethod: req.query.fulfillmentMethod as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });
      return sendSuccess(res, result, 'Admin orders retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get order status counts and dashboard metrics
   */
  static async getAdminMetrics(_req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await OrderService.getAdminMetrics();
      return sendSuccess(res, metrics, 'Admin order metrics retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update order status (with fulfillment validation & audit history)
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, notes } = req.body;
      const updated = await OrderService.updateOrderStatus(
        req.params.idOrNumber,
        status,
        req.user!,
        notes
      );
      return sendSuccess(res, updated, `Order status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Verify manual WhatsApp QR payment
   */
  static async verifyWhatsAppPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionReference, notes } = req.body;
      const updated = await OrderService.verifyWhatsAppPayment(
        req.params.idOrNumber,
        req.user!,
        transactionReference,
        notes
      );
      return sendSuccess(res, updated, 'WhatsApp payment marked as verified');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Record cash/UPI collection for COD order
   */
  static async collectCodPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { notes } = req.body;
      const updated = await OrderService.collectCodPayment(
        req.params.idOrNumber,
        req.user!,
        notes
      );
      return sendSuccess(res, updated, 'COD payment collection recorded');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Cancel order and restore inventory exactly once
   */
  static async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const cancelled = await OrderService.cancelOrder(
        req.params.idOrNumber,
        req.user,
        reason
      );
      return sendSuccess(res, cancelled, 'Order cancelled and stock restored');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer / Guest: Get order tracking timeline
   */
  static async getTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const guestToken =
        (req.headers['x-guest-token'] as string) || (req.query.guestToken as string);
      const phone = req.query.phone as string;

      const tracking = await OrderService.getCustomerTracking(
        req.params.idOrNumber,
        req.user,
        guestToken,
        phone
      );
      return sendSuccess(res, tracking, 'Order tracking timeline retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Download / Stream PDF Invoice
   */
  static async downloadInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const guestToken =
        (req.headers['x-guest-token'] as string) || (req.query.guestToken as string);
      const phone = req.query.phone as string;

      const { buffer, filename } = await OrderService.getInvoicePdf(
        req.params.idOrNumber,
        req.user,
        guestToken,
        phone
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Manually create an order
   */
  static async createAdminOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.createAdminOrder(req.body, req.user!);
      return sendSuccess(res, order, 'Admin manual order created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update order details (Customer info, notes, order status, payment status)
   */
  static async updateAdminOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await OrderService.updateOrderAdmin(
        req.params.idOrNumber,
        req.body,
        req.user!
      );
      return sendSuccess(res, updated, 'Order updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Permanently delete order from MongoDB and restore inventory
   */
  static async deleteAdminOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.deleteOrderAdmin(
        req.params.idOrNumber,
        req.user!
      );
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer / Admin: Permanently delete order invoice from MongoDB and restore inventory
   */
  static async deleteCustomerOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.deleteOrderCustomer(
        req.params.idOrNumber,
        req.user!
      );
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}
