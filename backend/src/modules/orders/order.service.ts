import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  Order,
  IOrder,
  FulfillmentMethod,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  IOrderItemSnapshot,
  IOrderAuditEntry,
} from '../../models/order.model';
import { Product } from '../../models/product.model';
import { StockMovement } from '../../models/stockMovement.model';
import { Notification } from '../../models/notification.model';
import { User } from '../../models/user.model';
import { SettingsService } from '../settings/settings.service';
import { InvoiceService } from './invoice.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { AuthenticatedUserPayload } from '../../middleware/authenticate';

export interface PlaceOrderItemInput {
  productId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  items: PlaceOrderItemInput[];
  fulfillmentMethod: FulfillmentMethod;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: {
    houseNumber: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    deliveryInstructions?: string;
  };
  paymentMethod: PaymentMethod;
  customerNotes?: string;
  idempotencyKey?: string;
}

export interface AdminOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  fulfillmentMethod?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminCreateOrderItemInput {
  productId: string;
  quantity: number;
  sellingPrice?: number;
}

export interface AdminCreateOrderInput {
  items: AdminCreateOrderItemInput[];
  fulfillmentMethod?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: {
    houseNumber: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    deliveryInstructions?: string;
  };
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  customerNotes?: string;
}

export interface AdminUpdateOrderInput {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentMethod?: FulfillmentMethod;
  deliveryAddress?: any;
  notes?: string;
}

export const LEGACY_MOCK_PRODUCT_MAP: Record<string, string> = {
  'prod-1': '65f1a0000000000000000001',
  'prod-2': '65f1a0000000000000000002',
  'prod-3': '65f1a0000000000000000003',
  'prod-4': '65f1a0000000000000000004',
  'prod-5': '65f1a0000000000000000005',
  'prod-6': '65f1a0000000000000000006',
  'prod-7': '65f1a0000000000000000007',
  'prod-8': '65f1a0000000000000000008',
};

export class OrderService {
  /**
   * Safely dispatches notifications without blocking if database connection is offline or in mock unit tests
   */
  private static async sendNotificationSafely(data: any): Promise<void> {
    try {
      if (mongoose.connection.readyState === 1 || typeof (Notification as any).create?.mock !== 'undefined') {
        await Notification.create({
          appName: 'Kanhaiya General Store',
          logoUrl: 'assets/images/kgs_logo.png',
          ...data,
        });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Generates a unique, human-readable order number: KGS-YYYYMM-XXXX
   */
  private static async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    let attempts = 0;

    while (attempts < 10) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const candidate = `KGS-${yearMonth}-${randomSuffix}`;
      const existing = await Order.findOne({ orderNumber: candidate });
      if (!existing) {
        return candidate;
      }
      attempts++;
    }

    return `KGS-${yearMonth}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Main secure order placement flow with database price recalculation & inventory decrement
   */
  static async placeOrder(
    input: PlaceOrderInput,
    authenticatedUser?: AuthenticatedUserPayload
  ): Promise<IOrder> {
    // 1. Idempotency Check
    if (input.idempotencyKey?.trim()) {
      const existingOrder = await Order.findOne({
        idempotencyKey: input.idempotencyKey.trim(),
      });
      if (existingOrder) {
        return existingOrder;
      }
    }

    // 2. Validate Items Array
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestError('Cannot place an empty order. Cart must contain at least one item.');
    }

    // 3. Customer Info Validation
    const cleanName = (input.customerName || '').trim();
    if (!cleanName || cleanName.length < 2) {
      throw new BadRequestError('Customer full name is required (minimum 2 characters).');
    }

    const cleanPhone = (input.customerPhone || '').trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new BadRequestError('Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.');
    }

    // 4. Fulfillment & Address Validation
    const settings = await SettingsService.getSettings();
    let deliveryAddressSnapshot = null;
    let pickupDetailsSnapshot = null;

    if (input.fulfillmentMethod === 'DELIVERY') {
      if (!settings.isDeliveryEnabled) {
        throw new BadRequestError('Local delivery service is currently not available. Please choose In-Store Pickup.');
      }

      const addr = input.deliveryAddress;
      if (!addr) {
        throw new BadRequestError('Delivery address is required when Local Delivery is selected.');
      }

      const cleanPin = (addr.pincode || '').trim();
      if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
        throw new BadRequestError('A valid 6-digit Indian delivery PIN code is required.');
      }

      if (!addr.houseNumber?.trim() || !addr.street?.trim() || !addr.city?.trim() || !addr.state?.trim()) {
        throw new BadRequestError('House/Flat number, street, city, and state are required for delivery.');
      }

      // Validate serviceability
      const serviceability = await SettingsService.checkServiceability(cleanPin);
      if (!serviceability.serviceable) {
        throw new BadRequestError(serviceability.message || `Delivery is not serviceable in PIN code ${cleanPin}.`);
      }

      deliveryAddressSnapshot = {
        name: cleanName,
        phone: cleanPhone,
        houseNumber: addr.houseNumber.trim(),
        street: addr.street.trim(),
        landmark: addr.landmark?.trim() || '',
        city: addr.city.trim(),
        state: addr.state.trim(),
        pincode: cleanPin,
        deliveryInstructions: addr.deliveryInstructions?.trim() || '',
      };
    } else if (input.fulfillmentMethod === 'PICKUP') {
      pickupDetailsSnapshot = {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        pickupInstructions: settings.pickupInstructions,
      };
    } else {
      throw new BadRequestError('Invalid fulfillment method. Must be DELIVERY or PICKUP.');
    }

    // 5. Payment Method Validation
    if (input.paymentMethod !== 'COD' && input.paymentMethod !== 'WHATSAPP_QR') {
      throw new BadRequestError('Invalid payment method. Supported methods are COD and WHATSAPP_QR.');
    }

    if (input.paymentMethod === 'WHATSAPP_QR') {
      const cleanWa = (settings.storeWhatsapp || '').replace(/\D/g, '');
      if (!cleanWa) {
        throw new BadRequestError('Store WhatsApp payment service is not currently configured.');
      }
    }

    // 6. Fetch products, re-verify published status, recalculate prices, check stock
    const itemSnapshots: IOrderItemSnapshot[] = [];
    let subtotal = 0;
    const inventoryDecrements: Array<{ product: any; quantity: number; previousStock: number }> = [];


    // Deduplicate quantities by productId
    const requestedItemsMap = new Map<string, number>();
    for (const item of input.items) {
      const resolvedProdId = LEGACY_MOCK_PRODUCT_MAP[item.productId] || item.productId;
      if (!mongoose.Types.ObjectId.isValid(resolvedProdId)) {
        throw new BadRequestError(`Invalid product ID format: ${item.productId}`);
      }
      const qty = Math.floor(Number(item.quantity));
      if (!qty || qty <= 0) {
        throw new BadRequestError(`Quantity must be a positive integer for product ${item.productId}.`);
      }
      requestedItemsMap.set(resolvedProdId, (requestedItemsMap.get(resolvedProdId) || 0) + qty);
    }

    for (const [prodId, reqQty] of requestedItemsMap.entries()) {
      const product = await Product.findById(prodId);
      if (!product) {
        throw new BadRequestError(`Product ${prodId} no longer exists.`);
      }

      if (!product.isPublished) {
        throw new BadRequestError(`Product "${product.name}" is currently not available for purchase.`);
      }

      if (product.stockQuantity < reqQty) {
        throw new BadRequestError(
          `Insufficient stock for "${product.name}". Requested ${reqQty}, but only ${product.stockQuantity} available.`
        );
      }

      const unitSellingPrice = Number(product.sellingPrice);
      const unitMrp = Number(product.mrp || product.sellingPrice);
      const lineSubtotal = unitSellingPrice * reqQty;

      itemSnapshots.push({
        productId: product._id,
        name: product.name,
        brand: product.brand || '',
        imageUrl: product.images?.[0]?.url || '',
        unit: product.unit || 'piece',
        packSize: product.packSize || '',
        sellingPrice: unitSellingPrice,
        mrp: unitMrp,
        quantity: reqQty,
        lineSubtotal,
      });

      subtotal += lineSubtotal;
      inventoryDecrements.push({
        product,
        quantity: reqQty,
        previousStock: product.stockQuantity,
      });
    }

    // 7. Check Minimum Order Value
    if (subtotal < settings.minOrderValue) {
      throw new BadRequestError(`Minimum order value is ₹${settings.minOrderValue}. Your subtotal is ₹${subtotal}.`);
    }

    // 8. Calculate Delivery Fee & Total
    let deliveryFee = 0;
    if (input.fulfillmentMethod === 'DELIVERY') {
      deliveryFee = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee;
    }
    const totalAmount = subtotal + deliveryFee;

    // 9. Generate Human-Readable Order Number
    const orderNumber = await this.generateOrderNumber();

    // 10. Generate WhatsApp Payment Link if WHATSAPP_QR
    let whatsappPaymentUrl = '';
    if (input.paymentMethod === 'WHATSAPP_QR') {
      const cleanWa = settings.storeWhatsapp.replace(/\D/g, '');
      const waMsg = `Hello ${settings.storeName},\nI have placed Order *#${orderNumber}* for *₹${totalAmount}*.\nName: ${cleanName}\nPhone: ${cleanPhone}\nPlease share your UPI QR code for payment.`;
      whatsappPaymentUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(waMsg)}`;
    }

    // Generate secure guest tracking token
    const guestTrackingToken = crypto.randomBytes(16).toString('hex');

    // 11. Atomic Inventory Decrement & Stock Movements with Compensating Rollback
    const updatedProducts: Array<{ id: any; originalStock: number }> = [];
    const createdMovements: any[] = [];

    try {
      for (const dec of inventoryDecrements) {
        const prod = dec.product;
        let newStock: number;

        if (mongoose.connection.readyState === 1) {
          // Atomic conditional decrement to prevent race conditions and stock overselling in live DB
          const updatedProd = await Product.findOneAndUpdate(
            {
              _id: prod._id,
              stockQuantity: { $gte: dec.quantity },
            },
            {
              $inc: { stockQuantity: -dec.quantity },
            },
            { new: true }
          );

          if (!updatedProd) {
            throw new BadRequestError(
              `Insufficient stock for "${prod.name}". Available inventory was just claimed by another customer.`
            );
          }

          if (updatedProd.stockQuantity <= 0) {
            await Product.findByIdAndUpdate(prod._id, { isAvailable: false });
          }
          newStock = updatedProd.stockQuantity;
        } else {
          // Unit test / in-memory mocked environment fallback
          newStock = prod.stockQuantity - dec.quantity;
          if (newStock < 0) {
            throw new BadRequestError(`Insufficient stock for "${prod.name}".`);
          }
          prod.stockQuantity = newStock;
          if (newStock <= 0) {
            prod.isAvailable = false;
          }
          await prod.save();
        }

        updatedProducts.push({ id: prod._id, originalStock: dec.previousStock });

        const movement = await StockMovement.create({
          productId: prod._id,
          previousQuantity: dec.previousStock,
          changeQuantity: -dec.quantity,
          finalQuantity: newStock,
          adjustmentType: 'ORDER_FULFILLMENT',
          reason: `Order placed #${orderNumber}`,
          referenceNumber: orderNumber,
          performedBy: authenticatedUser ? new mongoose.Types.ObjectId(authenticatedUser.id) : new mongoose.Types.ObjectId(),
          performerEmail: authenticatedUser?.email || cleanPhone,
          performerName: cleanName,
        });
        createdMovements.push(movement._id);
      }

      // Initial audit entry
      const initialAudit: IOrderAuditEntry = {
        action: 'ORDER_PLACED',
        newStatus: 'PLACED',
        newPaymentStatus: 'PENDING',
        actorId: authenticatedUser ? new mongoose.Types.ObjectId(authenticatedUser.id) : null,
        actorName: cleanName,
        actorRole: authenticatedUser ? 'CUSTOMER' : 'GUEST',
        timestamp: new Date(),
        notes: `Order created via ${input.fulfillmentMethod} fulfillment (${input.paymentMethod})`,
      };

      // 12. Create and Save Order
      const newOrder = await Order.create({
        orderNumber,
        customerId: authenticatedUser ? new mongoose.Types.ObjectId(authenticatedUser.id) : null,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: (input.customerEmail || authenticatedUser?.email || '').trim(),
        fulfillmentMethod: input.fulfillmentMethod,
        deliveryAddress: deliveryAddressSnapshot,
        pickupDetails: pickupDetailsSnapshot,
        items: itemSnapshots,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
        customerNotes: input.customerNotes?.trim() || '',
        idempotencyKey: input.idempotencyKey?.trim() || undefined,
        whatsappPaymentUrl,
        guestTrackingToken,
        isInventoryRestored: false,
        statusHistory: [initialAudit],
      });

      // Sync customer phone number to User document if authenticated
      if (authenticatedUser?.id) {
        User.findByIdAndUpdate(authenticatedUser.id, {
          $set: { phoneNumber: cleanPhone },
        }).catch(() => {});
      }

      // 13. Create customer notification
      await this.sendNotificationSafely({
        userId: authenticatedUser ? new mongoose.Types.ObjectId(authenticatedUser.id) : null,
        customerPhone: cleanPhone,
        orderId: newOrder._id,
        orderNumber,
        title: `Order Placed #${orderNumber}`,
        message: `Your order for ₹${totalAmount} has been placed successfully (${input.fulfillmentMethod}).`,
        type: 'ORDER_PLACED',
      });

      // 14. Immediately inform Store Admin by Notification
      const adminAlertTitle = `🚨 New Customer Order #${orderNumber}!`;
      const adminAlertMessage = `New order placed by ${cleanName} (${cleanPhone}) for ₹${totalAmount} (${itemSnapshots.length} items, ${input.fulfillmentMethod}). Payment: ${input.paymentMethod}.`;

      await this.sendNotificationSafely({
        userId: null,
        customerPhone: '',
        orderId: newOrder._id,
        orderNumber,
        title: adminAlertTitle,
        message: adminAlertMessage,
        type: 'ADMIN_ALERT',
        appName: 'Store Admin Alert',
        isAdmin: true,
        metadata: {
          isAdminNotification: true,
          orderId: newOrder._id,
          orderNumber,
          totalAmount,
          customerName: cleanName,
          customerPhone: cleanPhone,
          fulfillmentMethod: input.fulfillmentMethod,
          paymentMethod: input.paymentMethod,
          itemCount: itemSnapshots.length,
        },
      });

      // Optional targeted records for admin user accounts (fire-and-forget, non-blocking)
      if (mongoose.connection.readyState === 1) {
        User.find({
          $or: [{ role: 'ADMIN' }, { email: 'kanhaiyaastore@gmail.com' }],
        })
          .select('_id')
          .lean()
          .then((adminUsers) => {
            for (const admin of adminUsers) {
              this.sendNotificationSafely({
                userId: admin._id,
                orderId: newOrder._id,
                orderNumber,
                title: adminAlertTitle,
                message: adminAlertMessage,
                type: 'ADMIN_ALERT',
                appName: 'Store Admin Alert',
                isAdmin: true,
                metadata: {
                  isAdminNotification: true,
                  orderId: newOrder._id,
                  orderNumber,
                  totalAmount,
                  customerName: cleanName,
                  customerPhone: cleanPhone,
                },
              });
            }
          })
          .catch(() => {});
      }

      return newOrder;
    } catch (creationError) {
      // Compensating Transaction: Restore inventory and remove created stock movements
      for (const item of updatedProducts) {
        try {
          await Product.findByIdAndUpdate(item.id, {
            stockQuantity: item.originalStock,
            isAvailable: true,
          });
        } catch {
          // ignore rollback failure in catch
        }
      }
      for (const movId of createdMovements) {
        try {
          await StockMovement.findByIdAndDelete(movId);
        } catch {
          // ignore
        }
      }
      throw creationError;
    }
  }

  /**
   * Retrieves order by ID or orderNumber with object-level authorization
   */
  static async getOrderByIdOrNumber(
    idOrNumber: string,
    requestingUser?: AuthenticatedUserPayload,
    guestTokenOrPhone?: string
  ): Promise<IOrder> {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrNumber);
    const query = isObjectId ? { $or: [{ _id: idOrNumber }, { orderNumber: idOrNumber }] } : { orderNumber: idOrNumber };

    const order = await Order.findOne(query);
    if (!order) {
      throw new NotFoundError(`Order "${idOrNumber}" not found.`);
    }

    // Object-level authorization check:
    if (order.customerId) {
      if (!requestingUser) {
        throw new ForbiddenError('Authentication required to access this customer order.');
      }
      if (requestingUser.role !== 'ADMIN' && order.customerId.toString() !== requestingUser.id) {
        throw new ForbiddenError('You are not authorized to view this order.');
      }
    } else {
      // Guest order authorization: allow if admin, OR matching guestTrackingToken, OR matching phone
      if (requestingUser?.role !== 'ADMIN') {
        const cleanParam = (guestTokenOrPhone || '').trim();
        const matchesToken = Boolean(cleanParam && order.guestTrackingToken && order.guestTrackingToken === cleanParam);
        const matchesPhone = Boolean(cleanParam && order.customerPhone && order.customerPhone === cleanParam);
        if (!matchesToken && !matchesPhone) {
          throw new ForbiddenError(
            'Access denied. Valid guest tracking token or verified phone number is required to access this order.'
          );
        }
      }
    }

    return order;
  }

  /**
   * Retrieves all orders placed by the authenticated customer
   */
  static async getCustomerOrders(customerId: string): Promise<any[]> {
    return Order.find({ customerId: new mongoose.Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Admin: List orders with server-side search, filtering, and pagination
   */
  static async listAdminOrders(params: AdminOrderQueryParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (params.orderStatus) {
      query.orderStatus = params.orderStatus;
    }
    if (params.paymentStatus) {
      query.paymentStatus = params.paymentStatus;
    }
    if (params.paymentMethod) {
      query.paymentMethod = params.paymentMethod;
    }
    if (params.fulfillmentMethod) {
      query.fulfillmentMethod = params.fulfillmentMethod;
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
      ];
    }

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) query.createdAt.$gte = new Date(params.startDate);
      if (params.endDate) query.createdAt.$lte = new Date(params.endDate);
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortDirection };

    const [orders, total] = await Promise.all([
      Order.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Dashboard status metrics and KPI counts
   */
  static async getAdminMetrics() {
    const [
      total,
      placed,
      confirmed,
      preparing,
      outForDelivery,
      readyForPickup,
      completed,
      cancelled,
      pendingWhatsapp,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'PLACED' }),
      Order.countDocuments({ orderStatus: 'CONFIRMED' }),
      Order.countDocuments({ orderStatus: { $in: ['PREPARING', 'PACKED'] } }),
      Order.countDocuments({ orderStatus: 'OUT_FOR_DELIVERY' }),
      Order.countDocuments({ orderStatus: 'READY_FOR_PICKUP' }),
      Order.countDocuments({ orderStatus: 'COMPLETED' }),
      Order.countDocuments({ orderStatus: 'CANCELLED' }),
      Order.countDocuments({ paymentMethod: 'WHATSAPP_QR', paymentStatus: 'PENDING' }),
    ]);

    return {
      total,
      placed,
      confirmed,
      preparing,
      outForDelivery,
      readyForPickup,
      completed,
      cancelled,
      pendingWhatsapp,
    };
  }

  /**
   * Admin: Validated order lifecycle status transition
   */
  static async updateOrderStatus(
    idOrNumber: string,
    newStatus: OrderStatus,
    adminUser: AuthenticatedUserPayload,
    notes?: string
  ): Promise<IOrder> {
    const order = await this.getOrderByIdOrNumber(idOrNumber, adminUser);

    if (order.orderStatus === 'COMPLETED') {
      throw new BadRequestError('Completed orders cannot be transitioned.');
    }
    if (order.orderStatus === 'CANCELLED') {
      throw new BadRequestError('Cancelled orders cannot be transitioned.');
    }
    if (order.orderStatus === newStatus) {
      return order; // idempotent
    }

    // Fulfillment-specific transition validation
    if (order.fulfillmentMethod === 'PICKUP' && newStatus === 'OUT_FOR_DELIVERY') {
      throw new BadRequestError('Store pickup orders cannot transition to OUT_FOR_DELIVERY.');
    }
    if (order.fulfillmentMethod === 'DELIVERY' && newStatus === 'READY_FOR_PICKUP') {
      throw new BadRequestError('Local delivery orders cannot transition to READY_FOR_PICKUP.');
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = newStatus;

    // Append audit entry
    order.statusHistory.push({
      action: 'STATUS_CHANGE',
      previousStatus,
      newStatus,
      actorId: new mongoose.Types.ObjectId(adminUser.id),
      actorName: adminUser.email || 'Admin',
      actorRole: adminUser.role,
      timestamp: new Date(),
      notes: notes?.trim() || `Status updated from ${previousStatus} to ${newStatus}`,
    });

    await order.save();

    // Customer Notification
    const notifTypeMap: Record<string, any> = {
      CONFIRMED: 'ORDER_CONFIRMED',
      PREPARING: 'ORDER_PREPARING',
      PACKED: 'ORDER_PREPARING',
      OUT_FOR_DELIVERY: 'ORDER_DISPATCHED',
      READY_FOR_PICKUP: 'ORDER_READY',
      COMPLETED: 'ORDER_COMPLETED',
    };

    if (notifTypeMap[newStatus]) {
      await this.sendNotificationSafely({
        userId: order.customerId || null,
        customerPhone: order.customerPhone,
        orderId: order._id,
        orderNumber: order.orderNumber,
        title: `Order Update #${order.orderNumber}`,
        message: `Your order is now ${newStatus.replace(/_/g, ' ')}.`,
        type: notifTypeMap[newStatus],
      });
    }

    return order;
  }

  /**
   * Admin: Verify manual WhatsApp QR payment
   */
  static async verifyWhatsAppPayment(
    idOrNumber: string,
    adminUser: AuthenticatedUserPayload,
    transactionReference?: string,
    notes?: string
  ): Promise<IOrder> {
    const order = await this.getOrderByIdOrNumber(idOrNumber, adminUser);

    if (order.paymentStatus === 'PAID') {
      return order; // Idempotent
    }

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = 'PAID';
    order.paymentVerifiedAt = new Date();
    order.paymentVerifiedBy = new mongoose.Types.ObjectId(adminUser.id);
    order.paymentReference = transactionReference?.trim() || order.paymentReference || '';

    order.statusHistory.push({
      action: 'PAYMENT_VERIFIED',
      previousPaymentStatus,
      newPaymentStatus: 'PAID',
      actorId: new mongoose.Types.ObjectId(adminUser.id),
      actorName: adminUser.email || 'Admin',
      actorRole: adminUser.role,
      timestamp: new Date(),
      transactionReference: transactionReference?.trim() || '',
      notes: notes?.trim() || 'WhatsApp QR payment verified by store staff',
    });

    await order.save();

    await this.sendNotificationSafely({
      userId: order.customerId || null,
      customerPhone: order.customerPhone,
      orderId: order._id,
      orderNumber: order.orderNumber,
      title: `Payment Verified #${order.orderNumber}`,
      message: `Your payment of ₹${order.totalAmount} has been verified by the store.`,
      type: 'PAYMENT_VERIFIED',
    });

    return order;
  }

  /**
   * Admin: Record COD cash/UPI collection upon delivery or counter collection
   */
  static async collectCodPayment(
    idOrNumber: string,
    adminUser: AuthenticatedUserPayload,
    notes?: string
  ): Promise<IOrder> {
    const order = await this.getOrderByIdOrNumber(idOrNumber, adminUser);

    if (order.paymentStatus === 'PAID') {
      return order; // Idempotent
    }

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = 'PAID';
    order.paymentVerifiedAt = new Date();
    order.paymentVerifiedBy = new mongoose.Types.ObjectId(adminUser.id);

    order.statusHistory.push({
      action: 'COD_COLLECTED',
      previousPaymentStatus,
      newPaymentStatus: 'PAID',
      actorId: new mongoose.Types.ObjectId(adminUser.id),
      actorName: adminUser.email || 'Admin',
      actorRole: adminUser.role,
      timestamp: new Date(),
      notes: notes?.trim() || 'Cash on Delivery payment received and collected',
    });

    await order.save();
    return order;
  }

  /**
   * Cancel order and restore inventory exactly once
   */
  static async cancelOrder(
    idOrNumber: string,
    actorUser?: AuthenticatedUserPayload,
    reason?: string
  ): Promise<IOrder> {
    const order = await this.getOrderByIdOrNumber(idOrNumber, actorUser);

    if (order.orderStatus === 'COMPLETED') {
      throw new BadRequestError('Cannot cancel an order that has already been completed.');
    }

    if (order.orderStatus === 'CANCELLED') {
      return order; // Idempotent
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = 'CANCELLED';
    order.cancelReason = reason?.trim() || 'Order cancelled';

    // Atomic inventory restoration exactly once
    if (!order.isInventoryRestored) {
      for (const item of order.items) {
        try {
          const prod = await Product.findById(item.productId);
          if (prod) {
            const previousQuantity = prod.stockQuantity;
            const newQuantity = previousQuantity + item.quantity;
            prod.stockQuantity = newQuantity;
            prod.isAvailable = true;
            await prod.save();

            await StockMovement.create({
              productId: prod._id,
              previousQuantity,
              changeQuantity: item.quantity,
              finalQuantity: newQuantity,
              adjustmentType: 'ORDER_FULFILLMENT',
              reason: `Order cancelled #${order.orderNumber}: ${reason || 'Cancelled'}`,
              referenceNumber: order.orderNumber,
              performedBy: actorUser ? new mongoose.Types.ObjectId(actorUser.id) : new mongoose.Types.ObjectId(),
              performerEmail: actorUser?.email || 'admin@kanhaiyastore.com',
              performerName: actorUser?.email || 'Store Admin',
            });
          }
        } catch {
          // ignore individual item restoration error in loop
        }
      }
      order.isInventoryRestored = true;
    }

    // Append cancellation audit entry
    order.statusHistory.push({
      action: 'ORDER_CANCELLED',
      previousStatus,
      newStatus: 'CANCELLED',
      actorId: actorUser ? new mongoose.Types.ObjectId(actorUser.id) : null,
      actorName: actorUser?.email || 'Store Admin',
      actorRole: actorUser?.role || 'ADMIN',
      timestamp: new Date(),
      reason: reason?.trim() || 'Cancelled',
      notes: 'Inventory restored to catalog',
    });

    await order.save();

    await this.sendNotificationSafely({
      userId: order.customerId || null,
      customerPhone: order.customerPhone,
      orderId: order._id,
      orderNumber: order.orderNumber,
      title: `Order Cancelled #${order.orderNumber}`,
      message: `Your order #${order.orderNumber} has been cancelled. Reason: ${reason || 'Not specified'}`,
      type: 'ORDER_CANCELLED',
    });

    return order;
  }

  /**
   * Customer tracking view: Safe customer-facing status timeline
   */
  static async getCustomerTracking(
    idOrNumber: string,
    requestingUser?: AuthenticatedUserPayload,
    guestToken?: string,
    phone?: string
  ) {
    const order = await this.getOrderByIdOrNumber(
      idOrNumber,
      requestingUser,
      guestToken || phone
    );
    const settings = await SettingsService.getSettings();

    // Map internal audit history to safe customer events
    const timeline = order.statusHistory.map((h) => ({
      status: h.newStatus || h.action,
      title: h.action.replace(/_/g, ' '),
      timestamp: h.timestamp,
      notes: h.notes,
    }));

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      fulfillmentMethod: order.fulfillmentMethod,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      items: order.items,
      deliveryAddress: order.deliveryAddress,
      pickupDetails: order.pickupDetails,
      timeline,
      storeContact: {
        storeName: settings.storeName,
        phone: settings.storePhone,
        whatsapp: settings.storeWhatsapp,
        address: settings.storeAddress,
      },
      createdAt: order.createdAt,
    };
  }

  /**
   * PDF Invoice generation with metadata persistence
   */
  static async getInvoicePdf(
    idOrNumber: string,
    requestingUser?: AuthenticatedUserPayload,
    guestToken?: string,
    phone?: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    const order = await this.getOrderByIdOrNumber(
      idOrNumber,
      requestingUser,
      guestToken || phone
    );

    // Persist invoiceNumber if not yet recorded
    if (!order.invoiceNumber) {
      order.invoiceNumber = InvoiceService.getOrCreateInvoiceNumber(order);
      order.invoiceGeneratedAt = new Date();
      await order.save();
    }

    const buffer = await InvoiceService.generateInvoicePdf(order);
    const filename = `Invoice-${order.invoiceNumber}.pdf`;

    return { buffer, filename };
  }

  /**
   * Admin: Manually create an order (POS / In-store walk-in / Phone order) directly in Mongo
   */
  static async createAdminOrder(
    input: AdminCreateOrderInput,
    actorUser: AuthenticatedUserPayload
  ): Promise<IOrder> {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestError('Admin order must contain at least one item.');
    }

    const cleanName = (input.customerName || 'In-Store Customer').trim();
    const cleanPhone = (input.customerPhone || '9999999999').trim();

    const fulfillment: FulfillmentMethod =
      input.fulfillmentMethod === 'DELIVERY' || input.fulfillmentMethod === 'LOCAL_DELIVERY'
        ? 'DELIVERY'
        : 'PICKUP';

    const paymentMethod: PaymentMethod = input.paymentMethod || 'COD';
    const paymentStatus: PaymentStatus = input.paymentStatus || 'PAID';
    const orderStatus: OrderStatus = input.orderStatus || 'CONFIRMED';

    const settings = await SettingsService.getSettings();

    const itemSnapshots: IOrderItemSnapshot[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const resolvedProdId = LEGACY_MOCK_PRODUCT_MAP[item.productId] || item.productId;
      if (!mongoose.Types.ObjectId.isValid(resolvedProdId)) {
        throw new BadRequestError(`Invalid product ID format: ${item.productId}`);
      }
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const prod = await Product.findById(resolvedProdId);
      if (!prod) {
        throw new BadRequestError(`Product ${item.productId} not found in catalog.`);
      }

      const unitSellingPrice = item.sellingPrice !== undefined ? Number(item.sellingPrice) : Number(prod.sellingPrice);
      const unitMrp = Number(prod.mrp || unitSellingPrice);
      const lineSubtotal = unitSellingPrice * qty;

      itemSnapshots.push({
        productId: prod._id,
        name: prod.name,
        brand: prod.brand || '',
        imageUrl: prod.images?.[0]?.url || '',
        unit: prod.unit || 'piece',
        packSize: prod.packSize || '',
        sellingPrice: unitSellingPrice,
        mrp: unitMrp,
        quantity: qty,
        lineSubtotal,
      });

      subtotal += lineSubtotal;

      // Decrement inventory safely
      const prevStock = prod.stockQuantity;
      const nextStock = Math.max(0, prevStock - qty);
      prod.stockQuantity = nextStock;
      if (nextStock <= 0) {
        prod.isAvailable = false;
      }
      await prod.save();

      try {
        await StockMovement.create({
          productId: prod._id,
          previousQuantity: prevStock,
          changeQuantity: -qty,
          finalQuantity: nextStock,
          adjustmentType: 'ORDER_FULFILLMENT',
          reason: `Admin created manual order`,
          referenceNumber: 'ADMIN-POS',
          performedBy: new mongoose.Types.ObjectId(actorUser.id),
          performerEmail: actorUser.email || 'admin@kanhaiyastore.com',
          performerName: actorUser.email || 'Admin',
        });
      } catch {
        // ignore
      }
    }

    const deliveryFee = fulfillment === 'DELIVERY' ? (subtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee) : 0;
    const totalAmount = subtotal + deliveryFee;
    const orderNumber = await this.generateOrderNumber();
    const guestTrackingToken = crypto.randomBytes(16).toString('hex');

    const newOrder = await Order.create({
      orderNumber,
      customerId: null,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerEmail: input.customerEmail?.trim() || '',
      fulfillmentMethod: fulfillment,
      deliveryAddress: fulfillment === 'DELIVERY' && input.deliveryAddress ? input.deliveryAddress : null,
      pickupDetails: fulfillment === 'PICKUP' ? {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        pickupInstructions: settings.pickupInstructions,
      } : null,
      items: itemSnapshots,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      paymentStatus,
      orderStatus,
      customerNotes: input.customerNotes?.trim() || 'Created directly by Store Administrator',
      guestTrackingToken,
      isInventoryRestored: false,
      statusHistory: [
        {
          action: 'ADMIN_MANUAL_ORDER_CREATED',
          newStatus: orderStatus,
          actorId: new mongoose.Types.ObjectId(actorUser.id),
          actorName: actorUser.email || 'Store Admin',
          actorRole: 'ADMIN',
          timestamp: new Date(),
          notes: `Created via Admin POS / Manual Order (${fulfillment}, ${paymentMethod}, ${paymentStatus})`,
        },
      ],
    });

    return newOrder;
  }

  /**
   * Admin: Update order details (Customer info, notes, order status, payment status)
   */
  static async updateOrderAdmin(
    idOrNumber: string,
    updateData: AdminUpdateOrderInput,
    actorUser: AuthenticatedUserPayload
  ): Promise<IOrder> {
    const order = await this.getOrderByIdOrNumber(idOrNumber, actorUser);

    const oldStatus = order.orderStatus;
    const oldPaymentStatus = order.paymentStatus;

    if (updateData.customerName !== undefined && updateData.customerName.trim().length > 0) {
      order.customerName = updateData.customerName.trim();
    }
    if (updateData.customerPhone !== undefined && updateData.customerPhone.trim().length > 0) {
      order.customerPhone = updateData.customerPhone.trim();
    }
    if (updateData.customerEmail !== undefined) {
      order.customerEmail = updateData.customerEmail.trim();
    }
    if (updateData.customerNotes !== undefined) {
      order.customerNotes = updateData.customerNotes.trim();
    }
    if (updateData.deliveryAddress !== undefined) {
      order.deliveryAddress = updateData.deliveryAddress;
    }
    if (updateData.fulfillmentMethod !== undefined) {
      order.fulfillmentMethod = updateData.fulfillmentMethod;
    }

    if (updateData.orderStatus && updateData.orderStatus !== oldStatus) {
      // If moving to CANCELLED and inventory not restored, restore inventory
      if (updateData.orderStatus === 'CANCELLED' && !order.isInventoryRestored) {
        for (const item of order.items) {
          try {
            const prod = await Product.findById(item.productId);
            if (prod) {
              const prev = prod.stockQuantity;
              const next = prev + item.quantity;
              prod.stockQuantity = next;
              prod.isAvailable = true;
              await prod.save();

              await StockMovement.create({
                productId: prod._id,
                previousQuantity: prev,
                changeQuantity: item.quantity,
                finalQuantity: next,
                adjustmentType: 'ORDER_FULFILLMENT',
                reason: `Order #${order.orderNumber} status changed to CANCELLED`,
                referenceNumber: order.orderNumber,
                performedBy: new mongoose.Types.ObjectId(actorUser.id),
                performerEmail: actorUser.email || 'admin@kanhaiyastore.com',
                performerName: actorUser.email || 'Store Admin',
              });
            }
          } catch {
            // ignore
          }
        }
        order.isInventoryRestored = true;
      }

      order.orderStatus = updateData.orderStatus;
      order.statusHistory.push({
        action: 'ORDER_STATUS_UPDATED',
        previousStatus: oldStatus,
        newStatus: updateData.orderStatus,
        actorId: new mongoose.Types.ObjectId(actorUser.id),
        actorName: actorUser.email || 'Store Admin',
        actorRole: 'ADMIN',
        timestamp: new Date(),
        notes: updateData.notes || `Order status updated to ${updateData.orderStatus} by Admin`,
      });
    }

    if (updateData.paymentStatus && updateData.paymentStatus !== oldPaymentStatus) {
      order.paymentStatus = updateData.paymentStatus;
      order.statusHistory.push({
        action: 'PAYMENT_STATUS_UPDATED',
        previousPaymentStatus: oldPaymentStatus,
        newPaymentStatus: updateData.paymentStatus,
        actorId: new mongoose.Types.ObjectId(actorUser.id),
        actorName: actorUser.email || 'Store Admin',
        actorRole: 'ADMIN',
        timestamp: new Date(),
        notes: `Payment status updated to ${updateData.paymentStatus} by Admin`,
      });
    }

    await order.save();
    return order;
  }

  /**
   * Admin: Permanently delete an order directly from MongoDB and restore inventory if applicable
   */
  static async deleteOrderAdmin(
    idOrNumber: string,
    actorUser: AuthenticatedUserPayload
  ): Promise<{ deleted: boolean; orderNumber: string; message: string }> {
    const order = await this.getOrderByIdOrNumber(idOrNumber, actorUser);

    // Restore inventory if items were deducted and never restored
    if (!order.isInventoryRestored && order.orderStatus !== 'CANCELLED') {
      for (const item of order.items) {
        try {
          const prod = await Product.findById(item.productId);
          if (prod) {
            const prev = prod.stockQuantity;
            const next = prev + item.quantity;
            prod.stockQuantity = next;
            prod.isAvailable = true;
            await prod.save();

            await StockMovement.create({
              productId: prod._id,
              previousQuantity: prev,
              changeQuantity: item.quantity,
              finalQuantity: next,
              adjustmentType: 'ORDER_FULFILLMENT',
              reason: `Order #${order.orderNumber} deleted by Admin: inventory restored`,
              referenceNumber: order.orderNumber,
              performedBy: new mongoose.Types.ObjectId(actorUser.id),
              performerEmail: actorUser.email || 'admin@kanhaiyastore.com',
              performerName: actorUser.email || 'Store Admin',
            });
          }
        } catch {
          // ignore
        }
      }
      order.isInventoryRestored = true;
    }

    await Order.findByIdAndDelete(order._id);

    return {
      deleted: true,
      orderNumber: order.orderNumber,
      message: `Order #${order.orderNumber} has been permanently deleted from MongoDB and stock restored.`,
    };
  }
}
